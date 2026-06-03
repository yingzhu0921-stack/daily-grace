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
  window.dispatchEvent(new Event('recordsUpdated'));
}

export function listAll(): Diary[] {
  return readAll().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function listByDate(dateISO: string): Diary[] {
  return listAll().filter(d => (d.createdAt || "").slice(0, 10) === dateISO);
}

export async function create(content: string): Promise<Diary> {
  const now = new Date().toISOString();
  const d: Diary = { id: crypto.randomUUID(), content, createdAt: now, updatedAt: now };
  writeAll([d, ...readAll()]);
  fetch('/api/data/diaries', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d),
  }).catch(() => {});
  return d;
}

export function get(id: string) {
  return readAll().find(d => d.id === id) || null;
}

export async function update(id: string, content: string) {
  const all = readAll();
  const idx = all.findIndex(d => d.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], content, updatedAt: new Date().toISOString() };
    writeAll(all);
    fetch(`/api/data/diaries/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(all[idx]),
    }).catch(() => {});
  }
}

export async function remove(id: string) {
  writeAll(readAll().filter(d => d.id !== id));
  fetch(`/api/data/diaries/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
}

export function hasDiaryOn(date: Date) {
  return listByDate(date.toISOString().split("T")[0]).length > 0;
}
