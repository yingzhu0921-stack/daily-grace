import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { list, remove } from '@/utils/gratitudeStorage';
import type { GratitudeNote } from '@/types/gratitude';
import { ArrowLeft } from 'lucide-react';
import { SwipeableItem } from '@/components/SwipeableItem';
import { toast } from 'sonner';

export default function GratitudeList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<GratitudeNote[]>([]);
  const refresh = () => setItems(list());
  
  useEffect(() => { refresh(); }, []);

  const handleDelete = (id: string) => {
    remove(id);
    refresh();
    toast.success('감사 기록이 삭제되었습니다');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          감사
        </h1>

        <button 
          onClick={() => navigate('/gratitude/new')}
          className="h-9 px-5 rounded-full bg-[#E8C87D] hover:bg-[#d8b86d] text-white text-sm font-medium transition-colors"
        >
          새로 작성
        </button>
      </header>

      <div className="px-5 pb-24 pt-6">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 px-8">
            <p className="text-[15px] text-[#8B8B8B] text-center leading-relaxed">
              아직 기록이 없어요. '새로 작성'을 눌러 첫<br />
              감사 기록을 남겨보세요.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {items.map(n => (
            <SwipeableItem
              key={n.id}
              onEdit={() => navigate(`/gratitude/${n.id}`)}
              onDelete={() => handleDelete(n.id)}
              editColor="#E8C87D"
              deleteColor="#E06B6B"
            >
              <button
                onClick={() => navigate(`/gratitude/${n.id}`)}
                className="w-full text-left rounded-2xl bg-white border border-[#F0EFED] shadow-sm px-4 py-4 hover:shadow-md transition"
              >
                <div className="text-[13px] text-[#8F8C86]">
                  {new Date(n.createdAt).toLocaleDateString('ko-KR')}
                </div>
                <ol className="mt-1 list-decimal pl-5 space-y-1 text-[15px] leading-7">
                  {n.items.slice(0, 3).map((it, i) => (
                    <li key={i} className="line-clamp-1">{it}</li>
                  ))}
                </ol>
                {n.items.length > 3 && (
                  <div className="mt-1 text-[12px] text-[#9B9B9B]">
                    …외 {n.items.length - 3}개
                  </div>
                )}
              </button>
            </SwipeableItem>
          ))}
        </div>
      </div>
    </div>
  );
}
