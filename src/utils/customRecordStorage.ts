import { supabase } from '@/integrations/supabase/client';

export type CustomRecord = {
  id: string;
  categoryId: string;
  data: Record<string, any>;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export async function list(categoryId?: string): Promise<CustomRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('custom_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(rec => ({
    id: rec.id,
    categoryId: rec.category_id,
    data: rec.data as Record<string, any>,
    date: rec.date,
    createdAt: rec.created_at,
    updatedAt: rec.updated_at,
  }));
}

export async function create(categoryId: string, data: Record<string, any>): Promise<CustomRecord> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  const { data: result, error } = await supabase
    .from('custom_records')
    .insert({
      user_id: userData.user.id,
      category_id: categoryId,
      data,
      date: dateStr,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: result.id,
    categoryId: result.category_id,
    data: result.data as Record<string, any>,
    date: result.date,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

export async function get(id: string): Promise<CustomRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('custom_records')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return null;

  return {
    id: data.id,
    categoryId: data.category_id,
    data: data.data as Record<string, any>,
    date: data.date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function update(id: string, data: Record<string, any>): Promise<CustomRecord> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: result, error } = await supabase
    .from('custom_records')
    .update({ data })
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: result.id,
    categoryId: result.category_id,
    data: result.data as Record<string, any>,
    date: result.date,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

export async function remove(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('custom_records')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}
