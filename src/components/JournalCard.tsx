import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppIcon, IconName } from '@/components/ui/AppIcon';

interface JournalCardProps {
  title: string;
  description: string;
  iconName: IconName;
  backgroundColor: string;
  type: 'meditation' | 'prayer' | 'gratitude' | 'diary';
}

export const JournalCard: React.FC<JournalCardProps> = ({
  title,
  description,
  iconName,
  backgroundColor,
  type,
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (type === 'meditation') {
      navigate('/meditation');
    } else if (type === 'prayer') {
      navigate('/prayer');
    } else if (type === 'gratitude') {
      navigate('/gratitude');
    } else if (type === 'diary') {
      navigate('/diary');
    } else {
      alert(`${title} 기능은 준비 중입니다.`);
    }
  };

  const handleRecordClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'meditation') {
      navigate('/meditation/new');
    } else if (type === 'prayer') {
      navigate('/prayer/new');
    } else if (type === 'gratitude') {
      navigate('/gratitude/new');
    } else if (type === 'diary') {
      navigate('/diary/new');
    } else {
      alert(`${title} 기능은 준비 중입니다.`);
    }
  };

  const getCtaLabel = () => {
    if (type === 'meditation' || type === 'prayer' || type === 'gratitude' || type === 'diary') {
      return '기록하기';
    }
    return '시작하기';
  };

  return (
    <article 
      onClick={handleCardClick}
      className={`relative flex w-full items-center justify-between overflow-hidden px-4 sm:px-5 py-6 sm:py-8 rounded-3xl cursor-pointer hover:opacity-95 transition-opacity`} 
      style={{ backgroundColor }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 mr-20">
        <div className="bg-[rgba(255,255,255,0.2)] flex items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0">
          <AppIcon
            name={iconName}
            size={28}
            color="#fff"
            strokeWidth={1.75}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl text-white font-semibold">{title}</h3>
          <p className="text-sm sm:text-base text-white font-normal leading-snug mt-1">{description}</p>
        </div>
      </div>
      <button
        onClick={handleRecordClick}
        className="bg-[rgba(255,255,255,0.25)] flex items-center justify-center text-sm text-white font-normal whitespace-nowrap px-4 py-2.5 rounded-full hover:bg-[rgba(255,255,255,0.35)] transition-colors flex-shrink-0 absolute bottom-6 right-4"
      >
        {getCtaLabel()}
      </button>
    </article>
  );
};
