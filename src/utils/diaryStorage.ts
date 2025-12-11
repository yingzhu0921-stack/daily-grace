import { supabase } from '@/integrations/supabase/client';

export type Diary = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const KEY = "diaries";

function readAll(): Diary[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function writeAll(list: Diary[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listAll(): Diary[] {
  const all = readAll();
  return all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function listByDate(dateISO: string): Diary[] {
  return listAll().filter(d => (d.createdAt || "").slice(0, 10) === dateISO);
}

export async function create(content: string): Promise<Diary> {
  const all = readAll();
  const now = new Date().toISOString();
  const d: Diary = { id: crypto.randomUUID(), content, createdAt: now, updatedAt: now };
  writeAll([d, ...all]);

  // Supabase 백업 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('diary_entries').insert({
        id: d.id,
        user_id: user.id,
        content: d.content,
        date: d.createdAt.split('T')[0],
      });
      if (error) console.error('❌ Supabase 저장 실패:', error);
      else console.log('✅ Supabase에 저장됨:', d.id);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return d;
}

export function get(id: string) { 
  return readAll().find(d => d.id === id) || null; 
}

export async function update(id: string, content: string) {
  const all = readAll();
  const now = new Date().toISOString();
  const idx = all.findIndex(d => d.id === id);
  if (idx >= 0) { 
    all[idx] = { ...all[idx], content, updatedAt: now }; 
    writeAll(all);

    // Supabase 백업 (동기화)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('diary_entries').update({
          content: all[idx].content,
        }).eq('id', id).eq('user_id', user.id);
        if (error) console.error('❌ Supabase 업데이트 실패:', error);
      }
    } catch (error) {
      console.error('❌ Supabase 백업 중 오류:', error);
    }
  }
}

export async function remove(id: string) { 
  writeAll(readAll().filter(d => d.id !== id));

  // Supabase 삭제 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('diary_entries').delete().eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 삭제 실패:', error);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }
}

export function hasDiaryOn(date: Date) {
  const ds = date.toISOString().split("T")[0];
  return listByDate(ds).length > 0;
}
