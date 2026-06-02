export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  APP_ORIGIN: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  auth_method: string;
  google_sub?: string;
  created_at: number;
  updated_at: number;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
  return result ?? null;
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  return result ?? null;
}

export async function createUser(db: D1Database, user: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
  const now = Date.now();
  await db.prepare(
    'INSERT INTO users (id, email, name, auth_method, google_sub, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(user.id, user.email, user.name ?? null, user.auth_method, user.google_sub ?? null, now, now).run();
  return { ...user, created_at: now, updated_at: now };
}
