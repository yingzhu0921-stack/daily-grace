import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';

const toFront = (r: any) => ({
  id: r.id,
  user_id: r.user_id,
  name: r.name,
  color: r.color,
  icon: r.icon || undefined,
  description: r.description || undefined,
  includeInGoal: Boolean(r.include_in_goal),
  activeDays: JSON.parse(r.active_days || '[0,1,2,3,4,5,6]'),
  fields: JSON.parse(r.fields || '["title","content"]'),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(user.id).all();
    return Response.json(results.map(toFront));
  }

  if (request.method === 'POST') {
    const b = await request.json<any>();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO categories (id,user_id,name,color,icon,description,include_in_goal,active_days,fields,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      id, user.id, b.name, b.color ?? '#4F8A5B',
      b.icon ?? null, b.description ?? null,
      b.includeInGoal !== false ? 1 : 0,
      JSON.stringify(b.activeDays ?? [0,1,2,3,4,5,6]),
      JSON.stringify(b.fields ?? ['title','content']),
      now, now
    ).run();
    const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
    return Response.json(toFront(row));
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
