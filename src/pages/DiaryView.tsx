import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { get, remove, type Diary } from "@/utils/diaryStorage";
import { ChevronLeft, Share2, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DiaryView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [diary, setDiary] = useState<Diary | null>(null);

  useEffect(() => {
    if (id) {
      const d = get(id);
      setDiary(d);
    }
  }, [id]);

  if (!diary) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-[#8C8A86]">기록을 찾을 수 없어요.</div>
      </div>
    );
  }

  const del = async () => {
    if (!confirm("이 일기를 삭제할까요?")) return;
    await remove(diary.id);
    navigate("/diary", { replace: true });
  };

  const handleShare = () => {
    if (!diary) return;

    const parts: string[] = [];
    const date = new Date(diary.createdAt).toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
    
    parts.push(date);
    parts.push('일기\n');
    parts.push(diary.content);
    
    const shareText = parts.join('\n\n');
    
    if (navigator.share) {
      navigator.share({
        title: '일기',
        text: shareText,
      }).catch(err => console.log('Share failed:', err));
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('전체 내용이 복사되었어요!');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button 
          onClick={() => navigate("/diary")}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">일기</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/diary/${id}/edit`)}
            className="p-2"
          >
            <Edit2 className="w-5 h-5 text-[#2E2E2E]" />
          </button>
          <button
            onClick={handleShare}
            className="p-2"
          >
            <Share2 className="w-5 h-5 text-[#2E2E2E]" />
          </button>
          <button
            onClick={del}
            className="p-2"
          >
            <Trash2 className="w-5 h-5 text-[#EF4444]" />
          </button>
        </div>
      </header>

      <div className="px-5 py-6 pb-24">
        <div className="rounded-2xl bg-white border border-[#F0EFED] shadow-sm px-5 py-5">
          <div className="text-sm text-[#8B8B8B] mb-4">
            {new Date(diary.createdAt).toLocaleDateString("ko-KR")}
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#2E2E2E]">
            {diary.content}
          </div>
        </div>
      </div>
    </div>
  );
}
