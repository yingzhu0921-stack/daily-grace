import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { list, toggleAnswered, remove, update } from '@/utils/prayerStorage';
import type { PrayerNote } from '@/types/prayer';
import { AnswerButton } from '@/components/AnswerButton';
import { ChevronLeft } from 'lucide-react';
import { SwipeableItem } from '@/components/SwipeableItem';
import { PrayerResponseModal } from '@/components/PrayerResponseModal';
import { toast } from 'sonner';

export default function PrayerList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PrayerNote[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerNote | null>(null);

  const refresh = () => setItems(list());
  useEffect(() => { refresh(); }, []);

  const handleDelete = (id: string) => {
    remove(id);
    refresh();
    toast.success('기도 제목이 삭제되었습니다');
  };

  const handleAnswerClick = async (prayer: PrayerNote) => {
    if (prayer.answered) {
      // 이미 응답된 경우: 응답 취소
      await toggleAnswered(prayer.id);
      refresh();
      toast.success('응답이 취소되었습니다');
    } else {
      // 응답 모달 열기
      setSelectedPrayer(prayer);
      setModalOpen(true);
    }
  };

  const handleSaveResponse = async (responseText: string) => {
    if (!selectedPrayer) return;

    await update(selectedPrayer.id, {
      answered: true,
      answeredAt: new Date().toISOString(),
      answeredDetail: responseText,
    });

    refresh();
    toast.success('기도 응답이 기록되었습니다');
    setSelectedPrayer(null);
  };


  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          기도
        </h1>

        <button
          onClick={() => navigate('/prayer/new')}
          className="h-9 px-5 rounded-full bg-[#A57DB8] hover:bg-[#956daa] text-white text-sm font-medium transition-colors"
        >
          새로 작성
        </button>
      </header>

      <div className="px-5 pb-24 pt-6">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 px-8">
            <p className="text-[15px] text-[#8B8B8B] text-center leading-relaxed">
              아직 기록이 없어요. '새로 작성'을 눌러 첫<br />
              기도제목을 남겨보세요.
            </p>
          </div>
        )}

        <div className="space-y-3">

          {items.map((p) => (
            <SwipeableItem
              key={p.id}
              onEdit={() => navigate(`/prayer/${p.id}`)}
              onDelete={() => handleDelete(p.id)}
              editColor="#A57DB8"
              deleteColor="#E06B6B"
            >
              <div className="rounded-2xl bg-white border border-[#F0EFED] shadow-sm">
                <div className="px-4 py-4 flex items-start justify-between gap-3">
                  <div 
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => navigate(`/prayer/${p.id}`)}
                  >
                    <div className="text-[16px] font-semibold text-[#2E2E2E] break-keep">
                      {p.title}
                    </div>
                    <div className="mt-1 text-[12px] text-[#8F8C86] flex items-center gap-2">
                      <span>작성 {new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
                      {p.answered && (
                        <span className="text-[#2F6B48]">· 응답 {new Date(p.answeredAt!).toLocaleDateString('ko-KR')}</span>
                      )}
                    </div>
                  </div>

                  <AnswerButton
                    answered={p.answered}
                    onToggle={() => handleAnswerClick(p)}
                  />
                </div>
              </div>
            </SwipeableItem>
          ))}
        </div>
      </div>

      <PrayerResponseModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedPrayer(null);
        }}
        onSave={handleSaveResponse}
        initialResponse={selectedPrayer?.answeredDetail || ''}
        prayerTitle={selectedPrayer?.title || ''}
      />
    </div>
  );
}
