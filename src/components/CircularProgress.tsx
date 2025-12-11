import React from 'react';

interface CircularProgressProps {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ 
  completed, 
  total, 
  size = 48, 
  strokeWidth = 4 
}) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = percentage === 100;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8E7E5"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? '#7DB87D' : '#A57DB8'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <span className="text-[16px]">🎉</span>
        ) : (
          <span className={`text-[11px] font-semibold ${isComplete ? 'text-[#7DB87D]' : 'text-[#6B6B6B]'}`}>
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  );
};