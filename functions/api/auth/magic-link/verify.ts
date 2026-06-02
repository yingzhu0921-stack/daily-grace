import { getUserByEmail, createUser } from '../../_lib/db';
import { createSession, makeSessionCookie, generateId } from '../../_lib/session';
import type { Env } from '../../_lib/db';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return new Response('Invalid token', { status: 400 });

  const record = await env.DB.prepare(
    'SELECT * FROM magic_link_tokens WHERE token = ? AND expires_at > ? AND consumed_at IS NULL'
  ).bind(token, Date.now()).first<{ email: string; token: string }>();

  if (!record) return new Response('링크가 만료되었거나 이미 사용되었습니다.', { status: 400 });

  await env.DB.prepare('UPDATE magic_link_tokens SET consumed_at = ? WHERE token = ?')
    .bind(Date.now(), token).run();

  let user = await getUserByEmail(env.DB, record.email);
  if (!user) {
    user = await createUser(env.DB, {
      id: generateId(),
      email: record.email,
      auth_method: 'magic_link',
    });
  }

  const sessionId = await createSession(env.DB, user.id);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': makeSessionCookie(sessionId),
    },
  });
};
