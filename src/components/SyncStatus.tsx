import { useDataSync } from '@/hooks/useDataSync';
import { useAuth } from '@/hooks/useAuth';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

export function SyncStatus() {
  const { user } = useAuth();
  const { isSyncing, lastSyncAt } = useDataSync();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isSyncing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>동기화 중...</span>
        </>
      ) : lastSyncAt ? (
        <>
          <Cloud className="h-3 w-3 text-green-600" />
          <span>마지막 동기화: {lastSyncAt.toLocaleTimeString()}</span>
        </>
      ) : (
        <>
          <CloudOff className="h-3 w-3" />
          <span>동기화 대기 중</span>
        </>
      )}
    </div>
  );
}
