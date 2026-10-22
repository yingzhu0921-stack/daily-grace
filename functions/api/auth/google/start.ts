import type { Env } from '../../_lib/db';

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.APP_ORIGIN}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'Set-Cookie': `dg_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/api/auth/google`,
    },
  });
};
