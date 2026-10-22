import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';
import { badRequest, readJsonObject, validId, validOptionalTimestamp, validStringArray } from '../_lib/requestValidation';

const toFront = (r: any) => ({
  id: r.id,
  items: JSON.parse(r.items),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM gratitude_entries WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return Response.json(results.map(toFront));
  }

  if (request.method === 'POST') {
    const parsed = await readJsonObject<any>(request);
    if ('response' in parsed) return parsed.response;
    const b = parsed.body;
    if (!validId(b.id) || !validStringArray(b.items, 100, 5_000)
      || !validOptionalTimestamp(b.createdAt) || !validOptionalTimestamp(b.updatedAt)) return badRequest();
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO gratitude_entries (id,user_id,items,created_at,updated_at) VALUES (?,?,?,?,?)'
    ).bind(b.id, user.id, JSON.stringify(b.items), b.createdAt || now, b.updatedAt || b.createdAt || now).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
