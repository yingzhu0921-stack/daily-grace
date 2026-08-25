import { getSessionUser } from '../../../_lib/session';
import type { Env } from '../../../_lib/db';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { id } = params;

  const obj = await env.CARDS.get(`img/${user.id}/${id}`);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
};
