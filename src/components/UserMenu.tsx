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

  const userInitial = user ? (user.name || user.email?.charAt(0) || 'U').charAt(0).toUpperCase() : null;

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
        {/* '내 정보' 는 설정 안의 계정 화면으로 바로 가는 길이라, 이름만으로는 '설정' 과
            무엇이 다른지 알 수 없었다. 각자 무엇을 담고 있는지 한 줄씩 적어 둔다. */}
        <DropdownMenuItem
          onClick={() => navigate('/settings/account')}
          className="text-[#2E2E2E] hover:bg-[#F3F2F1] cursor-pointer items-start py-2"
        >
          <User className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex flex-col">
            <span>내 정보</span>
            <span className="text-[11px] leading-4 text-[#6E6E6E]">프로필 · 계정</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings')}
          className="text-[#2E2E2E] hover:bg-[#F3F2F1] cursor-pointer items-start py-2"
        >
          <Settings className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex flex-col">
            <span>설정</span>
            <span className="text-[11px] leading-4 text-[#6E6E6E]">알림 · 내보내기 · 약관</span>
          </span>
        </DropdownMenuItem>
        {/* 로그아웃은 얇은 줄 하나로만 나뉘어 '설정' 과 거의 같아 보였다. */}
        <DropdownMenuSeparator className="my-1.5 bg-[#E3E2E0]" />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-[#C2553A] hover:bg-[#FBF0EC] focus:bg-[#FBF0EC] focus:text-[#C2553A] cursor-pointer disabled:opacity-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
