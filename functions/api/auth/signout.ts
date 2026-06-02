import { clearSessionCookie } from '../_lib/session';
import type { Env } from '../_lib/db';

export const onRequest: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
