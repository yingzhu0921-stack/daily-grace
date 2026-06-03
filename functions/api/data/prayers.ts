import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';

const toFront = (r: any) => ({
  id: r.id, title: r.title, content: r.content,
  answered: Boolean(r.answered),
  answeredAt: r.answered_at,
  answeredDetail: r.answered_detail,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM prayer_notes WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return Response.json(results.map(toFront));
  }

  if (request.method === 'POST') {
    const b = await request.json<any>();
    await env.DB.prepare(
      'INSERT INTO prayer_notes (id,user_id,title,content,answered,answered_at,answered_detail,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
    ).bind(b.id, user.id, b.title ?? '', b.content ?? '',
      b.answered ? 1 : 0, b.answeredAt ?? null, b.answeredDetail ?? null,
      b.createdAt, b.updatedAt).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
