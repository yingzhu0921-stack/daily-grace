import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';
import { badRequest, readJsonObject, validId, validOptionalString, validOptionalTimestamp } from '../_lib/requestValidation';

// 레코드는 카테고리별 동적 필드를 가진 "플랫" 구조라, 전체를 data(JSON)에 통째로 저장하고
// 읽을 때 그대로 복원한다. (id/category_id/date/created_at 은 조회·정렬·연동용 컬럼)
const toFront = (r: any) => {
  const base = JSON.parse(r.data || '{}');
  return { ...base, id: r.id, categoryId: r.category_id, createdAt: r.created_at, updatedAt: r.updated_at };
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    const stmt = categoryId
      ? env.DB.prepare(
          'SELECT * FROM custom_records WHERE user_id = ? AND category_id = ? ORDER BY created_at DESC'
        ).bind(user.id, categoryId)
      : env.DB.prepare(
          'SELECT * FROM custom_records WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(user.id);
    const { results } = await stmt.all();
    return Response.json(results.map(toFront));
  }

  // 업서트(신규/수정 공용) — 동기화 레이어가 변경된 레코드를 그대로 POST 한다.
  if (request.method === 'POST') {
    const parsed = await readJsonObject<any>(request, 512_000);
    if ('response' in parsed) return parsed.response;
    const b = parsed.body;
    if (!validId(b.id) || !validId(b.categoryId)) {
      return Response.json({ error: 'id and categoryId required' }, { status: 400 });
    }
    if (!validOptionalString(b.date, 32) || !validOptionalTimestamp(b.createdAt)
      || !validOptionalTimestamp(b.updatedAt)) return badRequest();
    const category = await env.DB.prepare(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?'
    ).bind(b.categoryId, user.id).first();
    if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });

    const existing = await env.DB.prepare(
      'SELECT user_id FROM custom_records WHERE id = ?'
    ).bind(b.id).first<{ user_id: string }>();
    if (existing && existing.user_id !== user.id) {
      return Response.json({ error: 'Record id conflict' }, { status: 409 });
    }
    const now = new Date().toISOString();
    const createdAt = b.createdAt || now;
    const date = b.date || String(createdAt).split('T')[0];
    const result = await env.DB.prepare(
      `INSERT INTO custom_records (id,user_id,category_id,data,date,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         category_id=excluded.category_id,
         data=excluded.data,
         date=excluded.date,
         updated_at=excluded.updated_at
       WHERE custom_records.user_id=excluded.user_id`
    ).bind(
      b.id,
      user.id,
      b.categoryId,
      JSON.stringify(b),
      date,
      createdAt,
      now
    ).run();
    if (!result.meta.changes) return Response.json({ error: 'Record id conflict' }, { status: 409 });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
