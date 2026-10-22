import { getUserByEmail, createUser } from '../../_lib/db';
import { createSession, makeSessionCookie, generateId } from '../../_lib/session';
import type { Env } from '../../_lib/db';

const clearStateCookie = 'dg_oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/api/auth/google';

function errorResponse(message: string, status = 400) {
  return new Response(message, { status, headers: { 'Set-Cookie': clearStateCookie } });
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] || null;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const segment = token.split('.')[1];
  if (!segment) throw new Error('Invalid token');
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = cookieValue(request, 'dg_oauth_state');
  if (!code) return errorResponse('No code');
  if (!state || !expectedState || state !== expectedState) return errorResponse('Invalid OAuth state');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.APP_ORIGIN}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json<{ id_token?: string; error?: string }>();
  if (!tokenRes.ok || !tokenData.id_token) return errorResponse('Token exchange failed', 502);

  // Google tokeninfo가 서명과 표준 클레임을 검증한 결과를 다시 확인한다.
  const verifyUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
  verifyUrl.searchParams.set('id_token', tokenData.id_token);
  const verifyRes = await fetch(verifyUrl.toString());
  const verified = await verifyRes.json<{
    sub?: string;
    email?: string;
    email_verified?: string | boolean;
    aud?: string;
    iss?: string;
    exp?: string;
  }>();
  const issuerValid = verified.iss === 'accounts.google.com' || verified.iss === 'https://accounts.google.com';
  const expiryValid = Number(verified.exp || 0) > Math.floor(Date.now() / 1000);
  if (!verifyRes.ok || verified.aud !== env.GOOGLE_CLIENT_ID || !issuerValid || !expiryValid
    || (verified.email_verified !== true && verified.email_verified !== 'true')
    || !verified.sub || !verified.email) {
    return errorResponse('Invalid identity token', 401);
  }

  const payload = decodeJwtPayload(tokenData.id_token);
  const identity = {
    sub: verified.sub,
    email: verified.email.toLowerCase(),
    name: typeof payload.name === 'string' ? payload.name : undefined,
  };

  let user = await getUserByEmail(env.DB, identity.email);
  if (!user) {
    user = await createUser(env.DB, {
      id: generateId(),
      email: identity.email,
      name: identity.name,
      auth_method: 'google_oauth',
      google_sub: identity.sub,
    });
  } else {
    await env.DB.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
      .bind(identity.name ?? null, Date.now(), user.id).run();
    user = { ...user, name: identity.name };
  }

  const sessionId = await createSession(env.DB, user.id);

  const headers = new Headers({ 'Location': '/' });
  headers.append('Set-Cookie', makeSessionCookie(sessionId));
  headers.append('Set-Cookie', clearStateCookie);
  return new Response(null, {
    status: 302,
    headers,
  });
};
