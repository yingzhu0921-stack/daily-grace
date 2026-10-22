export async function hashRateLimitKey(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function consumeRateLimit(
  db: D1Database,
  bucket: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const row = await db.prepare(
    `INSERT INTO rate_limits (bucket, rate_key, window_start, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(bucket, rate_key, window_start)
     DO UPDATE SET count = count + 1
     RETURNING count`
  ).bind(bucket, key, windowStart).first<{ count: number }>();
  const count = Number(row?.count || 1);
  return {
    allowed: count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
  };
}
