import * as meditationStorage from './meditationStorage';
import * as prayerStorage from './prayerStorage';
import * as gratitudeStorage from './gratitudeStorage';
import * as diaryStorage from './diaryStorage';
import { toLocalDateString } from './dateHelpers';

export type RecordType = 'meditation' | 'prayer' | 'gratitude' | 'diary';

export type UnifiedRecord = {
  id: string;
  type: RecordType;
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

  return [...meditations, ...prayers, ...gratitudes, ...diaries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRecordsByDate(dateStr: string): UnifiedRecord[] {
  return getAllRecords().filter(r => r.date === dateStr);
}

export function getTodayRecords(): UnifiedRecord[] {
  const today = toLocalDateString(new Date());
  return getRecordsByDate(today);
}

export function hasRecordOnDate(dateStr: string, type?: RecordType): boolean {
  const records = getRecordsByDate(dateStr);
  if (!type) return records.length > 0;
  return records.some(r => r.type === type);
}

export function searchRecords(query: string, types?: RecordType[]): UnifiedRecord[] {
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

export function getTodayGoalCount() {
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const todayDayOfWeek = today.getDay();
  const counts = getRecordCounts(todayStr);

  // 기본 카테고리 4개
  const defaultCategories = [
    { id: '1', name: 'QT', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: '2', name: '기도', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: '3', name: '감사', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: '4', name: '일기', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6] },
  ];

  // 커스텀 카테고리 가져오기 (sessionStorage 우선, 없으면 localStorage)
  let customCategories: any[] = [];
  const sessionSaved = sessionStorage.getItem('custom_categories');
  const localSaved = localStorage.getItem('custom_categories');

  if (sessionSaved) {
    try {
      customCategories = JSON.parse(sessionSaved);
    } catch (e) {
      console.error('Failed to parse custom_categories from sessionStorage:', e);
    }
  } else if (localSaved) {
    try {
      customCategories = JSON.parse(localSaved);
    } catch (e) {
      console.error('Failed to parse custom_categories from localStorage:', e);
    }
  }

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
  customCategories.forEach((cat: any) => {
    if (cat.includeInGoal !== false && isActiveToday(cat)) {
      // 커스텀 카테고리의 기록 확인 (localStorage의 custom_records에서)
      const customRecordsStr = localStorage.getItem('custom_records');
      if (customRecordsStr) {
        try {
          const customRecords = JSON.parse(customRecordsStr);
          // 오늘 날짜에 해당 카테고리의 기록이 있는지 확인
          const hasTodayRecord = customRecords.some((record: any) => {
            const recordDate = toDateKey(record.created_at || record.createdAt);
            return record.category_id === cat.id && recordDate === todayStr;
          });
          if (hasTodayRecord) completed++;
        } catch (e) {
          console.error('Failed to parse custom_records:', e);
        }
      }
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
  let currentDate = new Date(today);

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
