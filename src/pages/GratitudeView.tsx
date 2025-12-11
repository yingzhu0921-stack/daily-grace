import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { get, remove } from '@/utils/gratitudeStorage';
import type { GratitudeNote } from '@/types/gratitude';
import { ChevronLeft, Share2, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GratitudeView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<GratitudeNote | null>(null);

  useEffect(() => { 
    if (id) setNote(get(id)); 
  }, [id]);

  if (!note) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] p-5">
        <div className="text-center text-[#8C8A86] mt-16">
          기록을 찾을 수 없어요.
        </div>
      </div>
    );
  }

  const onDelete = () => {
    if (!confirm('이 감사 기록을 삭제할까요?')) return;
    remove(note.id);
    navigate('/gratitude', { replace: true });
  };

  const handleShare = () => {
    if (!note) return;

    const parts: string[] = [];
    const date = new Date(note.createdAt).toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
    
    parts.push(date);
    parts.push('감사\n');
    
    note.items.forEach((item, i) => {
      parts.push(`${i + 1}. ${item}`);
    });
    
    const shareText = parts.join('\n\n');
    
    if (navigator.share) {
      navigator.share({
        title: '감사 기록',
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
          onClick={() => navigate('/gratitude')} 
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">감사</h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/gratitude/${id}/edit`)}
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
            onClick={onDelete}
            className="p-2"
          >
            <Trash2 className="w-5 h-5 text-[#EF4444]" />
          </button>
        </div>
      </header>

      <div className="px-5 py-6 pb-24">
        <div className="rounded-2xl bg-white border border-[#F0EFED] shadow-sm px-5 py-5">
          <div className="text-sm text-[#8B8B8B] mb-4">
            {new Date(note.createdAt).toLocaleDateString('ko-KR')}
          </div>
          <div className="space-y-3 text-[15px] leading-7 text-[#2E2E2E]">
            {note.items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[#8B8B8B] shrink-0">{i + 1}.</span>
                <span className="whitespace-pre-wrap">{it}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
