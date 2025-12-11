import type { PrayerNote } from '@/types/prayer';
import { supabase } from '@/integrations/supabase/client';

const KEY = 'prayers';

function readAll(): PrayerNote[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function writeAll(list: PrayerNote[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function list(): PrayerNote[] {
  const raw = readAll();
  const all = raw.map((n: any) => ({
    ...n,
    createdAt: n.createdAt || n.updatedAt || new Date().toISOString(),
  }));

  return all.sort((a: PrayerNote, b: PrayerNote) => {
    if (!!a.answered !== !!b.answered) return a.answered ? 1 : -1;
    if (!a.answered && !b.answered) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    } else {
      const aKey = a.answeredAt || a.createdAt || '';
      const bKey = b.answeredAt || b.createdAt || '';
      return (bKey).localeCompare(aKey);
    }
  });
}

export async function create(note: Omit<PrayerNote, 'id' | 'createdAt' | 'updatedAt'>) {
  const all = readAll();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const saved: PrayerNote = { ...note, id, createdAt: now, updatedAt: now };
  writeAll([saved, ...all]);

  // Supabase 백업 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('prayer_notes').insert({
        id: saved.id,
        user_id: user.id,
        title: saved.title,
        content: saved.content,
        answered: saved.answered || false,
        answered_at: saved.answeredAt || null,
        answered_detail: saved.answeredDetail || null,
        date: saved.createdAt.split('T')[0],
      });
      if (error) console.error('❌ Supabase 저장 실패:', error);
      else console.log('✅ Supabase에 저장됨:', saved.id);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return saved;
}

export async function update(id: string, patch: Partial<PrayerNote>) {
  const all = readAll();
  const idx = all.findIndex(n => n.id === id);
  if (idx < 0) throw new Error('기도제목을 찾을 수 없습니다');
  all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  writeAll(all);

  // Supabase 백업 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('prayer_notes').update({
        title: all[idx].title,
        content: all[idx].content,
        answered: all[idx].answered || false,
        answered_at: all[idx].answeredAt || null,
        answered_detail: all[idx].answeredDetail || null,
        updated_at: all[idx].updatedAt,
      }).eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 업데이트 실패:', error);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return all[idx];
}

export async function toggleAnswered(id: string) {
  const all = readAll();
  const idx = all.findIndex(n => n.id === id);
  if (idx < 0) throw new Error('기도제목을 찾을 수 없습니다');
  const answered = !all[idx].answered;
  all[idx] = {
    ...all[idx],
    answered,
    answeredAt: answered ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString()
  };
  writeAll(all);

  // Supabase 백업 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('prayer_notes').update({
        answered: all[idx].answered,
        answered_at: all[idx].answeredAt,
        answered_detail: all[idx].answeredDetail || null,
        updated_at: all[idx].updatedAt,
      }).eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 업데이트 실패:', error);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return all[idx];
}

export function get(id: string) {
  return readAll().find(n => n.id === id) || null;
}

export async function remove(id: string) {
  const all = readAll();
  writeAll(all.filter(n => n.id !== id));

  // Supabase 삭제 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('prayer_notes').delete().eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 삭제 실패:', error);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }
}

export function createManyFromText(text: string) {
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  return lines.map(line => create({
    title: line,
    content: line,
    answered: false,
    answeredAt: null,
  }));
}
