/**
 * 커스텀 기록 클라우드 동기화 (localStorage['custom_records'] <-> D1).
 *
 * 페이지들은 여전히 localStorage를 캐시로 동기 조작하고, 쓰기 후 'recordsUpdated' 이벤트를 쏜다.
 * 이 모듈은:
 *  1) 로그인 시 D1에서 기록을 불러와 localStorage를 채우고(하이드레이션),
 *  2) 로컬에만 있던 기록을 클라우드로 밀어올리고,
 *  3) 이후 'recordsUpdated' 마다 로컬 변경분(신규/수정/삭제)을 D1에 반영한다.
 * 그래서 페이지 코드는 한 줄도 바꾸지 않는다.
 */
const KEY = 'custom_records';
const API = '/api/data/custom-records';

type Rec = { id: string; categoryId?: string; createdAt?: string; updatedAt?: string; [k: string]: any };

let started = false;
let syncing = false;
let queued = false;
let runVersion = 0;
let syncController: AbortController | null = null;
// 클라우드에 반영된 마지막 상태 스냅샷 (id -> JSON). 변경 감지 + 안전한 삭제 판단용.
let snapshot: Record<string, string> = {};

function readLocal(): Rec[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function writeLocal(records: Rec[]) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

async function pushChanges(): Promise<void> {
  if (syncing) { queued = true; return; }
  const version = runVersion;
  const signal = syncController?.signal;
  if (!signal || signal.aborted) return;
  syncing = true;
  try {
    const local = readLocal();
    const localIds = new Set(local.map(r => r.id));

    // 신규/수정 업서트
    for (const r of local) {
      if (!r?.id || !r?.categoryId) continue;
      const s = JSON.stringify(r);
      if (snapshot[r.id] === s) continue;
      const res = await fetch(API, {
        method: 'POST',
        credentials: 'include',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: s,
      });
      if (signal.aborted || version !== runVersion) return;
      if (res.status === 401) return; // 로그아웃됨 — 조용히 중단
      if (res.ok) snapshot[r.id] = s;
    }

    // 로컬에서 사라진 기록만 클라우드에서 삭제 (스냅샷에 있고 로컬엔 없음)
    for (const id of Object.keys(snapshot)) {
      if (localIds.has(id)) continue;
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include', signal });
      if (signal.aborted || version !== runVersion) return;
      if (res.status === 401) return;
      if (res.ok) delete snapshot[id];
    }
  } catch {
    /* 네트워크 오류 — 다음 이벤트에 재시도 */
  } finally {
    if (version === runVersion) {
      syncing = false;
      if (queued && !signal.aborted) { queued = false; void pushChanges(); }
    }
  }
}

function onRecordsUpdated() { void pushChanges(); }

export async function initCustomRecordSync(): Promise<void> {
  if (started) return;
  started = true;
  const version = ++runVersion;
  const controller = new AbortController();
  syncController = controller;

  // 1) 클라우드에서 불러오기
  let cloud: Rec[] = [];
  try {
    const res = await fetch(API, { credentials: 'include', signal: controller.signal });
    if (controller.signal.aborted || version !== runVersion) return;
    if (res.status === 401) { started = false; return; } // 미로그인
    if (res.ok) cloud = await res.json();
    if (controller.signal.aborted || version !== runVersion) return;
  } catch {
    if (version === runVersion) started = false;
    return;
  }

  // 2) 병합: 같은 id는 updatedAt이 더 최근인 기록을 사용한다.
  const local = readLocal();
  const byId: Record<string, Rec> = {};
  cloud.forEach(r => { byId[r.id] = r; });
  local.forEach(r => {
    if (!r?.id) return;
    const remote = byId[r.id];
    const localTime = Date.parse(r.updatedAt || r.createdAt || '') || 0;
    const remoteTime = Date.parse(remote?.updatedAt || remote?.createdAt || '') || 0;
    if (!remote || localTime > remoteTime) byId[r.id] = r;
  });
  writeLocal(Object.values(byId));

  snapshot = {};
  cloud.forEach(r => { snapshot[r.id] = JSON.stringify(r); });

  // 3) 로컬에만 있던 것 밀어올리기 + 뷰 갱신
  await pushChanges();
  if (controller.signal.aborted || version !== runVersion) return;
  window.dispatchEvent(new Event('recordsUpdated'));

  window.addEventListener('recordsUpdated', onRecordsUpdated);
}

export function stopCustomRecordSync(): void {
  runVersion += 1;
  syncController?.abort();
  syncController = null;
  window.removeEventListener('recordsUpdated', onRecordsUpdated);
  snapshot = {};
  started = false;
  syncing = false;
  queued = false;
}
