import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { drawerMenu } from '@/config/menu';
import { routes } from '@/config/routes';
import { NavItem } from './NavItem';
import { CategoryManager } from '@/components/CategoryManager';
import { CircularProgress } from '@/components/CircularProgress';
import { getTodayGoalCount, getStreakDays } from '@/utils/recordsQuery';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { X, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AppDrawer: React.FC<AppDrawerProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCategoryManager, setShowCategoryManager] = React.useState(false);
  const [goalCount, setGoalCount] = React.useState({ completed: 0, total: 4 });
  const [streak, setStreak] = React.useState(0);

  React.useEffect(() => {
    const updateGoalCount = () => {
      setGoalCount(getTodayGoalCount());
      setStreak(getStreakDays());
    };

    updateGoalCount();
    window.addEventListener('categoriesUpdated', updateGoalCount);
    const interval = setInterval(updateGoalCount, 3000);
    
    return () => {
      window.removeEventListener('categoriesUpdated', updateGoalCount);
      clearInterval(interval);
    };
  }, []);

  const handleClose = () => {
    onOpenChange(false);
  };

  const renderMenuItem = (item: typeof drawerMenu[number], index: number) => {
    if (item.divider) {
      return <div key={`divider-${index}`} className="my-3 h-px bg-[#EDEDED]" />;
    }

    // 카테고리 관리는 특별 처리
    if (item.label === '카테고리 관리') {
      return (
        <NavItem
          key={`${item.label}-${index}`}
          label={item.label}
          icon={item.icon}
          href={undefined}
          disabled={false}
          highlighted={item.highlighted}
          iconColor={item.iconColor}
          onNavigate={() => {
            setShowCategoryManager(true);
            handleClose();
          }}
        />
      );
    }

    const href = item.route ? routes[item.route] : undefined;
    const isDisabled = item.disabled ?? false;
    const needsAuth = item.requiresAuth ?? false;
    const isBlocked = needsAuth && !user;

    return (
      <NavItem
        key={`${item.label}-${index}`}
        label={item.label}
        icon={item.icon}
        href={isBlocked ? undefined : href}
        disabled={isDisabled || isBlocked}
        indent={item.indent}
        accent={item.accent}
        highlighted={item.highlighted}
        iconColor={item.iconColor}
        onNavigate={handleClose}
      />
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[88vw] max-w-[360px] sm:w-[320px] p-0">
        <SheetHeader className="border-b border-[#EDEDED] px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <SheetTitle className="text-lg font-semibold text-[#2E2E2E]">메뉴</SheetTitle>
            <SheetClose asChild>
              <button className="p-1.5 rounded-lg hover:bg-[#F3F2F1] transition">
                <X size={20} className="text-[#8B8B8B]" />
              </button>
            </SheetClose>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[rgba(125,184,125,0.2)] flex items-center justify-center text-[rgba(125,184,125,1)] font-semibold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#2E2E2E] truncate">
                    {user.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-[#8B8B8B] truncate">{user.email}</div>
                </div>
              </div>
              {/* 통계 정보 */}
              <div className="bg-stone-50/60 rounded-2xl p-3.5 flex items-center gap-4">
                {/* 연속 기록 */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-9 h-9 rounded-full bg-[#7DB87D]/15 flex items-center justify-center">
                    <Sprout className="w-[18px] h-[18px] text-[#7DB87D]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8B8B8B]">연속기록</div>
                    <div className="text-[15px] font-semibold text-[#4A4A4A]">{streak}일</div>
                  </div>
                </div>

                {/* 오늘 목표 - 원형 프로그레스 */}
                <div className="flex items-center gap-3 flex-1">
                  <CircularProgress 
                    completed={goalCount.completed} 
                    total={goalCount.total}
                    size={48}
                    strokeWidth={3.5}
                  />
                  <div>
                    <div className="text-[11px] text-[#8B8B8B]">오늘 목표</div>
                    <div className={`text-[15px] font-semibold ${
                      goalCount.total > 0 && goalCount.completed === goalCount.total 
                        ? 'text-[#7DB87D]' 
                        : 'text-[#4A4A4A]'
                    }`}>
                      {goalCount.completed}/{goalCount.total}
                      {goalCount.total > 0 && goalCount.completed === goalCount.total && (
                        <span className="ml-1">완료</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#7E7C78]">
                저장/동기화는 로그인 후
              </p>
              <Button
                onClick={() => {
                  navigate('/auth');
                  onOpenChange(false);
                }}
                className="w-full bg-[rgba(125,184,125,1)] hover:bg-[rgba(115,174,115,1)] text-white rounded-full"
              >
                로그인
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {drawerMenu.map((item, index) => renderMenuItem(item, index))}
        </div>
      </SheetContent>

      {/* 카테고리 관리 모달 */}
      <CategoryManager 
        open={showCategoryManager} 
        onClose={() => setShowCategoryManager(false)} 
      />
    </Sheet>
  );
};
