type DeletedRecords = Record<string, Record<string, string>>;

const KEY = 'dg_deleted_records';

function readQueue(): DeletedRecords {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeQueue(queue: DeletedRecords): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function markRecordDeleted(resource: string, id: string): void {
  const queue = readQueue();
  queue[resource] = { ...(queue[resource] || {}), [id]: new Date().toISOString() };
  writeQueue(queue);
}

export function clearRecordDeletion(resource: string, id: string): void {
  const queue = readQueue();
  if (!queue[resource]?.[id]) return;
  delete queue[resource][id];
  if (Object.keys(queue[resource]).length === 0) delete queue[resource];
  writeQueue(queue);
}

export function getDeletedRecordIds(resource: string): string[] {
  return Object.keys(readQueue()[resource] || {});
}
