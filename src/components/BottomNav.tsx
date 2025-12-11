import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Palette, Archive, Settings, Plus, BookOpen, Heart, Sparkles, PencilLine } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import * as categoryStorage from '@/utils/categoryStorage';

type CustomCategory = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
};

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  const tabs = [
    { id: 'home', label: '홈', icon: Home, path: '/' },
    { id: 'creative', label: '카드 만들기', icon: Palette, path: '/cards/designer' },
    { id: 'records', label: '보관함', icon: Archive, path: '/records' },
    { id: 'settings', label: '설정', icon: Settings, path: '/settings' },
  ];

  const defaultRecordTypes = [
    { id: 'meditation', label: 'Q.T', icon: BookOpen, color: '#7DB87D', path: '/meditation/new' },
    { id: 'prayer', label: '기도', icon: Heart, color: '#A57DB8', path: '/prayer/new' },
    { id: 'gratitude', label: '감사', icon: Sparkles, color: '#E8C87D', path: '/gratitude/new' },
    { id: 'diary', label: '일기', icon: PencilLine, color: '#DD957D', path: '/diary/new' },
  ];

  // 커스텀 카테고리 로드 (Supabase에서)
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const allDbCategories = await categoryStorage.list();
        const customs = allDbCategories
          .filter((cat) => !['1', '2', '3', '4'].includes(cat.id))
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon as IconName,
          }));
        setCustomCategories(customs);
      } catch (error) {
        console.error('Failed to load custom categories:', error);
      }
    };

    loadCustomCategories();

    // 카테고리 변경 이벤트 리스너
    const handleCategoriesUpdated = () => {
      loadCustomCategories();
    };

    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);
    return () => window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
  }, []);

  // 모든 기록 타입 합치기
  const allRecordTypes = [
    ...defaultRecordTypes,
    ...customCategories.map(cat => ({
      id: cat.id,
      label: cat.name,
      icon: cat.icon,
      color: cat.color,
      path: `/custom/${cat.id}/new`,
      isCustom: true,
    }))
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleFabClick = () => {
    setShowFabMenu(true);
  };

  const handleRecordTypeSelect = (path: string) => {
    setShowFabMenu(false);
    navigate(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#F0EFED] safe-area-inset-bottom">
        <div className="max-w-[480px] mx-auto flex items-center justify-around h-16 px-4 relative">
          {tabs.slice(0, 2).map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            const isCardMaker = tab.id === 'creative';

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
              >
                {isCardMaker ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7DB87D]/20 to-[#6BA96B]/20 flex items-center justify-center shadow-sm">
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        active ? 'text-[#7DB87D]' : 'text-[#7DB87D]'
                      }`}
                      strokeWidth={2}
                    />
                  </div>
                ) : (
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      active ? 'text-[#7DB87D]' : 'text-[#ACACAC]'
                    }`}
                    strokeWidth={1.5}
                  />
                )}
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isCardMaker
                      ? active ? 'text-[#7DB87D]' : 'text-[#7DB87D]'
                      : active ? 'text-[#7DB87D]' : 'text-[#ACACAC]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* FAB Button */}
          <button
            onClick={handleFabClick}
            className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#7DB87D] to-[#6BA96B] shadow-lg flex items-center justify-center transition-transform active:scale-95 hover:shadow-xl"
          >
            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
          </button>

          {tabs.slice(2).map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    active ? 'text-[#7DB87D]' : 'text-[#ACACAC]'
                  }`}
                  strokeWidth={1.5}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    active ? 'text-[#7DB87D]' : 'text-[#ACACAC]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB Menu Modal */}
      <Dialog open={showFabMenu} onOpenChange={setShowFabMenu}>
        <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[18px] font-semibold text-[#2E2E2E] text-center mb-2">
              새 기록 작성
            </h2>
            <p className="text-[13px] text-[#7E7C78] text-center">
              어떤 기록을 작성하시겠어요?
            </p>
          </div>
          <div className="px-6 pb-6 grid grid-cols-2 gap-3">
            {allRecordTypes.map((type) => {
              const Icon = type.icon;
              const isCustom = 'isCustom' in type && type.isCustom;

              return (
                <button
                  key={type.id}
                  onClick={() => handleRecordTypeSelect(type.path)}
                  className="aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${type.color} 0%, ${type.color}DD 100%)`,
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center backdrop-blur-sm">
                    {isCustom && type.icon ? (
                      <AppIcon name={type.icon as IconName} size={24} color="#fff" strokeWidth={2} />
                    ) : Icon ? (
                      <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                    ) : (
                      <span className="text-white text-[18px] font-semibold">
                        {type.label.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-[15px] font-semibold text-white">
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
