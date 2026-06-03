import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useDataSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    loadFromCloud().catch(console.error);
  }, [user?.id]);

  const loadFromCloud = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const [meditations, prayers, gratitudes, diaries] = await Promise.all([
        fetch('/api/data/meditations', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/data/prayers', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/data/gratitudes', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/data/diaries', { credentials: 'include' }).then(r => r.json()),
      ]);
      if (Array.isArray(meditations) && meditations.length) localStorage.setItem('meditations', JSON.stringify(meditations));
      if (Array.isArray(prayers) && prayers.length) localStorage.setItem('prayers', JSON.stringify(prayers));
      if (Array.isArray(gratitudes) && gratitudes.length) localStorage.setItem('gratitudes', JSON.stringify(gratitudes));
      if (Array.isArray(diaries) && diaries.length) localStorage.setItem('diaries', JSON.stringify(diaries));
      window.dispatchEvent(new Event('recordsUpdated'));
      setLastSyncAt(new Date());
    } catch (err) {
      console.error('D1 sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, lastSyncAt };
}
