import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';
import { badRequest, readJsonObject, validOptionalBoolean, validOptionalString, validStringArray } from '../_lib/requestValidation';

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
    const parsed = await readJsonObject<any>(request, 32_000);
    if ('response' in parsed) return parsed.response;
    const b = parsed.body;
    const activeDaysValid = b.activeDays === undefined || (Array.isArray(b.activeDays)
      && b.activeDays.length <= 7 && b.activeDays.every((day: unknown) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6));
    if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 80
      || !validOptionalString(b.color, 64) || !validOptionalString(b.icon, 64)
      || !validOptionalString(b.description, 2_000) || !validOptionalBoolean(b.includeInGoal)
      || !activeDaysValid || (b.fields !== undefined && !validStringArray(b.fields, 20, 50))) return badRequest();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO categories (id,user_id,name,color,icon,description,include_in_goal,active_days,fields,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      id, user.id, b.name.trim(), b.color ?? '#7DB87D',
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
