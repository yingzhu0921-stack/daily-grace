import { getUserByEmail, createUser } from '../../_lib/db';
import { createSession, makeSessionCookie, generateId } from '../../_lib/session';
import type { Env } from '../../_lib/db';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return new Response('No code', { status: 400 });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.APP_ORIGIN}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json<{ id_token?: string; error?: string }>();
  if (!tokenData.id_token) {
    return new Response(`Token exchange failed: ${JSON.stringify(tokenData)}`, { status: 500 });
  }

  const base64 = tokenData.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const payload = JSON.parse(new TextDecoder().decode(bytes)) as { sub: string; email: string; name: string };

  let user = await getUserByEmail(env.DB, payload.email);
  if (!user) {
    user = await createUser(env.DB, {
      id: generateId(),
      email: payload.email,
      name: payload.name,
      auth_method: 'google_oauth',
      google_sub: payload.sub,
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
