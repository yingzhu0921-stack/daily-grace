import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppIcon } from '@/components/ui/AppIcon';

export const CreativeSection: React.FC = () => {
  const navigate = useNavigate();

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    console.log('🎨 Start button clicked - navigating to designer');
    navigate('/cards/designer');
  };

  const handleCardClick = () => {
    console.log('📦 Card clicked - navigating to vault');
    navigate('/cards/vault');
  };

  return (
    <section className="flex w-full flex-col items-stretch mt-4">
      <div className="text-black text-[11px] font-normal uppercase tracking-wide">
        CREATIVE
      </div>
      <article 
        onClick={handleCardClick}
        className="bg-[#7B9AAC] flex w-full items-center justify-between overflow-hidden px-4 sm:px-5 py-6 sm:py-8 rounded-3xl mt-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="bg-[rgba(255,255,255,0.2)] flex items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0">
            <AppIcon
              name="palette"
              size={28}
              color="#fff"
              strokeWidth={1.75}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl text-white font-semibold">말씀카드 만들기</h3>
            <p className="text-sm sm:text-base text-white font-normal leading-snug mt-1">
              말씀과 기록으로 카드 만들어보기
            </p>
          </div>
        </div>
        <button
          onClick={handleStartClick}
          className="bg-[rgba(255,255,255,0.25)] flex items-center justify-center text-sm text-white font-normal whitespace-nowrap px-4 py-2.5 rounded-full hover:bg-[rgba(255,255,255,0.35)] transition-colors flex-shrink-0 ml-3"
        >
          시작하기
        </button>
      </article>
    </section>
  );
};
