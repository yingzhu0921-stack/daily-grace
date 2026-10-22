import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // D1 외부의 R2 객체는 외래키 cascade로 지워지지 않으므로 먼저 모두 제거한다.
  for (const prefix of [`img/${user.id}/`, `bg/${user.id}/`]) {
    let cursor: string | undefined;
    do {
      const listed = await env.CARDS.list({ prefix, cursor });
      if (listed.objects.length) await env.CARDS.delete(listed.objects.map(object => object.key));
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }

  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();
  await env.DB.prepare('DELETE FROM magic_link_tokens WHERE email = ?').bind(user.email).run();
  await env.DB.prepare('DELETE FROM rate_limits WHERE rate_key = ?').bind(user.id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();

  return Response.json({ success: true }, {
    headers: {
      'Set-Cookie': 'dg_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
};
