import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';
import { badRequest, readJsonObject, validId, validOptionalString, validOptionalTimestamp, validStringArray } from '../_lib/requestValidation';

// data URL("data:image/png;base64,....") -> 바이트 + content-type
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl || '');
  if (!m) return null;
  const contentType = m[1] || 'application/octet-stream';
  const isB64 = !!m[2];
  const raw = m[3] || '';
  if (isB64) {
    const bin = atob(raw);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, contentType };
  }
  return { bytes: new TextEncoder().encode(decodeURIComponent(raw)), contentType };
}

const imgKey = (userId: string, id: string) => `img/${userId}/${id}`;
const bgKey = (userId: string, id: string) => `bg/${userId}/${id}`;

const toFront = (r: any) => {
  const editorState = r.editor_state ? JSON.parse(r.editor_state) : undefined;
  const version = encodeURIComponent(String(r.updated_at || r.created_at || ''));
  const bgUrl = r.has_bg_image ? `/api/data/verse-cards/${r.id}/bg?v=${version}` : (r.bg || '');
  // 재편집용 배경 URL 복원
  if (editorState?.meta && r.has_bg_image) editorState.meta.bgImageUrl = bgUrl;
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ratio: r.ratio,
    text: r.text,
    ref: r.ref || '',
    tags: JSON.parse(r.tags || '[]'),
    bg: bgUrl,
    imageDataUrl: r.has_image ? `/api/data/verse-cards/${r.id}/image?v=${version}` : undefined,
    editorState,
  };
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM verse_cards WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return Response.json(results.map(toFront));
  }

  // 업서트 — 신규/수정 공용. 큰 이미지는 R2에, 메타데이터는 D1에.
  if (request.method === 'POST') {
    const parsed = await readJsonObject<any>(request, 25_000_000);
    if ('response' in parsed) return parsed.response;
    const b = parsed.body;
    if (!validId(b.id)) return badRequest('카드 ID가 올바르지 않습니다.');
    if (!validOptionalString(b.ratio, 16) || !validOptionalString(b.text, 20_000)
      || !validOptionalString(b.ref, 1_000) || !validOptionalString(b.bg, 20_000_000)
      || !validOptionalString(b.imageDataUrl, 20_000_000)
      || (b.tags !== undefined && !validStringArray(b.tags, 100, 200))
      || !validOptionalTimestamp(b.createdAt) || !validOptionalTimestamp(b.updatedAt)
      || (b.editorState !== undefined && (typeof b.editorState !== 'object' || b.editorState === null || Array.isArray(b.editorState)))) {
      return badRequest();
    }

    const existing = await env.DB.prepare(
      'SELECT user_id FROM verse_cards WHERE id = ?'
    ).bind(b.id).first<{ user_id: string }>();
    if (existing && existing.user_id !== user.id) {
      return Response.json({ error: 'Card id conflict' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const createdAt = b.createdAt || now;

    // 1) 최종 카드 이미지 -> R2
    let hasImage = 0;
    if (typeof b.imageDataUrl === 'string' && b.imageDataUrl.startsWith('data:')) {
      const dec = decodeDataUrl(b.imageDataUrl);
      if (dec) {
        await env.CARDS.put(imgKey(user.id, b.id), dec.bytes, {
          httpMetadata: { contentType: dec.contentType },
        });
        hasImage = 1;
      }
    } else if (typeof b.imageDataUrl === 'string' && b.imageDataUrl.includes('/verse-cards/')) {
      // 이미 R2 URL (하이드레이션된 카드 재저장) -> 기존 이미지 유지
      hasImage = 1;
    }

    // 2) 배경: data URL이면 R2, 색상 문자열이면 그대로 D1
    let hasBgImage = 0;
    let bgValue = '';
    if (typeof b.bg === 'string' && b.bg.startsWith('data:')) {
      const dec = decodeDataUrl(b.bg);
      if (dec) {
        await env.CARDS.put(bgKey(user.id, b.id), dec.bytes, {
          httpMetadata: { contentType: dec.contentType },
        });
        hasBgImage = 1;
      }
    } else if (typeof b.bg === 'string' && b.bg.includes('/verse-cards/')) {
      hasBgImage = 1; // 기존 R2 배경 유지
    } else if (typeof b.bg === 'string') {
      bgValue = b.bg; // 색상 등 짧은 문자열
    }

    // 3) editorState 에서 큰 배경 data URL 제거 (읽을 때 URL로 복원)
    let editorState = b.editorState;
    if (editorState?.meta?.bgImageUrl && String(editorState.meta.bgImageUrl).startsWith('data:')) {
      editorState = { ...editorState, meta: { ...editorState.meta, bgImageUrl: '' } };
    }

    const result = await env.DB.prepare(
      `INSERT INTO verse_cards
       (id,user_id,ratio,text,ref,tags,bg,has_image,has_bg_image,editor_state,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         ratio=excluded.ratio,
         text=excluded.text,
         ref=excluded.ref,
         tags=excluded.tags,
         bg=excluded.bg,
         has_image=excluded.has_image,
         has_bg_image=excluded.has_bg_image,
         editor_state=excluded.editor_state,
         updated_at=excluded.updated_at
       WHERE verse_cards.user_id=excluded.user_id`
    ).bind(
      b.id,
      user.id,
      b.ratio || '4:5',
      b.text || '',
      b.ref || '',
      JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
      bgValue,
      hasImage,
      hasBgImage,
      editorState ? JSON.stringify(editorState) : null,
      createdAt,
      now
    ).run();
    if (!result.meta.changes) {
      await Promise.all([
        env.CARDS.delete(imgKey(user.id, b.id)),
        env.CARDS.delete(bgKey(user.id, b.id)),
      ]).catch(() => {});
      return Response.json({ error: 'Card id conflict' }, { status: 409 });
    }

    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
