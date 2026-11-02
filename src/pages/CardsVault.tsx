import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, Download, Edit3, Trash2, X, Plus } from 'lucide-react';
import { DeleteRecordDialog } from '@/components/DeleteRecordDialog';
import { withAuth } from '@/components/auth/withAuth';
import { routes } from '@/config/routes';
import { toast } from 'sonner';
import { BottomNav } from '@/components/BottomNav';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { getAllCards, deleteCard, migrateFromLocalStorage, type VerseCard } from '@/utils/verseCardDB';

const CardsVault: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<VerseCard[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<VerseCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      
      // One-time migration from localStorage to IndexedDB
      const migrated = localStorage.getItem('verse_cards_migrated');
      if (!migrated) {
        const count = await migrateFromLocalStorage();
        if (count > 0) {
          toast.success(`${count}개의 카드를 새로운 저장소로 이동했어요!`);
        }
      }
      
      // Load cards from IndexedDB
      const loadedCards = await getAllCards();
      setCards(loadedCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
      toast.error('카드를 불러오는데 실패했어요');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (card: VerseCard) => {
    if (!card.imageDataUrl) {
      toast.error('이미지를 찾을 수 없어요');
      return;
    }

    try {
      const response = await fetch(card.imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'verse-card.png', { type: 'image/png' });

      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        // 예전에는 여기서 조용히 내려받았다. 그래서 PC 에서는 '공유'와 '저장'이 똑같이
        // 파일만 떨어뜨렸고, 버튼이 왜 둘인지 알 수 없었다. 이제는 왜 안 되는지 말해 준다.
        toast.info('이 브라우저는 이미지 공유를 지원하지 않아요', {
          description: "'저장'으로 내려받은 뒤 보내 주세요. 휴대폰에서는 공유가 바로 열려요.",
        });
        return;
      }

      await navigator.share({
        files: [file],
        title: '말씀카드',
        text: card.text,
      });
    } catch (error) {
      // 사용자가 공유창을 닫은 것은 실패가 아니다. 그걸 오류로 띄우면 뭔가 잘못된 줄 안다.
      if ((error as DOMException)?.name === 'AbortError') return;
      console.error('Share error:', error);
      toast.error('공유에 실패했어요');
    }
  };

  const handleDownload = async (card: VerseCard) => {
    if (!card.imageDataUrl) {
      toast.error('이미지를 찾을 수 없어요');
      return;
    }

    try {
      const response = await fetch(card.imageDataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verse-card-${card.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('카드를 다운로드했어요!');
    } catch (error) {
      toast.error('다운로드에 실패했어요');
    }
  };

  const handleEdit = (card: VerseCard) => {
    // Save card state to session storage for editor to load
    if (card.editorState) {
      sessionStorage.setItem('edit_card_state', JSON.stringify(card.editorState));
      sessionStorage.setItem('edit_card_id', card.id);
      navigate(routes.cardDesigner);
      toast.success('편집 모드로 이동합니다');
    } else {
      toast.error('이 카드는 편집할 수 없어요. 새로 만들어주세요.');
      console.warn('Card has no editorState:', card);
    }
  };

  const handleDelete = async (id: string) => {
    // Find the card to delete for potential undo
    const cardToDelete = cards.find(c => c.id === id);
    if (!cardToDelete) return;

    // Immediately remove from UI
    const updated = cards.filter(c => c.id !== id);
    setCards(updated);
    setSelectedCard(null);

    // Actually delete after timeout
    const undoTimeout = setTimeout(async () => {
      try {
        await deleteCard(id);
      } catch (error) {
        console.error('Failed to delete card:', error);
        // Restore card if delete fails
        setCards(prevCards => [...prevCards, cardToDelete].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        toast.error('카드 삭제에 실패했어요');
      }
    }, 3000);

    // Show undo toast
    toast.success('카드를 삭제했어요', {
      action: {
        label: '실행 취소',
        onClick: () => {
          clearTimeout(undoTimeout);
          setCards(prevCards => [...prevCards, cardToDelete].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
          toast.success('삭제가 취소되었어요');
        }
      },
      duration: 3000, // 3 seconds to undo
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-[#EDEDED]">
        <div className="max-w-[480px] mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
          </button>

          <h1 className="text-base font-medium text-[#2E2E2E]">말씀카드 보관함</h1>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-8 pt-4">
        {/* Loading State */}
        {isLoading ? (
          /* 글자 한 줄만 띄우다가 격자가 튀어나와 화면이 밀렸다.
             들어올 자리와 같은 모양으로 미리 깔아 둔다. */
          <div className="grid grid-cols-2 gap-4" aria-busy="true" aria-label="카드 불러오는 중">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`card-skeleton-${i}`}
                aria-hidden
                className="rounded-2xl bg-white shadow-sm overflow-hidden"
              >
                <div className="aspect-[4/5] bg-[#F0EFED] animate-pulse" />
              </div>
            ))}
          </div>
        ) : cards.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {cards.map(card => (
              <div
                key={card.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedCard(card)}
              >
                {card.imageDataUrl ? (
                  <img 
                    src={card.imageDataUrl} 
                    alt={card.text}
                    className="w-full h-auto object-cover"
                  />
                ) : (
                  <div
                    className="aspect-square flex items-center justify-center p-6"
                    style={{ backgroundColor: card.bg.startsWith('#') ? card.bg : '#7B9AAC' }}
                  >
                    <div className="text-center">
                      <p className="text-white text-[14px] font-medium line-clamp-4">
                        {card.text}
                      </p>
                      {card.ref && (
                        <p className="text-white/80 text-[11px] mt-2">{card.ref}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl px-6 py-10 text-center">
            <p className="text-[14px] text-[#7E7C78] leading-relaxed mb-4">
              아직 만든 카드가 없어요.<br />
              '말씀카드 만들기'에서 시작해보세요.
            </p>
            <button
              onClick={() => navigate(routes.cardDesigner)}
              className="px-5 py-2.5 bg-[#7DB87D] text-white rounded-full text-[14px] font-medium hover:bg-[#6FA76F] transition-colors"
            >
              말씀카드 만들기
            </button>
          </div>
        )}
      </main>

      {/* Detail View Modal */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent hideCloseButton className="max-w-[90vw] max-h-[85vh] overflow-y-auto overscroll-contain p-0 bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">말씀카드</DialogTitle>
          {selectedCard && (
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full transition-colors z-10 shadow"
              >
                <X className="w-5 h-5 text-[#2E2E2E]" />
              </button>

              {/* Card Image */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                {selectedCard.imageDataUrl ? (
                  <img 
                    src={selectedCard.imageDataUrl} 
                    alt={selectedCard.text}
                    className="w-full h-auto max-h-[52vh] object-contain"
                  />
                ) : (
                  <div
                    className="aspect-square flex items-center justify-center p-8"
                    style={{ backgroundColor: selectedCard.bg.startsWith('#') ? selectedCard.bg : '#7B9AAC' }}
                  >
                    <div className="text-center max-w-md">
                      <p className="text-white text-lg font-medium mb-2">
                        {selectedCard.text}
                      </p>
                      {selectedCard.ref && (
                        <p className="text-white/80 text-sm">{selectedCard.ref}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 주된 동작 셋. 삭제는 여기 끼우지 않는다 — 되돌릴 수 없는 동작이라
                  같은 크기로 나란히 두면 잘못 눌린다. */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                  onClick={() => handleShare(selectedCard)}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 bg-[#1F1F1F] hover:bg-[#333] text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  공유
                </button>
                <button
                  onClick={() => handleDownload(selectedCard)}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 bg-[#7B9AAC] hover:bg-[#6A8A9C] text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  저장
                </button>
                <button
                  onClick={() => handleEdit(selectedCard)}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 bg-[#C89B3C] hover:bg-[#b88b2c] text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  편집
                </button>
              </div>

              {/* 삭제는 구분선 아래 글자만. 실수로 닿지 않게 두되 세로 공간은 아껴 쓴다. */}
              <div className="mt-3 pt-3 border-t border-[#EDEDED] pb-2">
                <button
                  onClick={() => setPendingDelete(selectedCard.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[#C2553A] text-sm font-medium rounded-xl hover:bg-[#FBF0EC] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제하기
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 카드 삭제는 '실행 취소' 토스트만 있고 확인이 없었다. 토스트를 놓치면 그대로 사라진다. */}
      <DeleteRecordDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        label="말씀카드"
        onConfirm={() => { if (pendingDelete) handleDelete(pendingDelete); setPendingDelete(null); }}
      />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default withAuth(CardsVault);
