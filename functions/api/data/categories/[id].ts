import { getSessionUser } from '../../_lib/session';
import type { Env } from '../../_lib/db';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;

  if (request.method === 'PUT') {
    const b = await request.json<any>();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    if (b.name !== undefined) { fields.push('name=?'); values.push(b.name); }
    if (b.color !== undefined) { fields.push('color=?'); values.push(b.color); }
    if (b.icon !== undefined) { fields.push('icon=?'); values.push(b.icon); }
    if (b.description !== undefined) { fields.push('description=?'); values.push(b.description); }
    if (b.includeInGoal !== undefined) { fields.push('include_in_goal=?'); values.push(b.includeInGoal ? 1 : 0); }
    if (b.activeDays !== undefined) { fields.push('active_days=?'); values.push(JSON.stringify(b.activeDays)); }
    if (b.fields !== undefined) { fields.push('fields=?'); values.push(JSON.stringify(b.fields)); }
    fields.push('updated_at=?'); values.push(now);
    values.push(id, user.id);
    await env.DB.prepare(`UPDATE categories SET ${fields.join(',')} WHERE id=? AND user_id=?`).bind(...values).run();
    return Response.json({ success: true });
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM categories WHERE id=? AND user_id=?').bind(id, user.id).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
