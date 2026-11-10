import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import { BottomNav } from '@/components/BottomNav';
import { getAllRecords, type UnifiedRecord } from '@/utils/recordsQuery';
import { SwipeableRecordCard } from '@/components/SwipeableRecordCard';
import { routes } from '@/config/routes';
import { toLocalDateString } from '@/utils/dateHelpers';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
  description?: string;
};

/**
 * 'YYYY-MM-DD' 를 그 날의 0시(기기 시간대)로 읽는다. new Date('2026-11-08') 은 UTC 0시로 읽혀서
 * 한국보다 늦은 시간대에선 전날이 된다.
 */
function parseLocalDate(value: string | null): Date | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // 없는 날짜(2026-02-31 등)는 Date 가 다음 달로 넘겨 버린다. 그런 값은 받지 않는다.
  if (date.getMonth() !== Number(m[2]) - 1 || date.getDate() !== Number(m[3])) return null;
  return date;
}

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState(() => parseLocalDate(dateParam) ?? new Date());

  // URL 파라미터로부터 날짜 초기화
  useEffect(() => {
    const parsed = parseLocalDate(dateParam);
    if (parsed) setSelectedDate(parsed);
  }, [dateParam]);

  /**
   * 기록을 날짜별로 한 번만 묶는다. 전에는 달력 칸(최대 42개)마다 전체 기록을 다시 읽고 정렬했다.
   * 동기화나 다른 화면에서 기록이 바뀌면 'recordsUpdated' 가 온다 — 그때 다시 묶는다.
   */
  const [recordsVersion, setRecordsVersion] = useState(0);
  useEffect(() => {
    const onUpdate = () => setRecordsVersion(v => v + 1);
    window.addEventListener('recordsUpdated', onUpdate);
    return () => window.removeEventListener('recordsUpdated', onUpdate);
  }, []);
  const recordsByDate = useMemo(() => {
    const map = new Map<string, UnifiedRecord[]>();
    for (const r of getAllRecords()) {
      const list = map.get(r.date);
      if (list) list.push(r); else map.set(r.date, [r]);
    }
    return map;
    // recordsVersion 은 다시 묶으라는 신호다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsVersion]);

  /**
   * 날짜를 누르면 그 자리에서 고른다(2026-11-10 사용자 결정). 전에는 누르자마자 보관함으로 넘어가서
   * 아래의 날짜·기록 칸을 쓸 일이 없었다. 주소에도 남겨 두어, 기록을 열었다가 돌아와도 고른 날이 유지된다.
   */
  const selectDate = (date: Date) => {
    setSelectedDate(date);
    setSearchParams({ date: toLocalDateString(date) }, { replace: true });
  };

  // 기본 카테고리
  const defaultCategories = [
    { id: '1', name: 'Q.T', color: '#7DB87D', icon: 'bookOpen' as IconName, path: '/meditation/new', type: 'meditation' as const },
    { id: '2', name: '기도', color: '#A57DB8', icon: 'heart' as IconName, path: '/prayer/new', type: 'prayer' as const },
    { id: '3', name: '감사', color: '#E8C87D', icon: 'star' as IconName, path: '/gratitude/new', type: 'gratitude' as const },
    { id: '4', name: '일기', color: '#DD957D', icon: 'pencilLine' as IconName, path: '/diary/new', type: 'diary' as const },
  ];

  // 캘린더 함수들
  // 달을 옮길 때 날짜는 그 달의 마지막 날을 넘지 않게 한다. setMonth 로 옮기면 1월 31일 → '2월 31일' →
  // 3월 3일처럼 한 달을 건너뛰었다.
  const shiftMonth = (delta: number) => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth() + delta;
    const lastDay = new Date(y, m + 1, 0).getDate();
    selectDate(new Date(y, m, Math.min(selectedDate.getDate(), lastDay)));
  };
  const handlePrevMonth = () => shiftMonth(-1);
  const handleNextMonth = () => shiftMonth(1);

  const handleToday = () => {
    selectDate(new Date());
  };

  const getMonthDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    // 해당 월의 첫날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 첫 주의 시작 (일요일부터)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // 마지막 주의 끝 (토요일까지)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const monthDays = getMonthDays();
  const today = new Date();
  const isToday = (date: Date) => date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  const isSelected = (date: Date) => date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
  const isCurrentMonth = (date: Date) => date.getMonth() === selectedDate.getMonth();
  const selectedStr = toLocalDateString(selectedDate);
  const dayRecords = recordsByDate.get(selectedStr) ?? [];
  const selectedIsToday = isToday(selectedDate);
  const selectedIsFuture = selectedStr > toLocalDateString(today);
  const recordRoute: Record<string, string> = {
    meditation: routes.qt, prayer: routes.prayer, gratitude: routes.thanks, diary: routes.diary,
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-nav">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-[#EDEDED]">
        <div className="max-w-[480px] mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
          </button>

          <h1 className="text-base font-medium text-[#2E2E2E]">캘린더</h1>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-6">
        {/* 캘린더 섹션 */}
        <section className="py-6">
          {/* 캘린더 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-[24px] font-semibold text-[#2E2E2E]">
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-full border border-[#E8E7E5] bg-white flex items-center justify-center hover:bg-[#F9F8F6] transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[#6B6B6B]" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 rounded-full border border-[#E8E7E5] bg-white text-[12px] font-medium text-[#6B6B6B] hover:bg-[#F9F8F6] transition-colors"
              >
                오늘
              </button>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full border border-[#E8E7E5] bg-white flex items-center justify-center hover:bg-[#F9F8F6] transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>
          </div>

          {/* 월간 캘린더 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div key={index} className="text-center text-[13px] font-medium text-[#ACACAC] py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((date, index) => {
                const selected = isSelected(date);
                const todayDate = isToday(date);
                const dateStr = toLocalDateString(date);
                const hasRecord = recordsByDate.has(dateStr);
                const currentMonth = isCurrentMonth(date);

                return (
                  // 표시 규칙은 기록 유무와 상관없이 하나다: 고른 날 = 검정, 오늘 = 테두리, 기록 있음 = 점.
                  // 전에는 기록이 있으면 고른 날과 오늘이 둘 다 초록이라 무엇이 선택인지 구분이 안 됐다.
                  // hover 배경은 두지 않는다 — 아이폰에선 누른 뒤에도 회색 네모가 그대로 남았다.
                  <button
                    key={index}
                    onClick={() => selectDate(date)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-colors relative ${
                      selected
                        ? 'bg-[#2E2E2E] text-white font-semibold'
                        : todayDate
                        ? 'text-[#2E2E2E] font-semibold ring-[1.5px] ring-inset ring-[#2E2E2E]'
                        : currentMonth
                        ? 'text-[#2E2E2E]'
                        : 'text-[#D0D0D0]'
                    }`}
                  >
                    <span className="text-[15px]">{date.getDate()}</span>
                    {hasRecord && (
                      <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${selected ? 'bg-white' : 'bg-[#7DB87D]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 선택된 날짜 표시 및 카테고리 버튼 */}
          <div className="mt-6">
            <h3 className="text-[20px] font-semibold text-[#2E2E2E] mb-4">
              {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 {['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][selectedDate.getDay()]}
            </h3>
            {/* 오늘만 새로 쓸 수 있다. 지난 날은 몰아 쓰지 않게 하고(사용자 결정), 저장도 늘 오늘 날짜로 된다.
                그래서 지난 날·앞으로의 날에는 버튼을 숨기고 그날 기록만 보여 준다. */}
            {selectedIsToday && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {defaultCategories.map((category) => {
                  const existing = dayRecords.find(r => r.type === category.type);
                  return (
                    <button
                      key={category.id}
                      // 오늘 이미 쓴 종류면 그 기록을 연다. 전에는 기록이 있어도 늘 빈 새 작성 화면이 열렸다.
                      onClick={() => navigate(existing ? `${recordRoute[category.type]}/${existing.id}` : category.path)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap transition-colors"
                      style={{
                        backgroundColor: existing ? `${category.color}28` : '#FFFFFF',
                        border: `1px solid ${existing ? `${category.color}66` : '#E8E7E5'}`,
                      }}
                    >
                      <AppIcon name={category.icon} size={16} color={category.color} strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#2E2E2E]">{category.name}</span>
                      {existing && <span className="text-[11px]" style={{ color: category.color }}>완료</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {dayRecords.length > 0 ? (
              <>
                <div className="space-y-3">
                  {dayRecords.map((record) => (
                    <SwipeableRecordCard key={record.id} {...record} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/records?date=${selectedStr}`)}
                  className="mt-3 text-[12px] font-medium text-[#7A7A7A]"
                >
                  보관함에서 보기 →
                </button>
              </>
            ) : (
              <p className="text-[14px] text-[#ACACAC]">
                {selectedIsToday ? '아직 오늘의 기록이 없어요' : selectedIsFuture ? '아직 오지 않은 날이에요' : '이 날은 기록이 없어요'}
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Calendar;
