import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Share2 } from 'lucide-react';
import { create, createManyFromText } from '@/utils/prayerStorage';
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from '@/components/LoginModal';
import { toast } from 'sonner';
import { prayerSchema } from '@/utils/validation';
import { supabase } from '@/integrations/supabase/client';

export default function PrayerNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [splitLines, setSplitLines] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const canSave = text.trim().length > 0;

  const handleShare = () => {
    if (!text.trim()) return;
    
    const parts: string[] = [];
    const today = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
    
    parts.push(today);
    parts.push('기도\n');
    parts.push(`기도 제목: ${text.trim()}`);
    
    const shareText = parts.join('\n\n');
    
    navigator.clipboard.writeText(shareText);
    toast.success('전체 내용이 복사되었어요!');
  };

  const handleSave = () => {
    const value = text.trim();
    const validationResult = prayerSchema.safeParse({
      title: value,
      content: value,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    let savedPrayer;
    if (splitLines) {
      const prayers = text.split('\n').filter(line => line.trim()).map(line =>
        create({
          title: line.trim(),
          content: line.trim(),
          answered: false,
          answeredAt: null
        })
      );
      savedPrayer = prayers[0];
      
      toast.success('클라우드에 백업되었습니다.');

      navigate('/prayer', { replace: true });
      setTimeout(() => navigate(`/prayer/${savedPrayer.id}`), 0);
    } else {
      savedPrayer = create({
        title: value,
        content: value,
        answered: false,
        answeredAt: null
      });

      toast.success('클라우드에 백업되었습니다.');

      navigate('/prayer', { replace: true });
      setTimeout(() => navigate(`/prayer/${savedPrayer.id}`), 0);
    }
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
            기도
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
              onClick={handleSave}
              disabled={!canSave}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                canSave 
                  ? 'bg-[#A57DB8] text-white hover:bg-[#956daa]' 
                  : 'bg-[#E8E7E5] text-[#ACACAC] cursor-not-allowed'
              }`}
            >
              저장
            </button>
          </div>
        </header>

        <div className="px-5 py-6 pb-24">
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
            placeholder="기도 제목(내용)을 적어보세요&#10;예) 아버지의 건강 회복을 위해"
            className="w-full min-h-[120px] bg-transparent text-[18px] leading-7 outline-none resize-none placeholder-[#B6B6B6] border-none"
            style={{ overflowY: 'hidden' }}
          />
          <label className="flex items-center gap-2 text-sm text-[#666] mt-4">
            <input 
              type="checkbox" 
              checked={splitLines} 
              onChange={e => setSplitLines(e.target.checked)}
              className="w-4 h-4 rounded border-[#E8E7E5] text-[#A57DB8] focus:ring-[#A57DB8]"
            />
            줄마다 별도 기도제목으로 저장
          </label>
          <div className="mt-2 text-[12px] text-[#8A8A8A]">
            줄바꿈으로 길게 적어도 돼요. 저장하면 리스트에 한 줄 요약으로 보여줘요.
          </div>
        </div>
      </div>
    </>
  );
}
