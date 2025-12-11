import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import { BottomNav } from '@/components/BottomNav';
import { hasRecordOnDate } from '@/utils/recordsQuery';
import { toLocalDateString } from '@/utils/dateHelpers';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
  description?: string;
};

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState(dateParam ? new Date(dateParam) : new Date());

  // URL 파라미터로부터 날짜 초기화
  useEffect(() => {
    if (dateParam) {
      setSelectedDate(new Date(dateParam));
    }
  }, [dateParam]);

  // 기본 카테고리
  const defaultCategories = [
    { id: '1', name: 'Q.T', color: '#7DB87D', icon: 'bookOpen' as IconName, path: '/meditation/new', type: 'meditation' as const },
    { id: '2', name: '기도', color: '#A57DB8', icon: 'heart' as IconName, path: '/prayer/new', type: 'prayer' as const },
    { id: '3', name: '감사', color: '#E8C87D', icon: 'sparkles' as IconName, path: '/gratitude/new', type: 'gratitude' as const },
    { id: '4', name: '일기', color: '#DD957D', icon: 'pencilLine' as IconName, path: '/diary/new', type: 'diary' as const },
  ];

  // 캘린더 함수들
  const handlePrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
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

  return (
    <div className="min-h-screen bg-[#FAF9F7] pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-[#F0EFED]">
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
                const hasRecord = hasRecordOnDate(dateStr);
                const currentMonth = isCurrentMonth(date);

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedDate(date);
                      // Always navigate to filtered archive
                      navigate(`/records?date=${dateStr}`);
                    }}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${
                      selected && todayDate && hasRecord
                        ? 'bg-[#7DB87D] text-white font-semibold'
                        : selected && todayDate
                        ? 'bg-[#2E2E2E] text-white font-semibold'
                        : selected && hasRecord
                        ? 'bg-[#7DB87D] text-white font-semibold'
                        : selected
                        ? 'bg-[#F9F8F6] text-[#2E2E2E] font-medium'
                        : todayDate && hasRecord
                        ? 'bg-[#7DB87D] text-white font-semibold'
                        : todayDate
                        ? 'bg-[#2E2E2E] text-white font-semibold'
                        : hasRecord
                        ? 'text-[#2E2E2E] hover:bg-[#F9F8F6] font-medium'
                        : currentMonth
                        ? 'text-[#2E2E2E] hover:bg-[#F9F8F6]'
                        : 'text-[#D0D0D0]'
                    }`}
                  >
                    <span className="text-[15px]">{date.getDate()}</span>
                    {hasRecord && (
                      <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${
                        selected || todayDate ? 'bg-white' : 'bg-[#7DB87D]'
                      }`} />
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
            <div className="flex gap-2 overflow-x-auto pb-2">
              {defaultCategories.map((category) => {
                const selectedDateStr = toLocalDateString(selectedDate);
                const hasRecordForType = hasRecordOnDate(selectedDateStr, category.type);

                return (
                  <button
                    key={category.id}
                    onClick={() => navigate(category.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                      hasRecordForType ? 'shadow-md' : 'opacity-50'
                    }`}
                    style={{
                      backgroundColor: `${category.color}${hasRecordForType ? '20' : '10'}`,
                      border: `1px solid ${category.color}${hasRecordForType ? '40' : '20'}`
                    }}
                  >
                    <AppIcon name={category.icon} size={16} color={category.color} strokeWidth={2} />
                    <span className="text-[14px] font-medium" style={{ color: category.color }}>
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Calendar;
