import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';

const toFront = (r: any) => ({
  id: r.id,
  title: r.title,
  passage: r.passage,
  content: r.content,
  application: r.application,
  applications: r.applications ? JSON.parse(r.applications) : undefined,
  applyChecked: Boolean(r.apply_checked),
  applyCheckedAt: r.apply_checked_at,
  fullText: r.full_text,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM meditation_notes WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return Response.json(results.map(toFront));
  }

  if (request.method === 'POST') {
    const b = await request.json<any>();
    await env.DB.prepare(
      'INSERT INTO meditation_notes (id,user_id,title,passage,content,application,applications,apply_checked,apply_checked_at,full_text,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(b.id, user.id, b.title ?? '', b.passage ?? '', b.content ?? '', b.application ?? '',
      b.applications ? JSON.stringify(b.applications) : null,
      b.applyChecked ? 1 : 0, b.applyCheckedAt ?? null, b.fullText ?? '',
      b.createdAt, b.updatedAt).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
