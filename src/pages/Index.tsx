import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Leaf, Flame, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import { BottomNav } from '@/components/BottomNav';
import { CategoryManager } from '@/components/CategoryManager';
import { UserMenu } from '@/components/UserMenu';
import { getAllRecords, hasRecordOnDate } from '@/utils/recordsQuery';
import { RecordCard } from '@/components/RecordCard';
import { getTodayGoalCount, getStreakDays } from '@/utils/recordsQuery';
import { toLocalDateString } from '@/utils/dateHelpers';
import * as categoryStorage from '@/utils/categoryStorage';

type Category = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
  description?: string;
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

  // 온보딩 체크
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (!onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  // 기본 카테고리
  const defaultCategories = [
    { id: '1', name: 'Q.T', color: '#7DB87D', icon: 'bookOpen' as IconName, description: '말씀을 묵상하며 은혜를 나눠요', path: '/meditation/new', listPath: '/meditation' },
    { id: '2', name: '기도', color: '#A57DB8', icon: 'heart' as IconName, description: '하루의 기도를 적어보세요', path: '/prayer/new', listPath: '/prayer' },
    { id: '3', name: '감사', color: '#E8C87D', icon: 'sparkles' as IconName, description: '감사했던 순간을 떠올려보세요', path: '/gratitude/new', listPath: '/gratitude' },
    { id: '4', name: '일기', color: '#DD957D', icon: 'pencilLine' as IconName, description: '오늘의 마음을 기록해보세요', path: '/diary/new', listPath: '/diary' },
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
      '하루를 Q.T로 시작해보세요 ✨',
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
    <div className="min-h-screen bg-[#FAF9F7] pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-[#F0EFED]">
        <div className="max-w-[480px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Goal Progress */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7DB87D]/10">
              <Leaf className="w-4 h-4 text-[#7DB87D]" strokeWidth={2} />
              <span className="text-sm font-semibold text-[#7DB87D]">
                {goalProgress.completed}/{goalProgress.total}
              </span>
            </div>
            
            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF6B6B]/10">
              <Flame className="w-4 h-4 text-[#FF6B6B]" strokeWidth={2} />
              <span className="text-sm font-semibold text-[#FF6B6B]">{streakDays}일</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Menu */}
            <UserMenu />
          </div>
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
                      ? 'bg-gradient-to-b from-[#7DB87D] to-[#6BA96B] shadow-md scale-105'
                      : selected
                      ? 'border-2 border-[#7DB87D] bg-white'
                      : 'border border-[#F0EFED] bg-white hover:bg-[#F9F8F6]'
                  }`}
                >
                  <span className={`text-[10px] ${selected && hasRecord ? 'text-white/90' : 'text-[#ACACAC]'}`}>
                    {dayLabel}
                  </span>
                  <span className={`text-base font-medium ${selected && hasRecord ? 'text-white font-semibold' : 'text-[#2E2E2E]'}`}>
                    {date.getDate()}
                  </span>
                  {hasRecord && (
                    <div className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-[#7DB87D]'}`} />
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

        {/* 루틴 섹션 - 2열 그리드 */}
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-[#ACACAC] tracking-wide mb-4">
            MY ROUTINE
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {allCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="relative aspect-square rounded-[20px] p-5 flex flex-col justify-between transition-all active:scale-95 shadow-sm hover:shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${category.color} 0%, ${category.color}DD 100%)`,
                }}
              >
                {/* 상단 영역: 아이콘과 제목 */}
                <div className="flex items-start gap-3">
                  {/* 아이콘 */}
                  <div className="w-12 h-12 rounded-xl bg-white/25 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                    {category.icon ? (
                      <AppIcon name={category.icon} size={22} color="#fff" strokeWidth={2} />
                    ) : (
                      <span className="text-white text-[18px] font-semibold">
                        {category.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* 제목 */}
                  <h3 className="text-[19px] font-bold text-white leading-tight pt-1">
                    {category.name}
                  </h3>
                </div>

                {/* 하단 영역: 설명 */}
                <div className="text-left">
                  <p className="text-[12px] text-white/70 leading-snug line-clamp-2">
                    {category.description || `${category.name}을 기록하세요`}
                  </p>
                </div>
              </button>
            ))}

            {/* 카테고리 추가 버튼 */}
            <button
              onClick={() => setShowCategoryManager(true)}
              className="aspect-square rounded-[20px] border-2 border-dashed border-[#E8E7E5] bg-white flex flex-col items-center justify-center gap-3 transition-all hover:bg-[#F9F8F6] hover:border-[#7DB87D]/30 active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-[#F9F8F6] flex items-center justify-center">
                <Plus className="w-6 h-6 text-[#ACACAC]" strokeWidth={2} />
              </div>
              <span className="text-[14px] font-medium text-[#ACACAC]">
                카테고리 추가
              </span>
            </button>
          </div>
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
                className="text-[12px] text-[#7DB87D] font-medium"
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
