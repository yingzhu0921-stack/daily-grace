import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  return Response.json({ user: user ?? null });
};
