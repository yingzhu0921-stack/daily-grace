import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';


export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    setIsOpen(false); // 드롭다운 닫기
    
    try {
      await signOut();
      // Safari 호환성을 위해 replace 사용
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  // 아바타 이니셜 표시 (로그인 상태)
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.nickname || user?.user_metadata?.full_name;
  const userInitial = user ? (displayName || user.email?.charAt(0) || 'U').charAt(0).toUpperCase() : null;

  if (!user) {
    return (
      <button
        onClick={() => navigate('/auth')}
        className="w-9 h-9 rounded-full bg-[#E8E7E5] flex items-center justify-center hover:bg-[#DED9D5] transition-colors"
      >
        <User className="w-5 h-5 text-[#ACACAC]" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 rounded-full bg-[#E7F0E7] flex items-center justify-center hover:bg-[#D9E8D9] transition-colors">
          <span className="text-[15px] font-semibold text-[#4A644A]">
            {userInitial}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white border-[#E3E2E0]">
        <DropdownMenuItem
          onClick={() => navigate('/settings/account')}
          className="text-[#2E2E2E] hover:bg-[#F3F2F1] cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>내 정보</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings')}
          className="text-[#2E2E2E] hover:bg-[#F3F2F1] cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>설정</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#E3E2E0]" />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-[#2E2E2E] hover:bg-[#F3F2F1] cursor-pointer disabled:opacity-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
