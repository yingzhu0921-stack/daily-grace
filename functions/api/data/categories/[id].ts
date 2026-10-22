import { getSessionUser } from '../../_lib/session';
import type { Env } from '../../_lib/db';
import { badRequest, readJsonObject, validId, validOptionalBoolean, validOptionalString, validStringArray } from '../../_lib/requestValidation';

export const onRequest: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  if (!validId(id)) return badRequest('카테고리 ID가 올바르지 않습니다.');

  if (request.method === 'PUT') {
    const parsed = await readJsonObject<any>(request, 32_000);
    if ('response' in parsed) return parsed.response;
    const b = parsed.body;
    const activeDaysValid = b.activeDays === undefined || (Array.isArray(b.activeDays)
      && b.activeDays.length <= 7 && b.activeDays.every((day: unknown) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6));
    if ((b.name !== undefined && (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 80))
      || !validOptionalString(b.color, 64) || !validOptionalString(b.icon, 64)
      || !validOptionalString(b.description, 2_000) || !validOptionalBoolean(b.includeInGoal)
      || !activeDaysValid || (b.fields !== undefined && !validStringArray(b.fields, 20, 50))) return badRequest();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    if (b.name !== undefined) { fields.push('name=?'); values.push(b.name.trim()); }
    if (b.color !== undefined) { fields.push('color=?'); values.push(b.color); }
    if (b.icon !== undefined) { fields.push('icon=?'); values.push(b.icon); }
    if (b.description !== undefined) { fields.push('description=?'); values.push(b.description); }
    if (b.includeInGoal !== undefined) { fields.push('include_in_goal=?'); values.push(b.includeInGoal ? 1 : 0); }
    if (b.activeDays !== undefined) { fields.push('active_days=?'); values.push(JSON.stringify(b.activeDays)); }
    if (b.fields !== undefined) { fields.push('fields=?'); values.push(JSON.stringify(b.fields)); }
    fields.push('updated_at=?'); values.push(now);
    values.push(id, user.id);
    const result = await env.DB.prepare(`UPDATE categories SET ${fields.join(',')} WHERE id=? AND user_id=?`).bind(...values).run();
    if (!result.meta.changes) return Response.json({ error: 'Category not found' }, { status: 404 });
    return Response.json({ success: true });
  }

  if (request.method === 'DELETE') {
    const result = await env.DB.prepare('DELETE FROM categories WHERE id=? AND user_id=?').bind(id, user.id).run();
    if (!result.meta.changes) return Response.json({ error: 'Category not found' }, { status: 404 });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
