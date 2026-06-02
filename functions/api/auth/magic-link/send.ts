import { generateId } from '../../_lib/session';
import type { Env } from '../../_lib/db';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email } = await request.json<{ email: string }>();
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

  const token = generateId();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15분
  await env.DB.prepare(
    'INSERT INTO magic_link_tokens (token, email, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(token, email, expiresAt, Date.now()).run();

  const link = `${env.APP_ORIGIN}/api/auth/magic-link/verify?token=${token}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Daily Grace 로그인 링크',
      html: `<p>아래 링크를 클릭하여 로그인하세요 (15분 유효):</p><a href="${link}">${link}</a>`,
    }),
  });

  return Response.json({ success: true });
};
