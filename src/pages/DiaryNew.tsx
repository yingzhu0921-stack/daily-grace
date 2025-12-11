import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Share2 } from 'lucide-react';
import { create } from "@/utils/diaryStorage";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from '@/components/LoginModal';
import { toast } from 'sonner';
import { diarySchema } from '@/utils/validation';
import { supabase } from '@/integrations/supabase/client';

export default function DiaryNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSave = text.trim().length > 0;

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      const scrollPos = window.scrollY;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      textarea.style.overflowY = 'hidden';
      window.scrollTo(0, scrollPos);
    }
  };

  useEffect(() => {
    adjustTextareaHeight(textareaRef.current);
  }, [text]);

  const handleShare = () => {
    if (!text.trim()) return;
    
    const parts: string[] = [];
    const today = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
    
    parts.push(today);
    parts.push('일기\n');
    parts.push(text.trim());
    
    const shareText = parts.join('\n\n');
    
    navigator.clipboard.writeText(shareText);
    toast.success('전체 내용이 복사되었어요!');
  };

  const save = async () => {
    const validationResult = diarySchema.safeParse({ content: text.trim() });
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    const saved = await create(text.trim());
    
    toast.success('클라우드에 백업되었습니다.');
    navigate(`/diary/${saved.id}`, { replace: true });
  };

  return (
    <>
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        callbackUrl={location.pathname}
      />
      
      <div className="min-h-screen bg-[#FAF9F7]">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
          </button>
          <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
            일기
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={!canSave}
              className="p-2"
            >
              <Share2 className={`w-5 h-5 ${canSave ? 'text-[#2E2E2E]' : 'text-[#ACACAC]'}`} />
            </button>
            <button 
              onClick={save} 
              disabled={!canSave}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                canSave 
                  ? 'bg-[#DD957D] text-white hover:bg-[#cd856d]' 
                  : 'bg-[#E8E7E5] text-[#ACACAC] cursor-not-allowed'
              }`}
            >
              저장
            </button>
          </div>
        </header>

        <div className="px-5 py-6 pb-24">
          <Textarea
            ref={textareaRef}
            autoFocus
            value={text}
            onChange={(e) => {
              const scrollPos = window.scrollY;
              setText(e.target.value);
              adjustTextareaHeight(e.target);
              requestAnimationFrame(() => window.scrollTo(0, scrollPos));
            }}
            placeholder="오늘의 마음을 자유롭게 적어보세요…"
            className="bg-transparent border-0 text-[16px] leading-7 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[120px]"
            style={{ overflowY: 'hidden' }}
          />
          <div className="mt-2 text-[12px] text-[#8A8A8A]">{text.length}자</div>
        </div>
      </div>
    </>
  );
}
