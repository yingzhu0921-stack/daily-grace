import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json<{ name?: string }>();
  if (name !== undefined) {
    await env.DB.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
      .bind(name, Date.now(), user.id).run();
  }

  return Response.json({ success: true });
};
