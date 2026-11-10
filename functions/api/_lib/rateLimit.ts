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
  /** 구간 경계를 옮긴다. 하루 한도를 한국 자정에 맞추려면 9시간(한국은 UTC+9). 기본은 UTC 기준. */
  offsetMs = 0,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const windowStart = Math.floor((now + offsetMs) / windowMs) * windowMs - offsetMs;
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
