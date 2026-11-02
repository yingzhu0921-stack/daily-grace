import * as meditationStorage from './meditationStorage';
import * as prayerStorage from './prayerStorage';
import * as gratitudeStorage from './gratitudeStorage';
import * as diaryStorage from './diaryStorage';
import { toLocalDateString } from './dateHelpers';

export type RecordType = 'meditation' | 'prayer' | 'gratitude' | 'diary';

export type UnifiedRecord = {
  id: string;
  /**
   * 기본 기록은 RecordType, 커스텀 기록은 '그 카테고리의 id'.
   * 보관함 종류 필터가 record.type 과 카테고리 id 를 직접 비교하기 때문이다.
   */
  type: RecordType | string;
  /** 커스텀 기록일 때만. 어느 카테고리의 기록인지 — 화면 이동과 이름표에 쓴다. */
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  title: string;
  content: string;
  createdAt: string;
  date: string;
};

function toDateKey(iso: string): string {
  // 로컬 타임존 기준으로 날짜 계산 (UTC 아님)
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAllRecords(): UnifiedRecord[] {
  const meditations = meditationStorage.list().map(m => ({
    id: m.id,
    type: 'meditation' as const,
    title: m.title || m.passage,
    content: m.content || m.application,
    createdAt: m.createdAt,
    date: toDateKey(m.createdAt),
  }));

  const prayers = prayerStorage.list().map(p => ({
    id: p.id,
    type: 'prayer' as const,
    title: p.title,
    content: p.content,
    createdAt: p.createdAt,
    date: toDateKey(p.createdAt),
  }));

  const gratitudes = gratitudeStorage.list().map(g => ({
    id: g.id,
    type: 'gratitude' as const,
    title: '감사 기록',
    content: g.items.join(', '),
    createdAt: g.createdAt,
    date: toDateKey(g.createdAt),
  }));

  const diaries = diaryStorage.listAll().map(d => ({
    id: d.id,
    type: 'diary' as const,
    title: '일기',
    content: d.content,
    createdAt: d.createdAt,
    date: toDateKey(d.createdAt),
  }));

  // 커스텀 기록(설교·찬양 등)도 같은 목록에 들어가야 한다.
  // 전에는 빠져 있어서 보관함의 종류 필터를 눌러도 늘 비었고,
  // '내 기록에서 가져오기' 에도 아예 나오지 않았다.
  const customs = readCustomRecords();

  return [...meditations, ...prayers, ...gratitudes, ...diaries, ...customs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** localStorage 의 커스텀 기록을 공통 모양으로 바꾼다. 저장 형식이 snake_case 와 섞여 있다. */
function readCustomRecords(): UnifiedRecord[] {
  let records: any[] = [];
  let categories: any[] = [];
  try { records = JSON.parse(localStorage.getItem('custom_records') || '[]'); } catch { /* 손상된 캐시는 없는 것으로 본다 */ }
  try {
    categories = JSON.parse(
      sessionStorage.getItem('custom_categories') || localStorage.getItem('custom_categories') || '[]',
    );
  } catch { /* 위와 같다 */ }
  const byId = new Map<string, any>(categories.map((c: any) => [c.id, c]));

  return records
    .map((r: any) => {
      const categoryId = r.categoryId || r.category_id;
      const createdAt = r.createdAt || r.created_at;
      if (!categoryId || !createdAt) return null;
      const cat = byId.get(categoryId);
      return {
        id: r.id,
        type: categoryId,
        categoryId,
        categoryName: cat?.name,
        categoryColor: cat?.color,
        // 제목이 없으면 본문·내용에서 끌어온다. 목록에 빈 줄이 남지 않게.
        title: r.title || cat?.name || '기록',
        content: r.content || r.passage || '',
        createdAt,
        date: toDateKey(createdAt),
      } as UnifiedRecord;
    })
    .filter((r): r is UnifiedRecord => r !== null);
}

export function getRecordsByDate(dateStr: string): UnifiedRecord[] {
  return getAllRecords().filter(r => r.date === dateStr);
}

export function getTodayRecords(): UnifiedRecord[] {
  const today = toLocalDateString(new Date());
  return getRecordsByDate(today);
}

export function hasRecordOnDate(dateStr: string, type?: RecordType | string): boolean {
  const records = getRecordsByDate(dateStr);
  if (!type) return records.length > 0;
  return records.some(r => r.type === type);
}

export function searchRecords(query: string, types?: (RecordType | string)[]): UnifiedRecord[] {
  const all = getAllRecords();
  const filtered = types ? all.filter(r => types.includes(r.type)) : all;
  
  if (!query.trim()) return filtered;
  
  const q = query.toLowerCase();
  return filtered.filter(r => 
    r.title.toLowerCase().includes(q) || 
    r.content.toLowerCase().includes(q)
  );
}

export function getRecordCounts(dateStr: string) {
  const records = getRecordsByDate(dateStr);
  return {
    meditation: records.filter(r => r.type === 'meditation').length,
    prayer: records.filter(r => r.type === 'prayer').length,
    gratitude: records.filter(r => r.type === 'gratitude').length,
    diary: records.filter(r => r.type === 'diary').length,
    total: records.length,
  };
}

export function getTodayGoalCount(passedCustomCategories?: any[]) {
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const todayDayOfWeek = today.getDay();
  const counts = getRecordCounts(todayStr);

  const defaultCategories = [
    { id: '1', name: 'QT', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: '2', name: '기도', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: '3', name: '감사', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: '4', name: '일기', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6] },
  ];

  const defaultIds = ['1', '2', '3', '4'];
  let customCategories: any[] = [];

  if (passedCustomCategories && passedCustomCategories.length > 0) {
    customCategories = passedCustomCategories;
  } else {
    const sessionSaved = sessionStorage.getItem('custom_categories');
    const localSaved = localStorage.getItem('custom_categories');

    if (sessionSaved) {
      try { customCategories = JSON.parse(sessionSaved); } catch (e) {}
    } else if (localSaved) {
      try { customCategories = JSON.parse(localSaved); } catch (e) {}
    }
  }

  customCategories = customCategories.filter((c: any) => !defaultIds.includes(c.id));

  // 모든 카테고리 합치기
  const allCategories = [...defaultCategories, ...customCategories];

  // 오늘 목표에 포함되는 카테고리만 필터링
  const goalCategories = allCategories.filter((c: any) => {
    const isInGoal = c.includeInGoal !== false;
    const activeDays = c.activeDays || [0, 1, 2, 3, 4, 5, 6];
    const isActiveToday = activeDays.includes(todayDayOfWeek);
    return isInGoal && isActiveToday;
  });

  const totalCategories = goalCategories.length;

  // 기본 카테고리 완료 체크
  let completed = 0;

  const cat1 = allCategories.find((c: any) => c.id === '1');
  const cat2 = allCategories.find((c: any) => c.id === '2');
  const cat3 = allCategories.find((c: any) => c.id === '3');
  const cat4 = allCategories.find((c: any) => c.id === '4');

  const isActiveToday = (cat: any) => {
    const activeDays = cat?.activeDays || [0, 1, 2, 3, 4, 5, 6];
    return activeDays.includes(todayDayOfWeek);
  };

  if (cat1?.includeInGoal !== false && isActiveToday(cat1) && counts.meditation > 0) completed++;
  if (cat2?.includeInGoal !== false && isActiveToday(cat2) && counts.prayer > 0) completed++;
  if (cat3?.includeInGoal !== false && isActiveToday(cat3) && counts.gratitude > 0) completed++;
  if (cat4?.includeInGoal !== false && isActiveToday(cat4) && counts.diary > 0) completed++;

  // 커스텀 카테고리 완료 체크
  const customRecordsStr = localStorage.getItem('custom_records');
  let customRecordsParsed: any[] = [];
  if (customRecordsStr) {
    try { customRecordsParsed = JSON.parse(customRecordsStr); } catch (e) {}
  }

  customCategories.forEach((cat: any) => {
    if (cat.includeInGoal !== false && isActiveToday(cat)) {
      const hasTodayRecord = customRecordsParsed.some((record: any) => {
        const recordDate = toDateKey(record.created_at || record.createdAt);
        return (record.category_id === cat.id || record.categoryId === cat.id) && recordDate === todayStr;
      });
      if (hasTodayRecord) completed++;
    }
  });

  return { completed, total: totalCategories };
}

export function getStreakDays(): number {
  const all = getAllRecords();
  if (all.length === 0) return 0;

  const dateMap = new Map<string, boolean>();
  all.forEach(r => dateMap.set(r.date, true));

  const today = new Date();
  let streak = 0;
  const currentDate = new Date(today);

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (!dateMap.has(dateStr)) break;
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

export function getMonthRecords(year: number, month: number) {
  const all = getAllRecords();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  
  return all.filter(r => r.date >= startDate && r.date <= endDate);
}
