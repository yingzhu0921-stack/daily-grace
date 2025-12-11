import React from 'react';
import { Link } from 'react-router-dom';
import { AppIcon, IconName } from '@/components/ui/AppIcon';

interface NavItemProps {
  label: string;
  icon: IconName;
  href?: string;
  disabled?: boolean;
  indent?: boolean;
  accent?: boolean;
  highlighted?: boolean;
  iconColor?: string;
  divider?: boolean;
  onNavigate?: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({
  label,
  icon,
  href,
  disabled = false,
  indent = false,
  accent = false,
  highlighted = false,
  iconColor,
  divider = false,
  onNavigate,
}) => {
  if (divider) {
    return <div className="my-3 h-px bg-[#EDEDED]" />;
  }

  const baseClasses = `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
    indent ? 'pl-12' : ''
  }`;
  
  const colorClasses = highlighted
    ? 'bg-[#F3F2F1] text-[#2E2E2E]'
    : accent
    ? 'text-[rgba(125,184,125,1)] hover:bg-[rgba(125,184,125,0.1)]'
    : 'text-[#2E2E2E] hover:bg-[rgba(243,242,241,1)]';
  
  const disabledClasses = disabled
    ? 'opacity-40 cursor-not-allowed'
    : 'cursor-pointer';

  const content = (
    <div className={`${baseClasses} ${colorClasses} ${disabledClasses}`}>
      <AppIcon 
        name={icon} 
        size={20} 
        strokeWidth={1.75} 
        color={iconColor || 'currentColor'}
      />
      <span className="text-[15px]">{label}</span>
    </div>
  );

  // href가 없지만 onNavigate가 있으면 클릭 가능한 버튼으로 처리
  if (!href) {
    if (disabled) {
      return (
        <div className="relative group">
          {content}
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/80 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-50">
            준비 중이에요
          </div>
        </div>
      );
    }
    
    return (
      <button onClick={onNavigate} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link to={href} onClick={onNavigate} className="block">
      {content}
    </Link>
  );
};
