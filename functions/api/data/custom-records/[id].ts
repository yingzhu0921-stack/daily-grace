import { getSessionUser } from '../../_lib/session';
import type { Env } from '../../_lib/db';
import { badRequest, validId } from '../../_lib/requestValidation';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  if (!validId(id)) return badRequest('기록 ID가 올바르지 않습니다.');

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM custom_records WHERE id=? AND user_id=?')
      .bind(id, user.id).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
