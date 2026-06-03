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
  window.dispatchEvent(new Event('recordsUpdated'));
}

function syncCreate(note: MeditationNote) {
  fetch('/api/data/meditations', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  }).catch(() => {});
}

function syncUpdate(note: MeditationNote) {
  fetch(`/api/data/meditations/${note.id}`, {
    method: 'PUT', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  }).catch(() => {});
}

function syncDelete(id: string) {
  fetch(`/api/data/meditations/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
}

export async function create(note: Omit<MeditationNote, 'id' | 'createdAt' | 'updatedAt'>) {
  const all = readAll();
  const now = new Date().toISOString();
  const saved: MeditationNote = { ...note, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  writeAll([saved, ...all]);
  syncCreate(saved);
  return saved;
}

export async function update(id: string, patch: Partial<MeditationNote>) {
  const all = readAll();
  const i = all.findIndex(n => n.id === id);
  if (i < 0) throw new Error('묵상을 찾을 수 없습니다');
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  writeAll(all);
  syncUpdate(all[i]);
  return all[i];
}

export function get(id: string) {
  return readAll().find(n => n.id === id) || null;
}

export function getAll() {
  return readAll();
}

export function list(): MeditationNote[] {
  return readAll()
    .map((n: any) => ({ ...n, createdAt: n.createdAt || n.updatedAt || new Date().toISOString() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function toggleApply(id: string) {
  const all = readAll();
  const i = all.findIndex(n => n.id === id);
  if (i < 0) throw new Error('묵상을 찾을 수 없습니다');
  const checked = !all[i].applyChecked;
  all[i] = {
    ...all[i],
    applications: all[i].applications?.map(item => ({ ...item, checked })),
    applyChecked: checked,
    applyCheckedAt: checked ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
  syncUpdate(all[i]);
  return all[i];
}

export async function remove(id: string) {
  writeAll(readAll().filter(n => n.id !== id));
  syncDelete(id);
}
