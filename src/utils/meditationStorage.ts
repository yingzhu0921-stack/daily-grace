import { supabase } from '@/integrations/supabase/client';
import { ApplicationItem } from '@/types/meditation';

export type MeditationNote = {
  id: string;
  title: string;
  passage: string;
  content: string;
  application: string;
  applications?: ApplicationItem[];
  applyChecked?: boolean;
  applyCheckedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  fullText?: string;
};

const KEY = 'meditations';

function readAll(): MeditationNote[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function writeAll(list: MeditationNote[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export async function create(note: Omit<MeditationNote,'id'|'createdAt'|'updatedAt'>) {
  const all = readAll();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const saved: MeditationNote = { ...note, id, createdAt: now, updatedAt: now };
  writeAll([saved, ...all]);

  // Supabase 백업 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('meditation_notes').insert({
        id: saved.id,
        user_id: user.id,
        title: saved.title,
        passage: saved.passage || '',
        content: saved.content,
        application: saved.application || '',
        applications: saved.applications ? JSON.stringify(saved.applications) : null,
        apply_checked: saved.applyChecked || false,
        apply_checked_at: saved.applyCheckedAt || null,
        full_text: saved.fullText || '',
        date: saved.createdAt.split('T')[0],
      });
      if (error) {
        console.error('❌ Supabase 저장 실패:', error);
      } else {
        console.log('✅ Supabase에 저장됨:', saved.id);
      }
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return saved;
}

export async function update(id: string, patch: Partial<MeditationNote>) {
  const all = readAll();
  const i = all.findIndex(n => n.id === id);
  if (i < 0) throw new Error('묵상을 찾을 수 없습니다');
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  writeAll(all);

  // Supabase 백업 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('meditation_notes').update({
        title: all[i].title,
        passage: all[i].passage || '',
        content: all[i].content,
        application: all[i].application || '',
        applications: all[i].applications ? JSON.stringify(all[i].applications) : null,
        apply_checked: all[i].applyChecked || false,
        apply_checked_at: all[i].applyCheckedAt || null,
        full_text: all[i].fullText || '',
        updated_at: all[i].updatedAt,
      }).eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 업데이트 실패:', error);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return all[i];
}

export function get(id: string) {
  return readAll().find(n => n.id === id) || null;
}

export function getAll() {
  return readAll();
}

export function list(): MeditationNote[] {
  const raw = readAll();
  
  const all = raw.map((n: any) => ({
    ...n,
    createdAt: n.createdAt || n.updatedAt || new Date().toISOString(),
  }));

  return all.sort((a: MeditationNote, b: MeditationNote) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

export async function toggleApply(id: string) {
  const all = readAll();
  const i = all.findIndex(n => n.id === id);
  if (i < 0) throw new Error('묵상을 찾을 수 없습니다');
  const checked = !all[i].applyChecked;

  // applications 배열이 있으면 모든 항목을 체크/해제
  const updatedApplications = all[i].applications
    ? all[i].applications!.map(item => ({ ...item, checked }))
    : undefined;

  all[i] = {
    ...all[i],
    applications: updatedApplications,
    applyChecked: checked,
    applyCheckedAt: checked ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);

  // Supabase 백업 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('meditation_notes').update({
        applications: all[i].applications ? JSON.stringify(all[i].applications) : null,
        apply_checked: all[i].applyChecked,
        apply_checked_at: all[i].applyCheckedAt,
        updated_at: all[i].updatedAt,
      }).eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 업데이트 실패:', error);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }

  return all[i];
}

export async function remove(id: string) {
  const all = readAll();
  writeAll(all.filter(n => n.id !== id));

  // Supabase 삭제 (동기화)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('meditation_notes').delete().eq('id', id).eq('user_id', user.id);
      if (error) console.error('❌ Supabase 삭제 실패:', error);
    }
  } catch (error) {
    console.error('❌ Supabase 백업 중 오류:', error);
  }
}
