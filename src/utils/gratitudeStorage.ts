import type { GratitudeNote } from '@/types/gratitude';
import { supabase } from '@/integrations/supabase/client';

const KEY = 'gratitudes';

function readAll(): GratitudeNote[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function writeAll(list: GratitudeNote[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function list(): GratitudeNote[] {
  const all = readAll().map((n: any) => ({
    ...n,
    createdAt: n.createdAt || n.updatedAt || new Date().toISOString(),
  }));
  return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function create(items: string[]) {
  const all = readAll();
  const now = new Date().toISOString();
  const note: GratitudeNote = {
    id: crypto.randomUUID(),
    items,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([note, ...all]);

  // Supabase 백업 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('gratitude_entries').insert({
        id: note.id,
        user_id: user.id,
        items: note.items,
        date: note.createdAt.split('T')[0],
      });
      if (error) console.error('❌ Supabase 저장 실패:', error);
      else console.log('✅ Supabase에 저장됨:', note.id);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return note;
}

export function get(id: string) {
  return readAll().find(n => n.id === id) || null;
}

export async function update(id: string, items: string[]) {
  const all = readAll();
  const index = all.findIndex(n => n.id === id);
  if (index === -1) throw new Error('Note not found');

  const now = new Date().toISOString();
  const updated: GratitudeNote = {
    ...all[index],
    items,
    updatedAt: now,
  };
  all[index] = updated;
  writeAll(all);

  // Supabase 업데이트 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('gratitude_entries').update({
        items: updated.items,
        updated_at: updated.updatedAt,
      }).eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 업데이트 실패:', error);
      else console.log('✅ Supabase에 업데이트됨:', id);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return updated;
}

export async function remove(id: string) {
  writeAll(readAll().filter(n => n.id !== id));

  // Supabase 삭제 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('gratitude_entries').delete().eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 삭제 실패:', error);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }
}
