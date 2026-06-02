import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();
  await env.DB.prepare('DELETE FROM magic_link_tokens WHERE email = ?').bind(user.email).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': 'dg_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
};
