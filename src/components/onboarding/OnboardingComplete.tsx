import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/');
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-6 py-8 overflow-hidden bg-[#FAFAFA]">
      {/* Very subtle background gradient */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]"
        style={{ background: 'linear-gradient(135deg, #7DB87D 0%, #E8C87D 100%)' }}
      />
      
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {/* Check Icon with Pulse Animation */}
        <div className="relative mb-12 flex items-center justify-center">
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full animate-ping opacity-20" style={{ background: '#7DB87D' }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full animate-[ping_1.5s_ease-in-out_infinite] opacity-30" style={{ background: '#7DB87D' }} />
          </div>
          {/* Main check icon */}
          <div className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl" style={{ background: '#7DB87D' }}>
            <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
        </div>
        
        <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.6px] text-[#2E2E2E] mb-3 text-center">
          당신의 하루 루틴이<br />준비되었어요 ✨
        </h1>
        
        <div className="text-center text-[#7E7C78] text-[15px] leading-[24px]">
          <p>오늘부터 하나님과 함께하는</p>
          <p>하루를 시작해보세요</p>
        </div>
      </div>
      
      <div className="w-full max-w-[320px] relative z-10">
        <Button
          onClick={handleStart}
          className="w-full h-12 rounded-full bg-[#7DB87D] hover:bg-[#6da76d] text-white text-[15px] font-semibold shadow-md"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
};
