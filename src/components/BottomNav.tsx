import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LineIcon, type LineIconName } from '@/components/ui/LineIcon';
import { tintColor } from '@/utils/tintColor';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import * as categoryStorage from '@/utils/categoryStorage';
import { routes } from '@/config/routes';

type CustomCategory = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
};

const LEGACY_COLOR_MAP: Record<string, string> = {
  '#4F8A5B': '#7DB87D',
  '#7A6BB8': '#A57DB8',
  '#C89B3C': '#E8C87D',
  '#D97B5D': '#DD957D',
  '#6B9BD1': '#8DABA8',
  '#E17B8C': '#C7A0B2',
  '#C9A86A': '#D8BE82',
  '#9B87BE': '#A57DB8',
  '#D4886E': '#DD957D',
  '#7AA3B5': '#9AB8C6',
  '#B88FA3': '#C7A0B2',
};

const normalizeCategoryColor = (color?: string) => {
  if (!color) return '#7DB87D';
  const upper = color.toUpperCase();
  return LEGACY_COLOR_MAP[upper] || color;
};

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  const tabs = [
    { id: 'home', label: '홈', icon: 'home' as LineIconName, activeIcon: 'homeOn' as LineIconName, path: '/' },
    { id: 'creative', label: '카드 만들기', icon: 'card' as LineIconName, activeIcon: 'card' as LineIconName, path: '/cards/designer' },
    { id: 'records', label: '보관함', icon: 'box' as LineIconName, activeIcon: 'boxOn' as LineIconName, path: '/records' },
    { id: 'settings', label: '설정', icon: 'settings' as LineIconName, activeIcon: 'settings' as LineIconName, path: '/settings' },
  ];

  const defaultRecordTypes = [
    { id: 'meditation', label: 'Q.T', icon: 'bookOpen' as IconName, color: '#7DB87D', path: '/meditation/new' },
    { id: 'prayer', label: '기도', icon: 'hands' as IconName, color: '#A57DB8', path: '/prayer/new' },
    { id: 'gratitude', label: '감사', icon: 'sun' as IconName, color: '#E8C87D', path: '/gratitude/new' },
    { id: 'diary', label: '일기', icon: 'pencilLine' as IconName, color: '#DD957D', path: '/diary/new' },
  ];

  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const allDbCategories = await categoryStorage.list();
        const customs = allDbCategories
          .filter((cat) => !['1', '2', '3', '4'].includes(cat.id))
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            color: normalizeCategoryColor(cat.color),
            icon: cat.icon as IconName,
          }));
        setCustomCategories(customs);
      } catch (error) {
        console.error('Failed to load custom categories:', error);
      }
    };

    loadCustomCategories();
    window.addEventListener('categoriesUpdated', loadCustomCategories);
    return () => window.removeEventListener('categoriesUpdated', loadCustomCategories);
  }, []);

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

  // 말씀카드 보관함(/cards/vault)은 '보관함' 에 속한다. 경로 앞부분만 비교하면
  // '보관함'(/records) 에도 '카드 만들기'(/cards/designer) 에도 걸리지 않아
  // 그 화면에서는 하단메뉴가 아무것도 켜지지 않았다.
  const EXTRA_PATHS: Record<string, string[]> = {
    '/records': [routes.cardsVault],
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (EXTRA_PATHS[path]?.some((p) => location.pathname.startsWith(p))) return true;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#F6F3EC] border-t border-[rgba(30,28,26,0.12)] safe-area-inset-bottom">
        <div className="max-w-[480px] mx-auto flex items-center justify-around h-16 px-4 relative">
          {tabs.slice(0, 2).map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
              >
                <LineIcon name={active ? tab.activeIcon : tab.icon} size={22} color={active ? '#1E1C1A' : '#9A9288'} />
                <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-[#1E1C1A]' : 'text-[#9A9288]'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* FAB */}
          <button
            onClick={() => setShowFabMenu(true)}
            aria-label="새 기록 작성"
            className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-[#1E1C1A] shadow-[0_6px_16px_rgba(30,28,26,0.25)] flex items-center justify-center transition-transform active:scale-95"
          >
            <LineIcon name="plus" size={24} color="#FFFFFF" strokeWidth={2.4} />
          </button>

          {tabs.slice(2).map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
              >
                <LineIcon name={active ? tab.activeIcon : tab.icon} size={22} color={active ? '#1E1C1A' : '#9A9288'} />
                <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-[#1E1C1A]' : 'text-[#9A9288]'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB Menu — 2026-11-13 UI 개편: 기록 종류 색은 메뉴 칸에만, 아이콘은 검정 선 */}
      <Dialog open={showFabMenu} onOpenChange={setShowFabMenu}>
        <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0 bg-[#F6F3EC] border-[rgba(30,28,26,0.12)]">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[16px] font-bold text-[#1E1C1A] text-center mb-1">새 기록 작성</h2>
            <p className="text-[12px] text-[#8A8278] text-center">어떤 기록을 작성하시겠어요?</p>
          </div>
          <div className="px-6 pb-6 grid grid-cols-2 gap-2">
            {allRecordTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => { setShowFabMenu(false); navigate(type.path); }}
                className="h-16 rounded-2xl px-4 flex items-center gap-2.5 transition-all active:scale-95 text-left"
                style={{ backgroundColor: tintColor(type.color), border: '1px solid rgba(30,28,26,0.12)' }}
              >
                {type.icon ? (
                  <AppIcon name={type.icon} size={20} color="#1E1C1A" />
                ) : (
                  <span className="text-[15px] font-bold text-[#1E1C1A]">{type.label.charAt(0)}</span>
                )}
                <span className="text-[14px] font-bold text-[#1E1C1A] truncate">{type.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
