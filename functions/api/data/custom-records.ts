import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';

// 레코드는 카테고리별 동적 필드를 가진 "플랫" 구조라, 전체를 data(JSON)에 통째로 저장하고
// 읽을 때 그대로 복원한다. (id/category_id/date/created_at 은 조회·정렬·연동용 컬럼)
const toFront = (r: any) => {
  const base = JSON.parse(r.data || '{}');
  return { ...base, id: r.id, categoryId: r.category_id, createdAt: r.created_at };
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
    const b = await request.json<any>();
    if (!b?.id || !b?.categoryId) {
      return Response.json({ error: 'id and categoryId required' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const createdAt = b.createdAt || now;
    const date = b.date || String(createdAt).split('T')[0];
    await env.DB.prepare(
      'INSERT OR REPLACE INTO custom_records (id,user_id,category_id,data,date,created_at,updated_at) VALUES (?,?,?,?,?,?,?)'
    ).bind(
      b.id,
      user.id,
      b.categoryId,
      JSON.stringify(b),
      date,
      createdAt,
      now
    ).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
