import { getSessionUser } from '../../_lib/session';
import type { Env } from '../../_lib/db';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;

  if (request.method === 'PUT') {
    const b = await request.json<any>();
    await env.DB.prepare(
      'UPDATE meditation_notes SET title=?,passage=?,content=?,application=?,applications=?,apply_checked=?,apply_checked_at=?,full_text=?,updated_at=? WHERE id=? AND user_id=?'
    ).bind(b.title ?? '', b.passage ?? '', b.content ?? '', b.application ?? '',
      b.applications ? JSON.stringify(b.applications) : null,
      b.applyChecked ? 1 : 0, b.applyCheckedAt ?? null, b.fullText ?? '',
      b.updatedAt, id, user.id).run();
    return Response.json({ success: true });
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM meditation_notes WHERE id=? AND user_id=?').bind(id, user.id).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
