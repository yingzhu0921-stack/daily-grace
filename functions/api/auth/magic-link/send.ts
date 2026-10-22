import { generateId } from '../../_lib/session';
import type { Env } from '../../_lib/db';
import { consumeRateLimit, hashRateLimitKey } from '../../_lib/rateLimit';
import { readJsonObject } from '../../_lib/requestValidation';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parsed = await readJsonObject<{ email?: string }>(request, 4_000);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: 'Valid email required' }, { status: 400 });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const [ipKey, emailKey] = await Promise.all([hashRateLimitKey(ip), hashRateLimitKey(email)]);
  const ipRate = await consumeRateLimit(env.DB, 'magic-link:ip', ipKey, 10, 60 * 60 * 1000);
  if (!ipRate.allowed) {
    return Response.json({ error: '잠시 후 다시 시도해주세요.' }, {
      status: 429,
      headers: { 'Retry-After': String(ipRate.retryAfterSeconds) },
    });
  }
  const emailRate = await consumeRateLimit(env.DB, 'magic-link:email', emailKey, 5, 60 * 60 * 1000);
  if (!emailRate.allowed) {
    return Response.json({ error: '잠시 후 다시 시도해주세요.' }, {
      status: 429,
      headers: { 'Retry-After': String(emailRate.retryAfterSeconds) },
    });
  }

  const token = generateId();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15분
  await env.DB.prepare(
    'INSERT INTO magic_link_tokens (token, email, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(token, email, expiresAt, Date.now()).run();

  const link = `${env.APP_ORIGIN}/api/auth/magic-link/verify?token=${token}`;

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'Daily Grace <onboarding@resend.dev>',
      to: email,
      subject: 'Daily Grace 로그인 링크',
      html: `<p>아래 링크를 클릭하여 로그인하세요 (15분 유효):</p><a href="${link}">${link}</a>`,
    }),
  });

  if (!emailResponse.ok) {
    await env.DB.prepare('DELETE FROM magic_link_tokens WHERE token = ?').bind(token).run();
    return Response.json({ error: '이메일 전송에 실패했습니다.' }, { status: 502 });
  }

  return Response.json({ success: true });
};
