import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, Sparkles, Edit3 } from 'lucide-react';

interface OnboardingWelcomeProps {
  onNext: () => void;
}

export const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onNext }) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full px-6 py-8 overflow-hidden bg-[#FAFAFA]">
      {/* Very subtle background gradient */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]"
        style={{ background: 'linear-gradient(135deg, #7DB87D 0%, #E8C87D 100%)' }}
      />
      
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {/* Icon Grid with Float Animation */}
        <div className="relative mb-12 animate-float">
          <div className="grid grid-cols-2 gap-4">
            {/* Q.T - Green */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#7DB87D' }}>
              <BookOpen className="w-12 h-12 text-white" strokeWidth={1.75} />
            </div>
            {/* Prayer - Purple */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#A57DB8' }}>
              <Heart className="w-12 h-12 text-white" strokeWidth={1.75} />
            </div>
            {/* Gratitude - Yellow */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#E8C87D' }}>
              <Sparkles className="w-12 h-12 text-white" strokeWidth={1.75} />
            </div>
            {/* Diary - Coral */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#DD957D' }}>
              <Edit3 className="w-12 h-12 text-white" strokeWidth={1.75} />
            </div>
          </div>
        </div>
        
        <h1 className="text-[32px] font-bold leading-[40px] tracking-[-0.8px] text-[#2E2E2E] mb-3">
          하루 은혜
        </h1>
        
        <div className="text-center text-[#7E7C78] text-[15px] leading-[24px]">
          <p>하루의 말씀 · 기도 · 감사를</p>
          <p>기록하는 신앙 루틴 앱</p>
        </div>
      </div>
      
      <div className="w-full max-w-[320px] relative z-10">
        <Button
          onClick={onNext}
          className="w-full h-12 rounded-full bg-[#7DB87D] hover:bg-[#6da76d] text-white text-[15px] font-semibold shadow-md"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
};
