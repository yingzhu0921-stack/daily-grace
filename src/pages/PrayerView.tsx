import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, remove, toggleAnswered } from '@/utils/prayerStorage';
import type { PrayerNote } from '@/types/prayer';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Check, ChevronLeft } from 'lucide-react';

export default function PrayerView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<PrayerNote | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/prayer', { replace: true });
      return;
    }
    const found = get(id);
    if (!found) {
      toast.error('기도제목을 찾을 수 없습니다');
      navigate('/prayer', { replace: true });
      return;
    }
    setNote(found);
  }, [id, navigate]);

  const handleToggleAnswered = async () => {
    if (!id) return;
    const updated = await toggleAnswered(id);
    setNote(updated);
    toast.success(updated.answered ? '응답됨으로 표시했습니다' : '응답 표시를 해제했습니다');
  };

  const handleDelete = () => {
    if (!id || !confirm('정말 삭제하시겠습니까?')) return;
    remove(id);
    toast.success('삭제되었습니다');
    navigate('/prayer');
  };

  const handleShare = async () => {
    if (!note) return;
    
    const parts: string[] = [];
    const date = new Date(note.createdAt).toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
    
    parts.push(date);
    parts.push('기도\n');
    
    if (note.title?.trim()) parts.push(`기도 제목: ${note.title}`);
    if (note.content?.trim()) parts.push(`기도 내용: ${note.content}`);
    
    const text = parts.join('\n\n');
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        console.error('공유 실패:', err);
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('전체 내용이 복사되었어요!');
    }
  };

  if (!note) return null;

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button 
          onClick={() => navigate('/prayer')}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">기도</h1>
        
        <motion.button
          onClick={handleToggleAnswered}
          whileTap={{ scale: 0.95 }}
          className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            note.answered
              ? 'bg-[#B8A4D4] text-white'
              : 'bg-transparent text-[#7E7C78] border border-[#E8E7E5]'
          }`}
        >
          {note.answered ? '응답됨' : '응답 표시'}
        </motion.button>
      </header>

      <div className="px-5 py-6 pb-24">
        <div className="p-5 rounded-2xl bg-white border border-[#F0EFED] shadow-sm">
          <div className="mb-4">
            <div className="text-sm text-[#8B8B8B] mb-3">
              작성 {new Date(note.createdAt).toLocaleDateString('ko-KR')}
              {note.answered && (
                <span className="ml-2 text-[#2F6B48]">· 응답 {new Date(note.answeredAt!).toLocaleDateString('ko-KR')}</span>
              )}
            </div>
            <div className="text-[18px] font-medium text-[#2E2E2E] mb-4 whitespace-pre-wrap">
              {note.title}
            </div>
          </div>

          <div className="text-[15px] leading-relaxed text-[#5A5A5A] mb-6 whitespace-pre-wrap">
            {note.content}
          </div>

          <div className="flex gap-2 pt-4 border-t border-[#F0EFED]">
            <button 
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#2E2E2E] bg-white border border-[#E8E7E5] hover:bg-[#F9F8F6] transition-colors"
            >
              공유하기
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#DD957D] bg-white border border-[#E8E7E5] hover:bg-[#FFF5F2] transition-colors"
            >
              삭제하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
