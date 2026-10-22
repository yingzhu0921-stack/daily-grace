import { getSessionUser } from '../../../_lib/session';
import type { Env } from '../../../_lib/db';
import { badRequest, validId } from '../../../_lib/requestValidation';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { id } = params;
  if (!validId(id)) return badRequest('카드 ID가 올바르지 않습니다.');

  const obj = await env.CARDS.get(`bg/${user.id}/${id}`);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
};
