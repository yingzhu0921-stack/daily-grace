import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

export const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/');
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-6 py-8 bg-[#F6F3EC]">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative mb-12 flex items-center justify-center">
          <div className="w-24 h-24 rounded-[28px] flex items-center justify-center bg-[#1E1C1A]">
            <Check className="w-12 h-12 text-white" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.03em] text-[#1E1C1A] mb-2 text-center">
          당신의 하루 루틴이<br />준비되었어요
        </h1>

        <div className="text-center text-[#6E675E] text-[14px] leading-[22px]">
          <p>오늘부터 하나님과 함께하는</p>
          <p>하루를 시작해보세요</p>
        </div>
      </div>

      <div className="w-full max-w-[320px]">
        <Button
          onClick={handleStart}
          className="w-full h-12 rounded-full bg-[#1E1C1A] hover:bg-[#333] text-white text-[15px] font-semibold"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
};
