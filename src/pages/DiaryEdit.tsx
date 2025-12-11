import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Share2 } from 'lucide-react';
import { get, update } from "@/utils/diaryStorage";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { diarySchema } from '@/utils/validation';

export default function DiaryEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSave = text.trim().length > 0;

  useEffect(() => {
    if (!id) {
      navigate('/diary');
      return;
    }

    const diary = get(id);
    if (!diary) {
      toast.error('기록을 찾을 수 없습니다');
      navigate('/diary');
      return;
    }

    setText(diary.content);
    setIsLoading(false);
  }, [id, navigate]);

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
    if (!id) return;

    const validationResult = diarySchema.safeParse({ content: text.trim() });
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    await update(id, text.trim());

    toast.success('수정되었습니다.');
    navigate(`/diary/${id}`, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-[#8C8A86]">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          일기 수정
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
          placeholder="오늘 하루는 어땠나요?"
          className="w-full min-h-[400px] bg-transparent text-[16px] leading-7 outline-none resize-none placeholder-[#B6B6B6] border-none px-0"
          style={{ overflowY: 'hidden' }}
        />
      </div>
    </div>
  );
}
