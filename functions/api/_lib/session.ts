import { getUserById } from './db';
import type { User } from './db';

const SESSION_COOKIE = 'dg_session';
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateId(): string {
  return crypto.randomUUID();
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const id = generateId();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL;
  await db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, expiresAt, now).run();
  return id;
}

export async function getSessionUser(db: D1Database, request: Request): Promise<User | null> {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;

  const sessionId = match[1];
  const session = await db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > ?'
  ).bind(sessionId, Date.now()).first<{ user_id: string }>();

  if (!session) return null;
  return getUserById(db, session.user_id);
}

export function makeSessionCookie(sessionId: string): string {
  return `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL / 1000}; Path=/`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
}
