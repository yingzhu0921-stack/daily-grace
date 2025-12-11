import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Leaf, Flame, Plus } from 'lucide-react';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import { BottomNav } from '@/components/BottomNav';
import { CategoryManager } from '@/components/CategoryManager';
import { UserMenu } from '@/components/UserMenu';
import { getAllRecords } from '@/utils/recordsQuery';
import { RecordCard } from '@/components/RecordCard';
import { getTodayGoalCount, getStreakDays } from '@/utils/recordsQuery';

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

  // 카테고리 카드 클릭 핸들러
  const handleCategoryClick = (category: any) => {
    if (category.path) {
      navigate(category.path);
    } else {
      navigate(`/custom/${category.id}/new`);
    }
  };

  // 모든 카테고리 합치기
  const allCategories = [...defaultCategories, ...customCategories];

  return (
    <div className="min-h-screen bg-[#FAF9F7] pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-[#F0EFED]">
        <div className="max-w-[480px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-[#2E2E2E]">Daily Grace</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Goal Progress */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7DB87D]/10">
              <Leaf className="w-4 h-4 text-[#7DB87D]" strokeWidth={2} />
              <span className="text-sm font-semibold text-[#7DB87D]">
                {goalProgress.completed}/{goalProgress.total}
              </span>
            </div>

            {/* Streak Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF6B6B]/10">
              <Flame className="w-4 h-4 text-[#FF6B6B]" strokeWidth={2} />
              <span className="text-sm font-semibold text-[#FF6B6B]">{streakDays}일</span>
            </div>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-6">
        {/* 추천 메시지 */}
        <div className="pt-6 pb-4">
          <p className="text-[15px] text-[#7C7C7C] font-medium">
            {getRecommendationMessage()}
          </p>
        </div>

        {/* 루틴 섹션 - 2열 그리드 */}
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-[#ACACAC] tracking-wide mb-4">
            MY ROUTINE
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {allCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="relative h-[140px] rounded-2xl p-4 flex flex-col justify-between transition-all active:scale-95 shadow-sm hover:shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${category.color} 0%, ${category.color}DD 100%)`,
                }}
              >
                {/* 아이콘 */}
                <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center backdrop-blur-sm">
                  {category.icon ? (
                    <AppIcon name={category.icon} size={20} color="#fff" strokeWidth={2} />
                  ) : (
                    <span className="text-white text-[18px] font-semibold">
                      {category.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* 카테고리 정보 */}
                <div>
                  <h3 className="text-[17px] font-bold text-white mb-1">
                    {category.name}
                  </h3>
                  <p className="text-[12px] text-white/80 leading-tight line-clamp-2">
                    {category.description || `${category.name}을 기록하세요`}
                  </p>
                </div>
              </button>
            ))}

            {/* 카테고리 추가 버튼 */}
            <button
              onClick={() => setShowCategoryManager(true)}
              className="h-[140px] rounded-2xl border-2 border-dashed border-[#E8E7E5] bg-white flex flex-col items-center justify-center gap-2 transition-all hover:bg-[#F9F8F6] hover:border-[#7DB87D]/30 active:scale-95"
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
