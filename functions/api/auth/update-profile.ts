import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';
import { badRequest, readJsonObject } from '../_lib/requestValidation';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await readJsonObject<{ name?: string }>(request, 4_000);
  if ('response' in parsed) return parsed.response;
  const { name } = parsed.body;
  if (name !== undefined && (typeof name !== 'string' || name.trim().length > 100)) return badRequest();
  if (name !== undefined) {
    await env.DB.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
      .bind(name.trim(), Date.now(), user.id).run();
  }

  return Response.json({ success: true });
};
