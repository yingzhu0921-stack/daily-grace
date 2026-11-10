import { getSessionUser } from '../../../_lib/session';
import type { Env } from '../../../_lib/db';
import { badRequest, validId } from '../../../_lib/requestValidation';
import { imageResponseHeaders } from '../../../_lib/imageUpload';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { id } = params;
  if (!validId(id)) return badRequest('카드 ID가 올바르지 않습니다.');

  const obj = await env.CARDS.get(`img/${user.id}/${id}`);
  if (!obj) return new Response('Not found', { status: 404 });

  // 저장된 형식을 그대로 믿지 않는다(그림 형식만 그림으로 내려줌, nosniff·sandbox). imageUpload.ts 참고.
  const headers = imageResponseHeaders(obj.httpMetadata?.contentType);
  headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
};
