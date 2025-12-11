import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Menu, ChevronLeft, ChevronRight, BookOpen, Heart, Sparkles, PencilLine, Palette, Leaf, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AppDrawer } from '@/components/nav/AppDrawer';
import { AppIcon } from '@/components/ui/AppIcon';
import { CategoryManager } from '@/components/CategoryManager';
import { UserMenu } from '@/components/UserMenu';
import { hasRecordOnDate } from '@/utils/recordsQuery';
import { toLocalDateString } from '@/utils/dateHelpers';
const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [todayGoalCount, setTodayGoalCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Goal/Streak 계산
  useEffect(() => {
    const calculateGoalProgress = () => {
      const today = new Date().toISOString().split('T')[0];
      let completedCount = 0;

      // Check meditation (QT)
      const meditations = JSON.parse(localStorage.getItem('meditation_entries') || '[]');
      if (meditations.some((m: any) => m.createdAt?.startsWith(today))) completedCount++;

      // Check prayers
      const prayers = JSON.parse(localStorage.getItem('prayer_entries') || '[]');
      if (prayers.some((p: any) => p.createdAt?.startsWith(today))) completedCount++;

      // Check gratitude
      const gratitude = JSON.parse(localStorage.getItem('gratitude_entries') || '[]');
      if (gratitude.some((g: any) => g.createdAt?.startsWith(today))) completedCount++;

      // Check diary
      const diary = JSON.parse(localStorage.getItem('diary_entries') || '[]');
      if (diary.some((d: any) => d.createdAt?.startsWith(today))) completedCount++;

      setTodayGoalCount(completedCount);
    };

    const calculateStreak = () => {
      // Simple streak calculation - consecutive days with at least one entry
      const allEntries: any[] = [];
      ['meditation_entries', 'prayer_entries', 'gratitude_entries', 'diary_entries'].forEach(key => {
        const entries = JSON.parse(localStorage.getItem(key) || '[]');
        allEntries.push(...entries.map((e: any) => e.createdAt));
      });

      const uniqueDates = [...new Set(allEntries.map(d => d?.split('T')[0]))].sort().reverse();
      let streak = 0;
      const today = new Date();

      for (let i = 0; i < uniqueDates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        if (uniqueDates.includes(checkDateStr)) {
          streak++;
        } else {
          break;
        }
      }

      setCurrentStreak(streak);
    };

    calculateGoalProgress();
    calculateStreak();

    // Re-calculate when storage changes
    const handleStorageChange = () => {
      calculateGoalProgress();
      calculateStreak();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 온보딩 체크 - useEffect 내에서 처리
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
    if (!onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    } else {
      setIsCheckingOnboarding(false);
    }
  }, [navigate]);

  // 커스텀 카테고리 로드 - 모든 훅은 조건문 전에 위치해야 함
  useEffect(() => {
    const loadCustomCategories = () => {
      const saved = localStorage.getItem('custom_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        const customs = parsed.filter((cat: any) => !['1', '2', '3', '4'].includes(cat.id));
        setCustomCategories(customs);
      }
    };
    loadCustomCategories();

    window.addEventListener('categoriesUpdated', loadCustomCategories);
    return () => window.removeEventListener('categoriesUpdated', loadCustomCategories);
  }, []);
  
  // 온보딩 체크 중에는 아무것도 렌더링하지 않음 (모든 훅 호출 후)
  if (isCheckingOnboarding) {
    return null;
  }
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
  const journalCards = [{
    title: 'Q.T',
    description: '말씀을 묵상하며 은혜를 나눠요',
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #7DB87D 0%, #6BA96B 100%)',
    buttonColor: '#5A935A',
    path: '/meditation/new',
    listPath: '/meditation'
  }, {
    title: '기도',
    description: '하루의 기도를 적어보세요',
    icon: Heart,
    gradient: 'linear-gradient(135deg, #A57DB8 0%, #9569A8 100%)',
    buttonColor: '#875A99',
    path: '/prayer/new',
    listPath: '/prayer'
  }, {
    title: '감사',
    description: '감사했던 순간을 떠올려보세요',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #E8C87D 0%, #D9B66B 100%)',
    buttonColor: '#BFA557',
    path: '/gratitude/new',
    listPath: '/gratitude'
  }, {
    title: '일기',
    description: '오늘의 마음을 기록해보세요',
    icon: PencilLine,
    gradient: 'linear-gradient(135deg, #DD957D 0%, #CB836B 100%)',
    buttonColor: '#B97359',
    path: '/diary/new',
    listPath: '/diary'
  }];
  return <div className="min-h-screen bg-[#FAF9F7]">
      <div className="max-w-[480px] mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <button className="p-2">
                <Menu className="w-6 h-6 text-[#2E2E2E]" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <AppDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 flex items-center justify-center gap-4">
            {/* Goal Progress */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7DB87D]/10">
              <Leaf className="w-4 h-4 text-[#7DB87D]" />
              <span className="text-sm font-medium text-[#7DB87D]">{todayGoalCount}/4</span>
            </div>

            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF6B6B]/10">
              <Flame className="w-4 h-4 text-[#FF6B6B]" />
              <span className="text-sm font-medium text-[#FF6B6B]">{currentStreak}일</span>
            </div>
          </div>

          <UserMenu />
        </header>

        {/* Date Header */}
        <div className="px-5 pt-5 pb-3 flex items-end gap-3">
          <h1 className="text-[32px] font-semibold text-[#2E2E2E] leading-[48px] tracking-[-0.8px]">
            {selectedDate.getDate()}
          </h1>
          <span className="text-[15px] text-[#8B8B8B] pb-3">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
          </span>
        </div>

        {/* Week Calendar */}
        <div className="px-5 py-4">
          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#8B8B8B]">오늘</span>
              <button onClick={handleToday} className="px-3 py-1 rounded-full border border-[#E8E7E5] bg-white text-[12px] text-[#6B6B6B]">
                오늘로 이동
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrevWeek} className="w-8 h-8 rounded-full border border-[#E8E7E5] bg-white flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-[#6B6B6B]" />
              </button>
              <button onClick={handleNextWeek} className="w-8 h-8 rounded-full border border-[#E8E7E5] bg-white flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>
          </div>

          {/* Week Days */}
          <div className="flex gap-2">
            {weekDays.map((date, index) => {
            const selected = isSelected(date);
            const today = isToday(date);
            const dateStr = toLocalDateString(date);
            const hasRecord = hasRecordOnDate(dateStr);
            const dayOfWeek = date.getDay();
            const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek];
            return <button key={index} onClick={() => setSelectedDate(date)} className={`flex-1 min-w-0 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${selected ? 'bg-gradient-to-b from-[#7DB87D] to-[#6BA96B] shadow-md scale-105' : 'border border-[#F0EFED] bg-white'}`}>
                  <span className={`text-[10px] ${selected ? 'text-white/90' : 'text-[#ACACAC]'}`}>
                    {dayLabel}
                  </span>
                  <span className={`text-base font-medium ${selected ? 'text-white font-semibold' : 'text-[#2E2E2E]'}`}>
                    {date.getDate()}
                  </span>
                  {hasRecord && <div className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-[#7DB87D]'}`} />}
                </button>;
          })}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full px-5">
          <div className="h-px bg-[#EDEDED]" />
        </div>

        {/* Journal Cards */}
        <div className="px-5 py-6 space-y-3">
          {journalCards.map(card => {
          const Icon = card.icon;
          return <div key={card.title} className="relative h-[76px] rounded-[18px] flex items-center px-4 cursor-pointer" style={{
            background: card.gradient
          }} onClick={() => navigate(card.listPath)}>
                <div className="w-11 h-11 rounded-[14px] bg-white/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" strokeWidth={1.6} />
                </div>
                <div className="flex-1 px-3">
                  <h3 className="text-[17px] font-medium text-white">{card.title}</h3>
                  <p className="text-[13px] text-white/85">{card.description}</p>
                </div>
                <button onClick={e => {
              e.stopPropagation();
              navigate(card.path);
            }} className="px-5 py-2 rounded-full bg-white text-[13px] font-medium" style={{
              color: card.buttonColor
            }}>
                  기록하기
                </button>
              </div>;
        })}

          {/* 커스텀 카테고리 */}
          {customCategories.map(category => {
          const lighter = category.color + '15';
          return <div key={category.id} className="relative h-[76px] rounded-[18px] flex items-center px-4 cursor-pointer" style={{
            background: `linear-gradient(135deg, ${category.color} 0%, ${category.color}DD 100%)`
          }} onClick={() => navigate(`/custom/${category.id}`)}>
                <div className="w-11 h-11 rounded-[14px] bg-white/30 flex items-center justify-center">
                  {category.icon ? (
                    <AppIcon name={category.icon} size={20} color="#fff" strokeWidth={1.75} />
                  ) : (
                    <span className="text-white text-[16px] font-medium">
                      {category.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 px-3">
                  <h3 className="text-[17px] font-medium text-white">{category.name}</h3>
                  <p className="text-[13px] text-white/85">
                    {category.description || `${category.name}에 대해 기록해보세요`}
                  </p>
                </div>
                <button onClick={e => {
              e.stopPropagation();
              navigate(`/custom/${category.id}/new`);
            }} className="px-5 py-2 rounded-full bg-white text-[13px] font-medium" style={{
              color: category.color
            }}>
                  기록하기
                </button>
              </div>;
        })}

          {/* Add Category Button */}
          <button onClick={() => setShowCategoryManager(true)} className="w-full h-[60px] rounded-[18px] border border-[#E8E7E5] bg-white flex items-center justify-center gap-2 text-[#8B8B8B] hover:bg-[#F9F8F6] transition-colors">
            <span className="text-xl">+</span>
            <span className="text-[15px] font-medium">카테고리 추가</span>
          </button>
        </div>

        {/* Creative Section */}
        <div className="px-5 py-4 pb-8">
          <div className="text-center text-[13px] text-[#ACACAC] tracking-[0.2em] mb-4">
            CREATIVE
          </div>
          <div 
            onClick={() => navigate('/cards/vault')}
            style={{
              background: 'linear-gradient(135deg, #7B9AAC 0%, #6A8A9C 100%)'
            }} 
            className="h-[76px] rounded-[18px] flex items-center px-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-[14px] bg-white/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" strokeWidth={1.6} />
            </div>
            <div className="flex-1 px-3">
              <h3 className="text-[17px] font-medium text-white">말씀카드 만들기</h3>
              <p className="text-[13px] text-white/85">말씀과 기록으로 카드 만들어요</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/cards/designer');
              }} 
              className="px-5 py-2 rounded-full bg-white text-[#6A8A9C] text-[13px] font-medium hover:bg-white/90 transition-colors"
            >
              시작하기
            </button>
          </div>
        </div>
      </div>

      {/* 카테고리 관리 모달 */}
      <CategoryManager open={showCategoryManager} onClose={() => setShowCategoryManager(false)} />
    </div>;
};
export default Index;