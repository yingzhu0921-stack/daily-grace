import { getSessionUser } from '../_lib/session';
import type { Env } from '../_lib/db';
import { badRequest, readJsonObject, validId, validOptionalBoolean, validOptionalString, validOptionalTimestamp } from '../_lib/requestValidation';

const toFront = (r: any) => ({
  id: r.id, title: r.title, content: r.content,
  answered: Boolean(r.answered),
  answeredAt: r.answered_at,
  answeredDetail: r.answered_detail,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM prayer_notes WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return Response.json(results.map(toFront));
  }

  if (request.method === 'POST') {
    const parsed = await readJsonObject<any>(request);
    if ('response' in parsed) return parsed.response;
    const b = parsed.body;
    if (!validId(b.id) || !validOptionalString(b.title, 500) || !validOptionalString(b.content, 200_000)
      || !validOptionalBoolean(b.answered) || !validOptionalString(b.answeredAt, 64)
      || !validOptionalString(b.answeredDetail, 100_000)
      || !validOptionalTimestamp(b.createdAt) || !validOptionalTimestamp(b.updatedAt)) return badRequest();
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO prayer_notes (id,user_id,title,content,answered,answered_at,answered_detail,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
    ).bind(b.id, user.id, b.title ?? '', b.content ?? '',
      b.answered ? 1 : 0, b.answeredAt ?? null, b.answeredDetail ?? null,
      b.createdAt || now, b.updatedAt || b.createdAt || now).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
