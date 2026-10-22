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

function readLocal(key: string): SyncRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(item => item?.id) : [];
  } catch {
    return [];
  }
}

export function useDataSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const syncingRef = useRef(false);

  const loadFromCloud = useCallback(async (signal?: AbortSignal) => {
    if (!user || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
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
            const response = await fetch(`${resource.endpoint}/${encodeURIComponent(id)}`, {
              method: 'DELETE',
              credentials: 'include',
              signal,
            });
            if (!response.ok) throw new Error(`${resource.key} 삭제 동기화 실패`);
          }
          clearRecordDeletion(resource.key, id);
        }

        for (const record of local) {
          const remote = cloudById.get(record.id);
          if (!remote || recordTime(record) > recordTime(remote)) {
            merged.set(record.id, record);
            const url = remote ? `${resource.endpoint}/${encodeURIComponent(record.id)}` : resource.endpoint;
            const response = await fetch(url, {
              method: remote ? 'PUT' : 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(record),
              signal,
            });
            if (!response.ok) throw new Error(`${resource.key} 동기화 실패`);
            if (signal?.aborted) return;
          }
        }

        if (signal?.aborted) return;
        const ordered = [...merged.values()].sort((a, b) => recordTime(b) - recordTime(a));
        localStorage.setItem(resource.key, JSON.stringify(ordered));
      }
      if (signal?.aborted) return;
      window.dispatchEvent(new Event('recordsUpdated'));
      setLastSyncAt(new Date());
    } catch (err) {
      if (!signal?.aborted) console.error('D1 sync failed:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const sync = () => loadFromCloud(controller.signal).catch(error => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.error(error);
    });
    sync();
    window.addEventListener('online', sync);
    return () => {
      controller.abort();
      window.removeEventListener('online', sync);
    };
  }, [user, loadFromCloud]);

  return { isSyncing, lastSyncAt };
}
