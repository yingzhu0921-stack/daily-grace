export type JsonObject = Record<string, unknown>;

export async function readJsonObject<T extends JsonObject = JsonObject>(
  request: Request,
  maxBytes = 512_000,
): Promise<{ body: T } | { response: Response }> {
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { response: Response.json({ error: '요청 내용이 너무 큽니다.' }, { status: 413 }) };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { response: Response.json({ error: '요청 본문을 읽을 수 없습니다.' }, { status: 400 }) };
  }
  if (raw.length > maxBytes) {
    return { response: Response.json({ error: '요청 내용이 너무 큽니다.' }, { status: 413 }) };
  }

  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid object');
    return { body: body as T };
  } catch {
    return { response: Response.json({ error: '올바른 JSON 객체가 필요합니다.' }, { status: 400 }) };
  }
}

export const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export const validOptionalString = (value: unknown, maxLength: number): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.length <= maxLength);

export const validStringArray = (value: unknown, maxItems: number, maxItemLength: number): value is string[] =>
  Array.isArray(value) && value.length <= maxItems
  && value.every(item => typeof item === 'string' && item.length <= maxItemLength);

export const validOptionalTimestamp = (value: unknown): boolean =>
  value === undefined || (typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value)));

export const validOptionalBoolean = (value: unknown): boolean =>
  value === undefined || typeof value === 'boolean';

export const validOptionalArray = (value: unknown, maxItems: number): boolean =>
  value === undefined || (Array.isArray(value) && value.length <= maxItems);

export const badRequest = (message = '입력값이 올바르지 않습니다.'): Response =>
  Response.json({ error: message }, { status: 400 });
