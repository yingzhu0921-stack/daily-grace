import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Leaf, Plus, ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from 'lucide-react';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import { BottomNav } from '@/components/BottomNav';
import { CategoryManager } from '@/components/CategoryManager';
import { UserMenu } from '@/components/UserMenu';
import { getAllRecords, hasRecordOnDate, getRecordCounts } from '@/utils/recordsQuery';
import { RecordCard } from '@/components/RecordCard';
import { getTodayGoalCount, getStreakDays } from '@/utils/recordsQuery';
import { toLocalDateString as toLocal } from '@/utils/dateHelpers';
import { toLocalDateString } from '@/utils/dateHelpers';
import * as categoryStorage from '@/utils/categoryStorage';

type Category = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
  description?: string;
  iconBg?: string;
  iconColor?: string;
  cardBg?: string;
  titleColor?: string;
  subColor?: string;
};

const IndexNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [goalProgress, setGoalProgress] = useState({ completed: 0, total: 4 });
  const [streakDays, setStreakDays] = useState(0);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const todayCounts = getRecordCounts(toLocal(new Date()));

  // 온보딩 체크
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (!onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  // 기본 카테고리
  const defaultCategories = [
    { id: '1', name: 'Q.T', color: '#4F8A5B', icon: 'bookOpen' as IconName, description: '말씀을 묵상하며 은혜를 나눠요', path: '/meditation/new', listPath: '/meditation' },
    { id: '2', name: '기도', color: '#7A6BB8', icon: 'heart' as IconName, description: '하루의 기도를 적어보세요', path: '/prayer/new', listPath: '/prayer' },
    { id: '3', name: '감사', color: '#C89B3C', icon: 'star' as IconName, description: '감사했던 순간을 떠올려보세요', path: '/gratitude/new', listPath: '/gratitude' },
    { id: '4', name: '일기', color: '#D97B5D', icon: 'pencilLine' as IconName, description: '오늘의 마음을 기록해보세요', path: '/diary/new', listPath: '/diary' },
  ];

  // Goal/Streak 계산
  useEffect(() => {
    const updateStats = () => {
      const goal = getTodayGoalCount();
      setGoalProgress(goal);
      setStreakDays(getStreakDays());
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  // 최신 기록 로드
  useEffect(() => {
    const records = getAllRecords().slice(0, 5); // 최신 5개
    setRecentRecords(records);
  }, []);

  // 커스텀 카테고리 로드
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        console.log('📂 Loading custom categories...');

        // 먼저 캐시된 데이터를 즉시 표시
        const cached = sessionStorage.getItem('custom_categories');
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            setCustomCategories(cachedData);
            console.log('⚡ Loaded from cache:', cachedData);
          } catch (e) {
            console.error('Cache parse error:', e);
          }
        }

        // 백그라운드에서 최신 데이터 가져오기
        const dbCategories = await categoryStorage.list();
        console.log('✅ Loaded categories from DB:', dbCategories);

        // user_id가 있는 것만 커스텀 카테고리 (기본 카테고리는 user_id가 null)
        const customs = dbCategories.filter((cat: any) => cat.user_id != null);
        console.log('🎯 Custom categories filtered:', customs);

        // 캐시 업데이트
        sessionStorage.setItem('custom_categories', JSON.stringify(customs));
        setCustomCategories(customs);
      } catch (error) {
        console.error('❌ Failed to load custom categories on Index page:', error);
      }
    };

    loadCustomCategories();

    const handleCategoriesUpdated = () => {
      console.log('🔄 Categories updated event received');
      loadCustomCategories();
    };

    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);
    return () => window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
  }, []);

  // 추천 메시지 생성
  const getRecommendationMessage = () => {
    const messages = [
      '오늘은 감사를 먼저 기록해볼까요?',
      '하루를 Q.T로 시작해보세요',
      '기도 제목을 적어볼까요?',
      '오늘의 마음을 일기로 남겨보세요',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // 카테고리 카드 클릭 핸들러 - 보관함/상세 페이지로 이동
  const handleCategoryClick = (category: any) => {
    // 커스텀 카테고리인 경우 sessionStorage에 캐시 저장 (빠른 로딩)
    if (!category.listPath) {
      sessionStorage.setItem(`category_${category.id}`, JSON.stringify(category));
    }

    if (category.listPath) {
      // 기본 카테고리는 listPath로 이동 (예: /meditation, /prayer)
      navigate(category.listPath);
    } else {
      // 커스텀 카테고리는 /custom/:id 경로로 이동
      navigate(`/custom/${category.id}`);
    }
  };

  // 캘린더 함수들
  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getWeekDays = () => {
    const days = [];
    const current = new Date(selectedDate);

    // 선택된 날짜를 중심으로 좌우 3일씩 (총 7일)
    for (let i = -3; i <= 3; i++) {
      const date = new Date(current);
      date.setDate(current.getDate() + i);
      days.push(date);
    }

    return days;
  };

  const weekDays = getWeekDays();
  const today = new Date();
  const isToday = (date: Date) => date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  const isSelected = (date: Date) => date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();

  // 모든 카테고리 합치기
  const allCategories = [...defaultCategories, ...customCategories];

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-[#EDEDED]">
        <div className="max-w-[480px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Goal Progress */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E0E0E0] bg-white">
              <Leaf className="w-3.5 h-3.5 text-[#1F1F1F] flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[12px] font-medium text-[#1F1F1F]">{goalProgress.completed}/{goalProgress.total} 완료</span>
            </div>

            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E0E0E0] bg-white">
              <span className="text-[11px] text-[#7A7A7A]">{streakDays}일 연속</span>
            </div>
          </div>

          <UserMenu />
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-6">
        {/* 캘린더 섹션 */}
        <section className="py-6">
          {/* 날짜 헤더 */}
          <div className="flex items-end gap-3 mb-4">
            <h2 className="text-[32px] font-semibold text-[#2E2E2E] leading-none tracking-tight">
              {selectedDate.getDate()}
            </h2>
            <span className="text-[15px] text-[#8B8B8B] pb-1">
              {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
            </span>
          </div>

          {/* 캘린더 컨트롤 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-full border border-[#E8E7E5] bg-white text-[12px] font-medium text-[#6B6B6B] hover:bg-[#F9F8F6] transition-colors"
            >
              오늘로 이동
            </button>
            <div className="flex gap-2">
              <button
                onClick={handlePrevWeek}
                className="w-8 h-8 rounded-full border border-[#E8E7E5] bg-white flex items-center justify-center hover:bg-[#F9F8F6] transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[#6B6B6B]" />
              </button>
              <button
                onClick={handleNextWeek}
                className="w-8 h-8 rounded-full border border-[#E8E7E5] bg-white flex items-center justify-center hover:bg-[#F9F8F6] transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>
          </div>

          {/* 주간 캘린더 */}
          <div className="flex gap-2">
            {weekDays.map((date, index) => {
              const selected = isSelected(date);
              const todayDate = isToday(date);
              const dateStr = toLocalDateString(date);
              const hasRecord = hasRecordOnDate(dateStr);
              const dayOfWeek = date.getDay();
              const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek];

              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedDate(date);
                    // 항상 캘린더 페이지로 이동하도록 수정
                    navigate(`/calendar?date=${dateStr}`);
                  }}
                  className={`flex-1 min-w-0 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    selected && hasRecord
                      ? 'bg-[#1F1F1F] shadow-sm scale-105'
                      : selected
                      ? 'border-2 border-[#1F1F1F] bg-white'
                      : 'border border-[#EDEDED] bg-white hover:bg-[#F5F5F5]'
                  }`}
                >
                  <span className={`text-[10px] ${selected ? 'text-[#7A7A7A]' : 'text-[#ACACAC]'} ${selected && hasRecord ? '!text-white/70' : ''}`}>
                    {dayLabel}
                  </span>
                  <span className={`text-base font-medium ${selected && hasRecord ? 'text-white font-semibold' : 'text-[#1F1F1F]'}`}>
                    {date.getDate()}
                  </span>
                  {hasRecord && (
                    <div className={`w-1 h-1 rounded-full ${selected && hasRecord ? 'bg-white/60' : 'bg-[#1F1F1F]/30'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 구분선 */}
        <div className="h-px bg-[#EDEDED] mb-6" />

        {/* 추천 메시지 */}
        <div className="pb-4">
          <p className="text-[15px] text-[#7C7C7C] font-medium">
            {getRecommendationMessage()}
          </p>
        </div>

        {/* 말씀카드 배너 */}
        <div
          className="rounded-2xl p-5 mb-6 cursor-pointer transition-all flex items-center justify-between active:scale-[0.99] bg-white"
          style={{ border: '1px solid #EFEFEF' }}
          onClick={() => navigate('/cards/designer')}
        >
          <div>
            <p className="text-[11px] font-medium text-[#4F8A5B] mb-1 tracking-wide">카드 만들기</p>
            <h3 className="text-[15px] font-semibold text-[#1F1F1F] mb-1">오늘의 말씀, 카드로 남겨볼까요?</h3>
            <p className="text-[12px] text-[#7A7A7A]">AI 자동 완성 · 직접 꾸미기</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#ACACAC] flex-shrink-0" />
        </div>

        {/* 루틴 섹션 - 2열 그리드 */}
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-[#ACACAC] tracking-wide mb-4">
            MY ROUTINE
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {allCategories.map((category) => {
              const isDone =
                category.id === '1' ? todayCounts.meditation > 0 :
                category.id === '2' ? todayCounts.prayer > 0 :
                category.id === '3' ? todayCounts.gratitude > 0 :
                category.id === '4' ? todayCounts.diary > 0 : false;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="relative h-[120px] rounded-[24px] p-4 flex flex-col justify-between transition-all active:scale-[0.97] overflow-hidden bg-white text-left"
                  style={{ border: '1px solid #EFEFEF' }}
                >
                  {/* 상단 Accent Line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{ backgroundColor: isDone ? category.color : `${category.color}60`, borderRadius: '24px 24px 0 0' }}
                  />
                  {/* 완료 체크 */}
                  {isDone && (
                    <div className="absolute top-3 right-3">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke={category.color} strokeWidth="1.2"/>
                        <path d="M5 8L7 10L11 6" stroke={category.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  {/* 아이콘 */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    {category.icon ? (
                      <AppIcon name={category.icon} size={17} color={category.color} strokeWidth={1.5} />
                    ) : (
                      <span style={{ color: category.color }} className="text-[13px] font-semibold">
                        {category.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  {/* 텍스트 */}
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#1F1F1F] leading-tight">
                      {category.name}
                    </h3>
                    <p className="text-[11px] text-[#7A7A7A] mt-0.5 line-clamp-1">
                      {isDone ? '오늘 완료' : (category.description || `${category.name}을 기록하세요`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 카테고리 추가 버튼 */}
          <button
            onClick={() => setShowCategoryManager(true)}
            className="w-full py-3 rounded-[20px] border border-dashed border-[#DCDCDC] text-[13px] font-medium text-[#ACACAC] flex items-center justify-center gap-2 transition-all hover:bg-white hover:border-[#ACACAC] active:scale-95"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            카테고리 추가
          </button>
        </section>

        {/* 최신 기록 섹션 */}
        {recentRecords.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-[#ACACAC] tracking-wide">
                RECENT RECORDS
              </h2>
              <button
                onClick={() => navigate('/records')}
                className="text-[12px] text-[#7A7A7A] font-medium"
              >
                전체보기 →
              </button>
            </div>

            <div className="space-y-3">
              {recentRecords.map((record) => (
                <RecordCard key={record.id} {...record} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* 카테고리 관리 모달 */}
      <CategoryManager open={showCategoryManager} onClose={() => setShowCategoryManager(false)} />
    </div>
  );
};

export default IndexNew;
