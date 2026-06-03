import type { GratitudeNote } from '@/types/gratitude';

const KEY = 'gratitudes';

function readAll(): GratitudeNote[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function writeAll(list: GratitudeNote[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('recordsUpdated'));
}

export function list(): GratitudeNote[] {
  return readAll()
    .map((n: any) => ({ ...n, createdAt: n.createdAt || n.updatedAt || new Date().toISOString() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function create(items: string[]) {
  const now = new Date().toISOString();
  const note: GratitudeNote = { id: crypto.randomUUID(), items, createdAt: now, updatedAt: now };
  writeAll([note, ...readAll()]);
  fetch('/api/data/gratitudes', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  }).catch(() => {});
  return note;
}

export function get(id: string) {
  return readAll().find(n => n.id === id) || null;
}

export async function update(id: string, items: string[]) {
  const all = readAll();
  const index = all.findIndex(n => n.id === id);
  if (index === -1) throw new Error('Note not found');
  const updated: GratitudeNote = { ...all[index], items, updatedAt: new Date().toISOString() };
  all[index] = updated;
  writeAll(all);
  fetch(`/api/data/gratitudes/${id}`, {
    method: 'PUT', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  }).catch(() => {});
  return updated;
}

export async function remove(id: string) {
  writeAll(readAll().filter(n => n.id !== id));
  fetch(`/api/data/gratitudes/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
}
