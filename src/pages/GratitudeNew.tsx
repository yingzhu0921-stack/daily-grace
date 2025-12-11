import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Share2 } from 'lucide-react';
import { create } from '@/utils/gratitudeStorage';
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from '@/components/LoginModal';
import { toast } from 'sonner';
import { gratitudeSchema } from '@/utils/validation';
import { supabase } from '@/integrations/supabase/client';

const TEMPLATE = `1. 
2. 
3. 
4. `;

function parseItems(src: string) {
  return src.split('\n')
    .map(s => s.replace(/^\s*\d+\.\s?/, '').trim())
    .filter(Boolean);
}

export default function GratitudeNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [text, setText] = useState(TEMPLATE);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const items = parseItems(text);
  const canSave = items.length > 0;

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

  // 초기 포커스 시 커서를 첫 번째 항목의 숫자 뒤로 이동
  useEffect(() => {
    if (textareaRef.current && text === TEMPLATE) {
      const cursorPosition = 3; // "1. " 뒤
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, []);

  const handleShare = () => {
    if (items.length === 0) return;
    
    const parts: string[] = [];
    const today = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
    
    parts.push(today);
    parts.push('감사\n');
    
    items.forEach((item, i) => {
      parts.push(`${i + 1}. ${item}`);
    });
    
    const shareText = parts.join('\n\n');
    
    navigator.clipboard.writeText(shareText);
    toast.success('전체 내용이 복사되었어요!');
  };

  const save = async () => {
    const validationResult = gratitudeSchema.safeParse({ items });
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    const saved = await create(items);

    toast.success('클라우드에 백업되었습니다.');
    navigate(`/gratitude/${saved.id}`, { replace: true });
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
            감사
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
                  ? 'bg-[#E8C87D] text-white hover:bg-[#d8b86d]' 
                  : 'bg-[#E8E7E5] text-[#ACACAC] cursor-not-allowed'
              }`}
            >
              저장
            </button>
          </div>
        </header>

        <div className="px-5 py-6 pb-24">
          <div className="text-sm text-[#9B9B9B] mb-2">감사 목록</div>
          <textarea
            ref={textareaRef}
            autoFocus
            value={text}
            onChange={(e) => {
              const scrollPos = window.scrollY;
              setText(e.target.value);
              adjustTextareaHeight(e.target);
              requestAnimationFrame(() => window.scrollTo(0, scrollPos));
            }}
            placeholder="1.&#10;2.&#10;3.&#10;4."
            className="w-full min-h-[120px] bg-transparent text-[16px] leading-7 outline-none resize-none placeholder-[#B6B6B6] border-none"
            style={{ overflowY: 'hidden' }}
          />
          <div className="mt-2 text-[12px] text-[#8A8A8A]">
            숫자 없이 적어도 되고, 줄은 더 추가해도 돼요.
          </div>
        </div>
      </div>
    </>
  );
}
