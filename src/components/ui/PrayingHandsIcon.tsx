import React from 'react';

interface PrayingHandsIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export const PrayingHandsIcon: React.FC<PrayingHandsIconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.75,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Center line */}
      <path d="M12 3v9" />
      
      {/* Left hand outer */}
      <path d="M12 3c-1 0-2 .5-2.5 1.5-.5 1-1 2.5-1.5 4-1 3-2 6-3 9l1.5 1 3-1c.5-2.5 1-5 1.5-7.5.3-1.5.7-2.8 1-3.5" />
      
      {/* Right hand outer */}
      <path d="M12 3c1 0 2 .5 2.5 1.5.5 1 1 2.5 1.5 4 1 3 2 6 3 9l-1.5 1-3-1c-.5-2.5-1-5-1.5-7.5-.3-1.5-.7-2.8-1-3.5" />
      
      {/* Left fingers */}
      <path d="M10.5 4.5v3m1-3.5v4m1-4v3.5" strokeWidth={strokeWidth * 0.8} />
      
      {/* Right fingers */}
      <path d="M13.5 4.5v3m-1-3.5v4m-1-4v3.5" strokeWidth={strokeWidth * 0.8} />
      
      {/* Bottom points */}
      <path d="M6 21l1.5.5 1.5-.5m7 0l1.5.5 1.5-.5" />
    </svg>
  );
};
