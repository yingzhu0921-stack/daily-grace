import { clearSessionCookie } from '../_lib/session';
import type { Env } from '../_lib/db';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const sessionId = cookie.match(/(?:^|;\s*)dg_session=([^;]+)/)?.[1];
  if (sessionId) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  return Response.json({ success: true }, {
    headers: {
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
