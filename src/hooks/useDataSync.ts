import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { clearRecordDeletion, getDeletedRecordIds } from '@/utils/deletionQueue';

type SyncRecord = { id: string; createdAt?: string; updatedAt?: string; [key: string]: unknown };

const RESOURCES = [
  { key: 'meditations', endpoint: '/api/data/meditations' },
  { key: 'prayers', endpoint: '/api/data/prayers' },
  { key: 'gratitudes', endpoint: '/api/data/gratitudes' },
  { key: 'diaries', endpoint: '/api/data/diaries' },
] as const;

const recordTime = (record: SyncRecord) => Date.parse(record.updatedAt || record.createdAt || '') || 0;

/** 기록을 저장한 뒤 이만큼 기다렸다가 서버와 맞춰 본다. 연달아 저장하면 마지막 저장 기준으로 한 번만 돈다. */
const SYNC_AFTER_SAVE_MS = 3000;
/** 앱을 다시 화면에 띄웠을 때, 마지막 동기화가 이보다 최근이면 건너뛴다(앱 전환마다 요청하지 않게). */
const VISIBLE_SYNC_MIN_GAP_MS = 30_000;
/**
 * 동기화가 끝나며 쏘는 'recordsUpdated' 에 다는 표시. 이 표시가 붙은 신호로는 다시 동기화하지 않는다.
 * 훅 인스턴스마다 따로 거르면, 두 곳에서 훅을 쓸 때 서로의 신호를 받아 3초마다 번갈아 돌았다(Codex 검토).
 */
const CLOUD_SYNC_SOURCE = 'cloud-sync';

/**
 * 서버에 요청을 보낸다. 서버가 거절한 것(응답은 왔지만 실패)은 false 를 돌려주고,
 * 인터넷이 끊겨 응답 자체가 없으면 그대로 던져서 이번 동기화를 멈추게 한다.
 */
async function send(url: string, init: RequestInit): Promise<boolean> {
  const response = await fetch(url, { credentials: 'include', ...init });
  return response.ok;
}

function readLocal(key: string): SyncRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(item => item?.id) : [];
  } catch {
    return [];
  }
}

export function useDataSync() {
  const { user: authUser } = useAuth();
  // 개발용 로그인 우회로 들어온 가짜 사용자로는 동기화하지 않는다.
  // 브라우저에 진짜 세션 쿠키가 남아 있으면 서버는 실제 계정으로 응답하므로,
  // 그대로 두면 남의 클라우드 기록이 로컬에 합쳐진다.
  const user = authUser && authUser.auth_method !== 'dev-bypass' ? authUser : null;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const syncingRef = useRef(false);
  /** 동기화 중에 또 요청이 오면 끝난 뒤 한 번 더 돈다. 그 사이 저장한 기록을 놓치지 않게. */
  const pendingRef = useRef(false);
  /** 마지막으로 동기화를 끝낸 시각. 화면 복귀 때 너무 자주 돌지 않게 한다. */
  const lastSyncedRef = useRef(0);

  const loadFromCloud = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;
    if (syncingRef.current) { pendingRef.current = true; return; }
    syncingRef.current = true;
    setIsSyncing(true);
    // 서버가 거절한 기록 수. 전에는 한 건만 실패해도 동기화 전체가 멈췄고, 앱을 열 때마다 같은 곳에서 또 멈춰
    // 그 뒤 기록과 다른 종류 기록이 영영 올라가지 않았다(2026-11-10 점검). 이제는 그 기록만 건너뛴다.
    let rejected = 0;
    try {
      const responses = await Promise.all(RESOURCES.map(resource =>
        fetch(resource.endpoint, { credentials: 'include', signal })
      ));
      if (signal?.aborted) return;
      if (responses.some(response => !response.ok)) throw new Error('클라우드 기록을 불러오지 못했습니다.');
      const cloudLists = await Promise.all(responses.map(response => response.json() as Promise<SyncRecord[]>));

      for (let index = 0; index < RESOURCES.length; index++) {
        const resource = RESOURCES[index];
        const cloud = Array.isArray(cloudLists[index]) ? cloudLists[index] : [];
        const local = readLocal(resource.key);
        const cloudById = new Map(cloud.map(record => [record.id, record]));
        const merged = new Map(cloudById);

        // 오프라인에서 실패했던 삭제를 먼저 반영해 클라우드 기록이 되살아나지 않게 한다.
        for (const id of getDeletedRecordIds(resource.key)) {
          merged.delete(id);
          if (cloudById.has(id)) {
            const ok = await send(`${resource.endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE', signal });
            // 실패하면 삭제 표시를 남겨 다음에 다시 지운다. 화면에서는 이미 지운 상태로 둔다.
            if (!ok) { rejected++; continue; }
          }
          clearRecordDeletion(resource.key, id);
        }

        for (const record of local) {
          const remote = cloudById.get(record.id);
          if (!remote || recordTime(record) > recordTime(remote)) {
            merged.set(record.id, record);
            const url = remote ? `${resource.endpoint}/${encodeURIComponent(record.id)}` : resource.endpoint;
            const ok = await send(url, {
              method: remote ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(record),
              signal,
            });
            // 로컬 기록은 그대로 두고(merged 에 이미 들어 있다) 다음 기록으로 넘어간다.
            if (!ok) rejected++;
            if (signal?.aborted) return;
          }
        }

        if (signal?.aborted) return;
        // 위에서 서버를 기다리는 동안 사용자가 이 종류의 기록을 새로 쓰거나 지웠을 수 있다. 처음에 읽은 목록으로
        // 그대로 덮어쓰면 그 사이 저장한 기록이 사라졌다(Codex 검토). 덮어쓰기 직전에 다시 읽어 합친다.
        // - 그 사이 생기거나 더 최근에 고친 기록은 살리고, 서버에는 다음 동기화 때 올린다.
        // - 그 사이 지운 기록(삭제 표시)은 되살리지 않는다.
        for (const latest of readLocal(resource.key)) {
          const current = merged.get(latest.id);
          if (!current || recordTime(latest) > recordTime(current)) {
            merged.set(latest.id, latest);
            pendingRef.current = true;
          }
        }
        for (const id of getDeletedRecordIds(resource.key)) merged.delete(id);
        const ordered = [...merged.values()].sort((a, b) => recordTime(b) - recordTime(a));
        localStorage.setItem(resource.key, JSON.stringify(ordered));
      }
      if (signal?.aborted) return;
      window.dispatchEvent(new CustomEvent('recordsUpdated', { detail: { source: CLOUD_SYNC_SOURCE } }));
      lastSyncedRef.current = Date.now();
      setLastSyncAt(new Date());
      if (rejected) console.warn(`D1 sync: 서버가 거절한 기록 ${rejected}건은 건너뛰었습니다. 다음 동기화 때 다시 시도합니다.`);
    } catch (err) {
      // 이번 동기화를 통째로 멈추는 경우: 인터넷이 끊겨 응답이 없을 때, 처음 목록 네 개 중 하나라도 못 받았을 때
      // (빠진 목록으로 합치면 기록이 지워질 수 있어서), 응답을 읽거나 휴대폰에 쓰지 못했을 때.
      // 다시 연결되면 'online', 다음 저장이나 화면 복귀 때 다시 돈다.
      if (!signal?.aborted) console.error('D1 sync failed:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      if (pendingRef.current && !signal?.aborted) {
        pendingRef.current = false;
        void loadFromCloud(signal);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const sync = () => loadFromCloud(controller.signal).catch(error => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.error(error);
    });
    sync();
    // 저장 화면은 저장 즉시 서버로 한 번 보내지만, 실패해도 조용히 버렸다(다음에 앱을 열 때까지 휴대폰에만 남음).
    // 저장 뒤 잠시 기다렸다가 서버와 맞춰 보고, 앱을 다시 화면에 띄울 때도 맞춰 본다.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const syncSoon = (event: Event) => {
      if ((event as CustomEvent<{ source?: string }>).detail?.source === CLOUD_SYNC_SOURCE) return;
      clearTimeout(timer);
      timer = setTimeout(sync, SYNC_AFTER_SAVE_MS);
    };
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastSyncedRef.current < VISIBLE_SYNC_MIN_GAP_MS) return;
      sync();
    };
    window.addEventListener('online', sync);
    window.addEventListener('recordsUpdated', syncSoon);
    document.addEventListener('visibilitychange', syncWhenVisible);
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener('online', sync);
      window.removeEventListener('recordsUpdated', syncSoon);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, [user, loadFromCloud]);

  return { isSyncing, lastSyncAt };
}
