/**
 * Verse card storage — IndexedDB(local cache) + D1/R2(cloud).
 *
 * IndexedDB는 빠른 로컬 캐시로 유지하고, 로그인 상태면 클라우드(D1 메타 + R2 이미지)와 동기화한다.
 * - saveCard: 로컬 저장 + 클라우드 업로드(백그라운드)
 * - getAllCards: 최초 1회 클라우드에서 하이드레이션(다른 기기 카드 포함) 후 로컬 반환
 * - deleteCard: 로컬 + 클라우드 삭제
 * - clearAllCards: 로컬만 비움(로그아웃용, 클라우드는 건드리지 않음)
 */

const DB_NAME = 'VerseCardsDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';
const API = '/api/data/verse-cards';

export type VerseCard = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  ratio: '1:1' | '9:16' | '16:9' | '4:3' | '4:5' | '3:4' | '2:3';
  bg: string;
  text: string;
  ref: string;
  tags: string[];
  imageDataUrl?: string;
  editorState?: any;
};

let dbInstance: IDBDatabase | null = null;

async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// ── 로컬(IndexedDB) 기본 연산 ──
async function putLocal(card: VerseCard): Promise<void> {
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(card);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllLocal(): Promise<VerseCard[]> {
  const db = await initDB();
  return new Promise<VerseCard[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as VerseCard[]);
    request.onerror = () => reject(request.error);
  });
}

async function deleteLocal(id: string): Promise<void> {
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── 클라우드 동기화 ──
let hydrated = false;

async function uploadCard(card: VerseCard): Promise<boolean> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function hydrateFromCloud(): Promise<void> {
  if (hydrated) return;
  let cloud: VerseCard[] | null = null;
  try {
    const res = await fetch(API, { credentials: 'include' });
    if (res.status === 401) return;      // 미로그인 — 다음에 재시도
    if (!res.ok) return;
    cloud = await res.json();
  } catch {
    return;
  }
  if (!cloud) return;
  hydrated = true;

  const local = await getAllLocal();
  const localById = new Map(local.map(c => [c.id, c]));
  const cloudIds = new Set(cloud.map(c => c.id));

  // 클라우드에만 있는 카드(다른 기기) -> 로컬 캐시에 추가
  for (const c of cloud) {
    if (!localById.has(c.id)) await putLocal(c);
  }
  // 로컬에만 있는 카드(오프라인 생성분) -> 클라우드로 백업
  for (const [id, c] of localById) {
    if (!cloudIds.has(id)) await uploadCard(c);
  }
}

// ── 공개 API (기존 시그니처 유지) ──
export async function saveCard(card: VerseCard): Promise<void> {
  await putLocal(card);
  // 클라우드 백업은 백그라운드로 (로컬 저장은 이미 완료)
  void uploadCard(card);
}

export async function getAllCards(): Promise<VerseCard[]> {
  await hydrateFromCloud();
  const cards = await getAllLocal();
  return cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCardById(id: string): Promise<VerseCard | undefined> {
  await hydrateFromCloud();
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCard(id: string): Promise<void> {
  await deleteLocal(id);
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' });
  } catch { /* 무시 — 로컬은 이미 삭제 */ }
}

/** 로컬 캐시만 비움 (로그아웃용). 클라우드는 건드리지 않는다. */
export async function clearAllCards(): Promise<void> {
  hydrated = false;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** 예전 localStorage -> IndexedDB 일회성 이관 (기존 유지) */
export async function migrateFromLocalStorage(): Promise<number> {
  try {
    const stored = localStorage.getItem('verse_cards');
    if (!stored) return 0;
    const cards = JSON.parse(stored) as VerseCard[];
    for (const card of cards) await saveCard(card);
    localStorage.setItem('verse_cards_migrated', 'true');
    return cards.length;
  } catch {
    return 0;
  }
}
