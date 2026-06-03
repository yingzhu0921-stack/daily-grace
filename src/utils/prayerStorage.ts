import type { PrayerNote } from '@/types/prayer';

const KEY = 'prayers';

function readAll(): PrayerNote[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function writeAll(list: PrayerNote[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('recordsUpdated'));
}

function syncCreate(note: PrayerNote) {
  fetch('/api/data/prayers', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  }).catch(() => {});
}

function syncUpdate(note: PrayerNote) {
  fetch(`/api/data/prayers/${note.id}`, {
    method: 'PUT', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  }).catch(() => {});
}

function syncDelete(id: string) {
  fetch(`/api/data/prayers/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
}

export function list(): PrayerNote[] {
  return readAll()
    .map((n: any) => ({ ...n, createdAt: n.createdAt || n.updatedAt || new Date().toISOString() }))
    .sort((a, b) => {
      if (!!a.answered !== !!b.answered) return a.answered ? 1 : -1;
      if (!a.answered && !b.answered) return (b.createdAt || '').localeCompare(a.createdAt || '');
      return ((b.answeredAt || b.createdAt || '')).localeCompare((a.answeredAt || a.createdAt || ''));
    });
}

export async function create(note: Omit<PrayerNote, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const saved: PrayerNote = { ...note, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  writeAll([saved, ...readAll()]);
  syncCreate(saved);
  return saved;
}

export async function update(id: string, patch: Partial<PrayerNote>) {
  const all = readAll();
  const idx = all.findIndex(n => n.id === id);
  if (idx < 0) throw new Error('기도제목을 찾을 수 없습니다');
  all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  writeAll(all);
  syncUpdate(all[idx]);
  return all[idx];
}

export async function toggleAnswered(id: string) {
  const all = readAll();
  const idx = all.findIndex(n => n.id === id);
  if (idx < 0) throw new Error('기도제목을 찾을 수 없습니다');
  const answered = !all[idx].answered;
  all[idx] = { ...all[idx], answered, answeredAt: answered ? new Date().toISOString() : null, updatedAt: new Date().toISOString() };
  writeAll(all);
  syncUpdate(all[idx]);
  return all[idx];
}

export function get(id: string) {
  return readAll().find(n => n.id === id) || null;
}

export async function remove(id: string) {
  writeAll(readAll().filter(n => n.id !== id));
  syncDelete(id);
}

export function createManyFromText(text: string) {
  return text.split('\n').map(s => s.trim()).filter(Boolean).map(line =>
    create({ title: line, content: line, answered: false, answeredAt: null })
  );
}
