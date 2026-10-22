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

const LEGACY_COLOR_MAP: Record<string, string> = {
  '#4F8A5B': '#7DB87D',
  '#7A6BB8': '#A57DB8',
  '#C89B3C': '#E8C87D',
  '#D97B5D': '#DD957D',
  '#6B9BD1': '#7BA8DB',
  '#E17B8C': '#C58BB8',
  '#C9A86A': '#D9B36B',
  '#9B87BE': '#A57DB8',
  '#D4886E': '#DD957D',
  '#7AA3B5': '#7BA8DB',
  '#B88FA3': '#C58BB8',
  '#8DABA8': '#7BA8DB',
  '#9AB8C6': '#7BA8DB',
  '#D8BE82': '#D9B36B',
  '#C7A0B2': '#C58BB8',
};
const RGBA_COLOR_MAP: Record<string, string> = {
  'rgba(125,184,125,1)': '#7DB87D',
  'rgba(165,125,184,1)': '#A57DB8',
  'rgba(232,200,125,1)': '#E8C87D',
  'rgba(221,149,125,1)': '#DD957D',
};

const normalizeColor = (color?: string) => {
  if (!color) return '#7DB87D';
  if (color.startsWith('rgba')) return RGBA_COLOR_MAP[color.replace(/\s/g, '')] || color;
  const upper = color.toUpperCase();
  return LEGACY_COLOR_MAP[upper] || color;
};

const normalizeCategory = (category: Category): Category => ({
  ...category,
  color: normalizeColor(category.color),
});

export async function list(): Promise<Category[]> {
  const res = await fetch('/api/data/categories', { credentials: 'include' });
  if (!res.ok) throw new Error('카테고리 목록을 불러오지 못했습니다');
  const categories: Category[] = await res.json();
  return categories.map(normalizeCategory);
}

export async function create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const res = await fetch('/api/data/categories', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
  if (!res.ok) throw new Error('카테고리 생성 실패');
  const created: Category = await res.json();
  return normalizeCategory(created);
}

export async function get(id: string): Promise<Category | null> {
  try {
    const all = await list();
    const category = all.find(c => c.id === id) ?? null;
    return category ? normalizeCategory(category) : null;
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
  const updated = all.find(c => c.id === id);
  if (!updated) throw new Error('수정된 카테고리를 불러오지 못했습니다');
  return normalizeCategory(updated);
}

export async function remove(id: string): Promise<void> {
  const res = await fetch(`/api/data/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('카테고리 삭제 실패');
}
