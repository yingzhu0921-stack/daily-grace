import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, Star, PenLine } from 'lucide-react';

interface OnboardingWelcomeProps {
  onNext: () => void;
}

export const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onNext }) => {
  const categories = [
    { icon: BookOpen, color: '#4F8A5B', label: 'Q.T' },
    { icon: Heart, color: '#7A6BB8', label: '기도' },
    { icon: Star, color: '#C89B3C', label: '감사' },
    { icon: PenLine, color: '#D97B5D', label: '일기' },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-6 py-8 overflow-hidden bg-[#FAFAF9]">
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {/* Icon Grid */}
        <div className="relative mb-12 animate-float">
          <div className="grid grid-cols-2 gap-3">
            {categories.map(({ icon: Icon, color, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className="w-20 h-20 rounded-[22px] flex items-center justify-center"
                  style={{ backgroundColor: `${color}18`, border: `1.5px solid ${color}30` }}
                >
                  <Icon className="w-9 h-9" style={{ color }} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] font-medium" style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-[32px] font-bold leading-[40px] tracking-[-0.8px] text-[#1F1F1F] mb-3">
          하루 은혜
        </h1>

        <div className="text-center text-[#7A7A7A] text-[15px] leading-[24px]">
          <p>하루의 말씀 · 기도 · 감사를</p>
          <p>기록하는 신앙 루틴 앱</p>
        </div>
      </div>

      <div className="w-full max-w-[320px] relative z-10">
        <Button
          onClick={onNext}
          className="w-full h-12 rounded-full bg-[#1F1F1F] hover:bg-[#333] text-white text-[15px] font-semibold"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
};
