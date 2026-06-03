import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Palette, Archive, Settings, Plus, BookOpen, Heart, Star, PencilLine } from 'lucide-react';
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
    { id: 'meditation', label: 'Q.T', icon: BookOpen, color: '#4F8A5B', path: '/meditation/new' },
    { id: 'prayer', label: '기도', icon: Heart, color: '#7A6BB8', path: '/prayer/new' },
    { id: 'gratitude', label: '감사', icon: Star, color: '#C89B3C', path: '/gratitude/new' },
    { id: 'diary', label: '일기', icon: PencilLine, color: '#D97B5D', path: '/diary/new' },
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
            color: cat.color,
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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EDEDED] safe-area-inset-bottom">
        <div className="max-w-[480px] mx-auto flex items-center justify-around h-16 px-4 relative">
          {tabs.slice(0, 2).map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${active ? 'text-[#1F1F1F]' : 'text-[#C0C0C0]'}`}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-[#1F1F1F]' : 'text-[#C0C0C0]'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* FAB */}
          <button
            onClick={() => setShowFabMenu(true)}
            className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-[#1F1F1F] shadow-lg flex items-center justify-center transition-transform active:scale-95"
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2} />
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
                  className={`w-5 h-5 transition-colors ${active ? 'text-[#1F1F1F]' : 'text-[#C0C0C0]'}`}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-[#1F1F1F]' : 'text-[#C0C0C0]'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB Menu */}
      <Dialog open={showFabMenu} onOpenChange={setShowFabMenu}>
        <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[17px] font-semibold text-[#1F1F1F] text-center mb-1">새 기록 작성</h2>
            <p className="text-[12px] text-[#7A7A7A] text-center">어떤 기록을 작성하시겠어요?</p>
          </div>
          <div className="px-6 pb-6 grid grid-cols-2 gap-3">
            {allRecordTypes.map((type) => {
              const Icon = type.icon;
              const isCustom = 'isCustom' in type && type.isCustom;
              return (
                <button
                  key={type.id}
                  onClick={() => { setShowFabMenu(false); navigate(type.path); }}
                  className="relative aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 bg-white overflow-hidden"
                  style={{ border: '1px solid #EFEFEF' }}
                >
                  {/* Accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: type.color, borderRadius: '16px 16px 0 0' }} />
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${type.color}15` }}>
                    {isCustom && type.icon ? (
                      <AppIcon name={type.icon as IconName} size={20} color={type.color} strokeWidth={1.5} />
                    ) : Icon ? (
                      <Icon className="w-5 h-5" style={{ color: type.color }} strokeWidth={1.5} />
                    ) : (
                      <span style={{ color: type.color }} className="text-[16px] font-semibold">{type.label.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[13px] font-semibold text-[#1F1F1F]">{type.label}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
