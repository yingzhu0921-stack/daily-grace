import { getSessionUser } from '../../_lib/session';
import type { Env } from '../../_lib/db';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;

  if (request.method === 'PUT') {
    const b = await request.json<any>();
    await env.DB.prepare(
      'UPDATE gratitude_entries SET items=?,updated_at=? WHERE id=? AND user_id=?'
    ).bind(JSON.stringify(b.items ?? []), b.updatedAt, id, user.id).run();
    return Response.json({ success: true });
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM gratitude_entries WHERE id=? AND user_id=?').bind(id, user.id).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
