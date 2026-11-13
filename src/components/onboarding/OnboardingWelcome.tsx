import React from 'react';
import { Button } from '@/components/ui/button';
import { AppIcon, type IconName } from '@/components/ui/AppIcon';
import { tintColor } from '@/utils/tintColor';

interface OnboardingWelcomeProps {
  onNext: () => void;
}

export const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onNext }) => {
  const categories = [
    // 2026-11-13 UI 개편: 홈 루틴 칸과 같은 색(옅게)·같은 선 아이콘.
    { icon: 'bookOpen' as IconName, color: '#7DB87D', label: 'Q.T' },
    { icon: 'hands' as IconName, color: '#A57DB8', label: '기도' },
    { icon: 'sun' as IconName, color: '#E8C87D', label: '감사' },
    { icon: 'pencilLine' as IconName, color: '#DD957D', label: '일기' },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-6 py-8 overflow-hidden bg-[#F6F3EC]">
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {/* Icon Grid */}
        <div className="relative mb-12 animate-float">
          <div className="grid grid-cols-2 gap-3">
            {categories.map(({ icon, color, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className="w-[76px] h-[76px] rounded-[22px] flex items-center justify-center border border-[rgba(30,28,26,0.12)]"
                  style={{ backgroundColor: tintColor(color) }}
                >
                  <AppIcon name={icon} size={30} color="#1E1C1A" />
                </div>
                <span className="text-[12px] font-semibold text-[#2A2723]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-[26px] font-bold leading-[34px] tracking-[-0.03em] text-[#1E1C1A] mb-2">
          하루은혜
        </h1>

        <div className="text-center text-[#6E675E] text-[14px] leading-[22px]">
          <p>하루의 말씀 · 기도 · 감사를</p>
          <p>기록하는 신앙 루틴 앱</p>
        </div>
      </div>

      <div className="w-full max-w-[320px] relative z-10">
        <Button
          onClick={onNext}
          className="w-full h-12 rounded-full bg-[#1E1C1A] hover:bg-[#333] text-white text-[15px] font-semibold"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
};
