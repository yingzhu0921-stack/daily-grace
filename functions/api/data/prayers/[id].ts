import { getSessionUser } from '../../_lib/session';
import type { Env } from '../../_lib/db';
import { badRequest, readJsonObject, validId, validOptionalBoolean, validOptionalString, validOptionalTimestamp } from '../../_lib/requestValidation';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  if (!validId(id)) return badRequest('기록 ID가 올바르지 않습니다.');

  if (request.method === 'PUT') {
    const parsed = await readJsonObject<any>(request);
    if ('response' in parsed) return parsed.response;
    const b = parsed.body;
    if (!validOptionalString(b.title, 500) || !validOptionalString(b.content, 200_000)
      || !validOptionalBoolean(b.answered) || !validOptionalString(b.answeredAt, 64)
      || !validOptionalString(b.answeredDetail, 100_000) || !validOptionalTimestamp(b.updatedAt)) return badRequest();
    await env.DB.prepare(
      'UPDATE prayer_notes SET title=?,content=?,answered=?,answered_at=?,answered_detail=?,updated_at=? WHERE id=? AND user_id=?'
    ).bind(b.title ?? '', b.content ?? '',
      b.answered ? 1 : 0, b.answeredAt ?? null, b.answeredDetail ?? null,
      b.updatedAt || new Date().toISOString(), id, user.id).run();
    return Response.json({ success: true });
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM prayer_notes WHERE id=? AND user_id=?').bind(id, user.id).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
