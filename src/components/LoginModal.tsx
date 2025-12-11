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
}

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  callbackUrl,
  title = "기록을 안전하게 지켜드릴게요",
  description = "클라우드에 저장하고 기기 어디서나 이어서 작성해요."
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
            className="w-full bg-[rgba(125,184,125,1)] hover:bg-[rgba(115,174,115,1)] text-white rounded-full py-6 font-medium"
          >
            이메일로 계속하기
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E3E2E0]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[#7E7C78]">또는</span>
            </div>
          </div>
          
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full border-[#E3E2E0] text-[#7E7C78] rounded-full py-6"
          >
            게스트로 계속 작성
          </Button>
        </div>
        
        <p className="text-xs text-center text-[#7E7C78] mt-4">
          게스트 모드는 기기에만 저장됩니다. 
          <br />
          로그인하면 동기화와 백업이 자동으로 됩니다.
        </p>
      </DialogContent>
    </Dialog>
  );
};
