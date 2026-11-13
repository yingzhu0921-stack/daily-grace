import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { Drawer } from 'vaul';
import { DeleteRecordDialog } from '@/components/DeleteRecordDialog';
import { withAuth } from '@/components/auth/withAuth';
import { routes } from '@/config/routes';
import { toast } from 'sonner';
import { BottomNav } from '@/components/BottomNav';
import { VaultTabs } from '@/components/VaultTabs';
import { prepareCardFile, saveCardFile, shareCardFile, saveImageLabel } from '@/utils/cardImageActions';
import { getAllCards, deleteCard, migrateFromLocalStorage, type VerseCard } from '@/utils/verseCardDB';

/** 시트 제목: 출처(예: 요 3:16)가 있으면 그것, 없으면 말씀 첫 줄. */
function cardTitle(card: VerseCard): string {
  if (card.ref?.trim()) return card.ref.trim();
  const first = (card.text || '').split('\n').map((l) => l.trim()).find(Boolean) || '말씀카드';
  return first.length > 22 ? `${first.slice(0, 22)}…` : first;
}

function cardDate(card: VerseCard): string {
  const d = new Date(card.createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const CardsVault: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<VerseCard[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<VerseCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 아이폰은 누른 순간에만 공유 창을 열어 준다 → 카드를 열 때 이미지 파일을 미리 만들어 둔다.
  const [cardFile, setCardFile] = useState<File | null>(null);
  useEffect(() => {
    setCardFile(null);
    if (!selectedCard) return;
    let alive = true;
    prepareCardFile(selectedCard.imageDataUrl, selectedCard.id).then((f) => { if (alive) setCardFile(f); });
    return () => { alive = false; };
  }, [selectedCard]);

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
    <div className="min-h-screen bg-[#F6F3EC] pb-nav">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#F6F3EC]/95 backdrop-blur-sm border-b border-[#EDEDED]">
        <div className="max-w-[480px] mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
          </button>

          <h1 className="text-base font-medium text-[#2E2E2E]">보관함</h1>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
        <VaultTabs active="cards" />
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
          /* items-start 가 없으면 한 줄의 칸이 가장 높은 카드에 맞춰 늘어난다.
             가로가 넓은 카드(16:9 등)는 이미지가 짧아 칸의 흰 바탕이 아래에 남았다.
             이미지에 흰 여백이 있는 게 아니라 칸이 남은 것이다. */
          <div className="grid grid-cols-2 gap-4 items-start">
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

      {/* 카드 자세히 보기 — 아래에서 올라오는 시트.
          2026-11-13 사용자: 보관함만 시안(보관함 화면) 레이아웃으로. 색·글꼴은 지금 앱 그대로.
          저장·공유는 저장 완료 창과 같은 공용 함수(cardImageActions)를 쓴다. */}
      <Drawer.Root
        open={!!selectedCard}
        onOpenChange={(open) => { if (!open) setSelectedCard(null); }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94vh] max-w-[480px] flex-col rounded-t-[28px] bg-white outline-none shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          >
            <span aria-hidden className="mx-auto mt-3 h-[5px] w-10 shrink-0 rounded-full bg-[#E5E4E1]" />
            <Drawer.Title className="sr-only">말씀카드</Drawer.Title>
            {selectedCard && (
              <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
                {selectedCard.imageDataUrl ? (
                  <img
                    src={selectedCard.imageDataUrl}
                    alt={selectedCard.text}
                    className="mx-auto block h-auto w-auto max-w-[260px] max-h-[52vh] rounded-[18px] shadow-[0_4px_14px_rgba(0,0,0,0.10)]"
                  />
                ) : (
                  <div
                    className="mx-auto flex aspect-square w-[260px] max-w-full items-center justify-center rounded-[18px] p-6"
                    style={{ backgroundColor: selectedCard.bg.startsWith('#') ? selectedCard.bg : '#7B9AAC' }}
                  >
                    <div className="text-center">
                      <p className="mb-2 text-base font-medium text-white line-clamp-6">{selectedCard.text}</p>
                      {selectedCard.ref && <p className="text-sm text-white/80">{selectedCard.ref}</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-bold text-[#2E2E2E]">{cardTitle(selectedCard)}</p>
                    <p className="text-[12px] text-[#7E7C78]">{cardDate(selectedCard)}</p>
                  </div>
                  {/* 지우기는 되돌릴 수 없어서 주 버튼 줄에 끼우지 않고 따로 둔다(누르면 확인 창). */}
                  <button
                    onClick={() => setPendingDelete(selectedCard.id)}
                    aria-label="카드 지우기"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F7EDE6] text-[#A9573A] transition-colors hover:bg-[#F2E2D8]"
                  >
                    <Trash2 className="h-[19px] w-[19px]" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => saveCardFile(cardFile)}
                    className="h-[50px] rounded-full bg-[#1F1F1F] text-[14.5px] font-bold text-white transition-colors hover:bg-[#333]"
                  >
                    {saveImageLabel()}
                  </button>
                  <button
                    onClick={() => shareCardFile(cardFile)}
                    className="h-[50px] rounded-full border-[1.5px] border-[#E8E7E5] bg-white text-[14.5px] font-medium text-[#2E2E2E] transition-colors hover:bg-[#F9F8F6]"
                  >
                    공유
                  </button>
                  <button
                    onClick={() => handleEdit(selectedCard)}
                    className="h-[50px] rounded-full border-[1.5px] border-[#E8E7E5] bg-white text-[14.5px] font-medium text-[#2E2E2E] transition-colors hover:bg-[#F9F8F6]"
                  >
                    편집
                  </button>
                </div>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

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
