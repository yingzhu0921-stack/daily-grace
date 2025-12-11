import { supabase } from '@/integrations/supabase/client';

export type Category = {
  id: string;
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(cat => ({
    id: cat.id,
    user_id: cat.user_id,
    name: cat.name,
    color: cat.color,
    icon: cat.icon || undefined,
    description: cat.description || undefined,
    includeInGoal: cat.include_in_goal,
    activeDays: cat.active_days,
    fields: cat.fields as string[],
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }));
}

export async function create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('🔐 Creating category, user:', user?.id);
  if (!user) throw new Error('User not authenticated');

  const insertData = {
    user_id: user.id,
    name: category.name,
    color: category.color,
    icon: category.icon || null,
    description: category.description || null,
    include_in_goal: category.includeInGoal ?? true,
    active_days: category.activeDays || [0,1,2,3,4,5,6],
    fields: category.fields,
  };
  console.log('📝 Inserting category data:', insertData);

  const { data, error } = await supabase
    .from('categories')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating category:', error);
    throw error;
  }

  console.log('✅ Category created successfully:', data);

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    icon: data.icon || undefined,
    description: data.description || undefined,
    includeInGoal: data.include_in_goal,
    activeDays: data.active_days,
    fields: data.fields as string[],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function get(id: string): Promise<Category | null> {
  // 먼저 sessionStorage에서 캐시된 카테고리 확인
  const cached = sessionStorage.getItem(`category_${id}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // 캐시 파싱 실패 시 무시
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return null;

  const category = {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    color: data.color,
    icon: data.icon || undefined,
    description: data.description || undefined,
    includeInGoal: data.include_in_goal,
    activeDays: data.active_days,
    fields: data.fields as string[],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  // sessionStorage에 캐시 저장
  sessionStorage.setItem(`category_${id}`, JSON.stringify(category));

  return category;
}

export async function update(id: string, patch: Partial<Category>): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const updateData: any = {};
  if (patch.name !== undefined) updateData.name = patch.name;
  if (patch.color !== undefined) updateData.color = patch.color;
  if (patch.icon !== undefined) updateData.icon = patch.icon;
  if (patch.description !== undefined) updateData.description = patch.description;
  if (patch.includeInGoal !== undefined) updateData.include_in_goal = patch.includeInGoal;
  if (patch.activeDays !== undefined) updateData.active_days = patch.activeDays;
  if (patch.fields !== undefined) updateData.fields = patch.fields;

  const { data, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    icon: data.icon || undefined,
    description: data.description || undefined,
    includeInGoal: data.include_in_goal,
    activeDays: data.active_days,
    fields: data.fields as string[],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function remove(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}
