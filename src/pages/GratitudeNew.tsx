import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Share2 } from 'lucide-react';
import { create } from '@/utils/gratitudeStorage';
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from '@/components/LoginModal';
import { showLoginNudgeAfterSave } from '@/hooks/useLoginNudge';
import { toast } from 'sonner';
import { gratitudeSchema } from '@/utils/validation';
import { saveFeedback } from '@/utils/saveFeedback';

const TEMPLATE = `1. 
2. 
3. 
4. `;

/** 감사 줄 최대 개수. 자동으로 번호를 더 붙이지 않는 지점이다. */
const MAX_ITEMS = 10;

/**
 * 마지막 번호 줄에 글을 쓰기 시작하면 다음 번호 줄을 미리 붙여 준다.
 * (4번 줄에 쓰면 5번 줄이 생긴다) 아직 비어 있으면 붙이지 않는다.
 */
function withNextNumberedLine(src: string): string {
  const lines = src.split('\n');
  const last = lines[lines.length - 1];
  const matched = last.match(/^\s*(\d+)\.\s*(.*)$/);
  if (!matched) return src;
  const [, numberText, rest] = matched;
  if (!rest.trim()) return src;
  const next = Number(numberText) + 1;
  if (next > MAX_ITEMS) return src;
  return `${src}\n${next}. `;
}

function parseItems(src: string) {
  return src.split('\n')
    .map(s => s.replace(/^\s*\d+\.\s?/, '').trim())
    .filter(Boolean);
}

export default function GratitudeNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [text, setText] = useState(TEMPLATE);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // 저장 직후 로그인 유도 창을 띄우는 동안 이동을 잠시 미뤄 둔다
  const afterNudgeRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showLoginNudge = useCallback(() => setShowLoginModal(true), []);
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

    const saved = await create(items);

    toast.success(saveFeedback(Boolean(user)));
    const go = () => { navigate(`/gratitude/${saved.id}`, { replace: true }); };
    // 입력 도중이 아니라 저장을 마친 지금 한 번만 묻는다
    if (showLoginNudgeAfterSave(user, () => setShowLoginModal(true))) {
      afterNudgeRef.current = go;
    } else {
      go();
    }
  };

  return (
    <>
      <LoginModal
        open={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          const go = afterNudgeRef.current;
          afterNudgeRef.current = null;
          go?.();
        }}
        callbackUrl={location.pathname}
      />
      
      <div className="min-h-screen bg-[#FAFAF9]">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#EDEDED]">
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
                  ? 'bg-[#C89B3C] text-white hover:bg-[#b88b2c]' 
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
              const el = e.target;
              // 맨 끝에서 쓰고 있을 때만 다음 번호를 붙인다. 중간을 고칠 때 끼어들면 곤란하다.
              const atEnd = el.selectionStart === el.value.length;
              const raw = el.value;
              const next = atEnd ? withNextNumberedLine(raw) : raw;
              setText(next);
              if (next !== raw) {
                // 새 번호 줄은 뒤에 붙이고 커서는 치던 자리에 그대로 둔다.
                // 커서가 새 줄로 끌려가면 글자마다 줄이 하나씩 생긴다.
                const caret = raw.length;
                requestAnimationFrame(() => {
                  el.selectionStart = caret;
                  el.selectionEnd = caret;
                });
              }
              adjustTextareaHeight(el);
              requestAnimationFrame(() => window.scrollTo(0, scrollPos));
            }}
            placeholder="1.&#10;2.&#10;3.&#10;4."
            className="w-full min-h-[120px] bg-transparent text-[16px] leading-7 outline-none resize-none placeholder-[#B6B6B6] border-none"
            style={{ overflowY: 'hidden' }}
          />
          <div className="mt-2 text-[12px] text-[#8A8A8A]">
            마지막 줄에 쓰면 다음 번호가 저절로 생겨요. 숫자 없이 적어도 괜찮아요.
          </div>
        </div>
      </div>
    </>
  );
}
