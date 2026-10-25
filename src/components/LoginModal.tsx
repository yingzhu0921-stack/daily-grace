import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  callbackUrl?: string;
  title?: string;
  description?: string;
  /**
   * 게스트로 계속할 수 있는 기능인지. 기본값 true.
   * false 면 "게스트로 계속 작성" 버튼과 게스트 안내를 숨기고 "닫기" 만 둔다.
   * 말씀카드 만들기처럼 로그인이 꼭 필요한 기능은 false 로 쓴다 —
   * 게스트로 진행되는 것처럼 보이면 눌러도 아무 일이 없어 헷갈린다.
   */
  guestAllowed?: boolean;
}

/** 로그인 유도 문구는 화면마다 다르지 않게 한 곳에 둔다 */
export const LOGIN_NUDGE_TITLE = '기록을 안전하게 지켜드릴게요';
export const LOGIN_NUDGE_DESCRIPTION = '로그인하면 클라우드에 저장돼 기기를 바꿔도 이어서 볼 수 있어요.';

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  callbackUrl,
  title = LOGIN_NUDGE_TITLE,
  description = LOGIN_NUDGE_DESCRIPTION,
  guestAllowed = true,
}) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    const url = callbackUrl ? `/auth?callback=${encodeURIComponent(callbackUrl)}` : '/auth';
    navigate(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-[#E3E2E0]">
        <DialogHeader>
          <DialogTitle className="text-[#2E2E2E] text-xl">{title}</DialogTitle>
          <DialogDescription className="text-[#7E7C78] mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          <Button 
            onClick={handleLogin}
            className="w-full bg-[#1F1F1F] hover:bg-[#333] text-white rounded-full py-6 font-medium"
          >
            이메일로 계속하기
          </Button>
          
          {guestAllowed && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#E3E2E0]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[#7E7C78]">또는</span>
              </div>
            </div>
          )}

          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-[#E3E2E0] text-[#7E7C78] rounded-full py-6"
          >
            {guestAllowed ? '게스트로 계속 작성' : '닫기'}
          </Button>
        </div>
        
        {guestAllowed && (
          <p className="text-xs text-center text-[#7E7C78] mt-4">
            게스트 모드는 기기에만 저장됩니다.
            <br />
            로그인하면 동기화와 백업이 자동으로 됩니다.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
