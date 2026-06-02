import type { Env } from './_lib/db';

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  return Response.json({
    APP_ORIGIN: env.APP_ORIGIN,
    CLIENT_ID_PREVIEW: env.GOOGLE_CLIENT_ID
      ? env.GOOGLE_CLIENT_ID.slice(0, 12) + '...' + env.GOOGLE_CLIENT_ID.slice(-20)
      : 'NOT SET',
    CLIENT_SECRET_SET: !!env.GOOGLE_CLIENT_SECRET,
    CLIENT_SECRET_LEN: env.GOOGLE_CLIENT_SECRET?.length ?? 0,
    CLIENT_SECRET_PREFIX: env.GOOGLE_CLIENT_SECRET?.slice(0, 7) ?? 'NOT SET',
  });
};
