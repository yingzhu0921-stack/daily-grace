export type Category = {
  id: string;
  user_id?: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  includeInGoal?: boolean;
  activeDays?: number[];
  fields: string[];
  createdAt: string;
  updatedAt: string;
};

export async function list(): Promise<Category[]> {
  try {
    const res = await fetch('/api/data/categories', { credentials: 'include' });
    if (!res.ok) return [];
    return await res.json<Category[]>();
  } catch {
    return [];
  }
}

export async function create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const res = await fetch('/api/data/categories', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
  if (!res.ok) throw new Error('카테고리 생성 실패');
  return await res.json<Category>();
}

export async function get(id: string): Promise<Category | null> {
  try {
    const all = await list();
    return all.find(c => c.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function update(id: string, patch: Partial<Category>): Promise<Category> {
  const res = await fetch(`/api/data/categories/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('카테고리 수정 실패');
  const all = await list();
  return all.find(c => c.id === id) as Category;
}

export async function remove(id: string): Promise<void> {
  await fetch(`/api/data/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}
