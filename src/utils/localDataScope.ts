const OWNER_KEY = 'dg_local_data_owner';
const GUEST_OWNER = 'guest';

// 사용자 기록과 연결되는 브라우저 저장소만 계정별로 격리한다.
const SCOPED_KEYS = [
  'meditations',
  'prayers',
  'gratitudes',
  'diaries',
  'custom_categories',
  'custom_records',
  'application_reminders',
  'dg_deleted_records',
] as const;

const cacheKey = (owner: string, key: string) => `dg_scoped:${owner}:${key}`;

function readArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeGuestValue(key: string, guestRaw: string | null, accountRaw: string | null): string | null {
  // 게스트 삭제 대기열은 어느 계정에도 적용하지 않는다.
  if (key === 'dg_deleted_records') return accountRaw;
  if (!guestRaw) return accountRaw;
  if (!accountRaw) return guestRaw;

  if (key === 'application_reminders') {
    try {
      return JSON.stringify({ ...JSON.parse(accountRaw), ...JSON.parse(guestRaw) });
    } catch {
      return accountRaw;
    }
  }

  const account = readArray(accountRaw);
  const guest = readArray(guestRaw);
  const byId = new Map<string, unknown>();
  for (const item of account) {
    if (item && typeof item === 'object' && 'id' in item) byId.set(String((item as { id: unknown }).id), item);
  }
  for (const item of guest) {
    if (item && typeof item === 'object' && 'id' in item) byId.set(String((item as { id: unknown }).id), item);
  }
  return JSON.stringify([...byId.values()]);
}

/**
 * 전역 키를 현재 로그인 사용자 전용 캐시로 전환한다.
 * 게스트 -> 계정 전환만 게스트 기록을 새 계정으로 가져온다.
 */
export function switchLocalDataScope(userId: string | null): void {
  const nextOwner = userId || GUEST_OWNER;
  const previousOwner = localStorage.getItem(OWNER_KEY) || GUEST_OWNER;
  if (previousOwner === nextOwner) {
    localStorage.setItem(OWNER_KEY, nextOwner);
    return;
  }

  const activeValues = new Map<string, string | null>();
  for (const key of SCOPED_KEYS) {
    const value = localStorage.getItem(key);
    activeValues.set(key, value);
    if (value !== null) localStorage.setItem(cacheKey(previousOwner, key), value);
    localStorage.removeItem(key);
  }

  for (const key of SCOPED_KEYS) {
    const targetValue = localStorage.getItem(cacheKey(nextOwner, key));
    const value = previousOwner === GUEST_OWNER && nextOwner !== GUEST_OWNER
      ? mergeGuestValue(key, activeValues.get(key) ?? null, targetValue)
      : targetValue;
    if (value !== null) localStorage.setItem(key, value);
  }

  if (previousOwner === GUEST_OWNER && nextOwner !== GUEST_OWNER) {
    for (const key of SCOPED_KEYS) localStorage.removeItem(cacheKey(GUEST_OWNER, key));
  }

  localStorage.setItem(OWNER_KEY, nextOwner);
  sessionStorage.removeItem('custom_categories');
  sessionStorage.removeItem('edit_card_id');
  sessionStorage.removeItem('edit_card_state');
  window.dispatchEvent(new Event('recordsUpdated'));
}

export function clearLocalDataForUser(userId: string): void {
  if (localStorage.getItem(OWNER_KEY) === userId) {
    for (const key of SCOPED_KEYS) localStorage.removeItem(key);
  }
  for (const key of SCOPED_KEYS) localStorage.removeItem(cacheKey(userId, key));
}
