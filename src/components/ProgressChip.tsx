import React from 'react';

interface ProgressChipProps {
  current: number;
  total: number;
}

export const ProgressChip: React.FC<ProgressChipProps> = ({ current, total }) => {
  const isComplete = current >= total;
  
  return (
    <div
      className={`inline-flex items-center justify-center px-2.5 h-[26px] rounded-full text-xs font-medium ${
        isComplete
          ? 'bg-[rgba(125,184,125,0.2)] text-[rgba(115,174,115,1)]'
          : 'bg-[#F3F2F1] text-[#8B8B8B]'
      }`}
    >
      오늘 {current}/{total}
    </div>
  );
};
