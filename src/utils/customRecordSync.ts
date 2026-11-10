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
import { markRecordDeleted, clearRecordDeletion, getDeletedRecordIds } from './deletionQueue';

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
/**
 * 이번 실행에서 지운 기록. 초기 동기화가 서버 목록을 받아 정리하는 사이에 지우면, 서버에선 이미 지워져
 * 삭제 표시도 풀린 뒤라 받아 둔 옛 목록이 그 기록을 되살렸다. 정리 직전에 여기 있는 것도 뺀다.
 */
const deletedThisSession = new Set<string>();

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
      if (res.ok) { delete snapshot[id]; clearRecordDeletion(KEY, id); }
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

/**
 * 커스텀 기록 하나를 지운다. 기본 기록(묵상·기도 등)의 remove 와 같은 방식이다:
 * 삭제 표시를 남기고, 로컬에서 빼고, 서버에 바로 지우라고 보낸다. 서버가 받으면 표시를 지운다.
 * 전에는 로컬에서만 빼고 동기화가 알아서 지우길 기다렸는데, 동기화가 준비되기 전에 지우면
 * 서버 기록이 다시 내려와 되살아났고, 준비에 실패한 세션에서는 서버에 아예 전달되지 않았다.
 */
export function deleteCustomRecord(id: string): void {
  deletedThisSession.add(id);
  markRecordDeleted(KEY, id);
  writeLocal(readLocal().filter(r => r?.id !== id));
  window.dispatchEvent(new Event('recordsUpdated'));
  fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
    .then(res => { if (res.ok) { delete snapshot[id]; clearRecordDeletion(KEY, id); } })
    .catch(() => { /* 표시가 남아 다음 동기화 때 다시 지운다 */ });
}

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
  // 지웠다고 표시된 기록은 클라우드에 남아 있어도 되살리지 않고, 다시 지운다.
  // 동기화가 준비되기 전(로그인 직후)이나 실패한 세션에서 지운 기록이 다음 로그인 때 되살아나던 것을 막는다.
  const tombstoned = new Set<string>();
  for (const id of getDeletedRecordIds(KEY)) {
    delete byId[id];
    if (!cloud.some(r => r.id === id)) { clearRecordDeletion(KEY, id); continue; }
    try {
      const res = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include', signal: controller.signal });
      if (controller.signal.aborted || version !== runVersion) return;
      if (res.ok) { clearRecordDeletion(KEY, id); tombstoned.add(id); }
    } catch {
      // 실패하면 표시를 남긴다. 아래 스냅샷에 남아 pushChanges 가 다시 지운다.
    }
  }
  // 위에서 기다리는 동안(서버 응답 읽기, 삭제 재전송) 지운 기록도 뺀다. 삭제 표시는 즉시 삭제가 성공하면
  // 이미 풀렸을 수 있어서, 이번 실행에서 지운 목록을 함께 본다.
  for (const id of deletedThisSession) delete byId[id];
  for (const id of getDeletedRecordIds(KEY)) delete byId[id];
  writeLocal(Object.values(byId));

  snapshot = {};
  cloud.forEach(r => { if (!tombstoned.has(r.id)) snapshot[r.id] = JSON.stringify(r); });

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
