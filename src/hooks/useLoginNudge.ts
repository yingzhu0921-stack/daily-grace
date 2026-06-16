import { useEffect } from 'react';
import type { DGUser } from './useAuth';

export function useLoginNudge({
  user,
  loading,
  storageKey,
  show,
  delay = 500,
}: {
  user: DGUser | null;
  loading: boolean;
  storageKey: string;
  show: () => void;
  delay?: number;
}) {
  useEffect(() => {
    if (loading || user) return;
    if (sessionStorage.getItem(storageKey) === '1') return;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(storageKey, '1');
      show();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, loading, show, storageKey, user]);
}
