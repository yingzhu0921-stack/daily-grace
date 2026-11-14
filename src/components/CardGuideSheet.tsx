import React from 'react';
import { Drawer } from 'vaul';
import { Wand2, Type } from 'lucide-react';
import { LineIcon } from '@/components/ui/LineIcon';

/**
 * 카드 만들기 첫 안내(2026-11-14 사용자 승인 시안). 두 방식(완전 자동·직접 편집)을 한 장으로 알려 준다.
 * '다시 보지 않기'를 누르기 전까지는 처음 들어올 때 한 번씩(세션마다 한 번) 뜨고, 첫 화면의 ? 버튼으로 언제든 다시 본다.
 */
export const CARD_GUIDE_SEEN_KEY = 'card_guide_dismissed';
export const CARD_GUIDE_SESSION_KEY = 'card_guide_shown_session';

export function shouldAutoShowCardGuide(): boolean {
  try {
    if (localStorage.getItem(CARD_GUIDE_SEEN_KEY) === '1') return false;
    if (sessionStorage.getItem(CARD_GUIDE_SESSION_KEY) === '1') return false;
    return true;
  } catch {
    return false;
  }
}

export function markCardGuideShownThisSession() {
  try { sessionStorage.setItem(CARD_GUIDE_SESSION_KEY, '1'); } catch { /* 다시 떠도 괜찮다 */ }
}

export function CardGuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dismissForever = () => {
    try { localStorage.setItem(CARD_GUIDE_SEEN_KEY, '1'); } catch { /* 저장 못 해도 닫기는 한다 */ }
    onClose();
  };
  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] rounded-t-[24px] border-t border-[rgba(30,28,26,0.12)] bg-[#F6F3EC] px-4 pt-2.5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] outline-none"
        >
          <span aria-hidden className="mx-auto mb-4 block h-[5px] w-10 rounded-full bg-[rgba(30,28,26,0.16)]" />
          <Drawer.Title className="text-[17px] font-bold tracking-[-0.02em] text-[#1E1C1A]">말씀카드는 두 가지로 만들어요</Drawer.Title>
          <p className="mt-1 mb-3.5 text-[12.5px] text-[#8A8278]">처음이라면 완전 자동부터 해 보세요.</p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl border border-[rgba(30,28,26,0.12)] bg-white p-2.5 pr-3">
              <img src="/template-previews/T03.jpg" alt="" className="h-[68px] w-[54px] shrink-0 rounded-[10px] border border-[rgba(30,28,26,0.12)] object-cover" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[14px] font-bold text-[#1E1C1A]">
                  <Wand2 className="h-4 w-4" />완전 자동
                  <span className="rounded-full bg-[#F1EDE5] px-1.5 py-[1px] text-[10.5px] font-semibold text-[#6E675E]">추천</span>
                </p>
                <p className="mt-0.5 text-[12px] leading-[1.5] text-[#6E675E] [word-break:keep-all]">
                  말씀만 넣으면 AI가 그림과 글씨 배치까지 해요. 내용 → 스타일 → 확인, 30초쯤 걸려요.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[rgba(30,28,26,0.12)] bg-white p-2.5 pr-3">
              <img src="/manual-previews/watercolor.jpg?v=1" alt="" className="h-[68px] w-[54px] shrink-0 rounded-[10px] border border-[rgba(30,28,26,0.12)] object-cover" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[14px] font-bold text-[#1E1C1A]"><Type className="h-4 w-4" />직접 편집</p>
                <p className="mt-0.5 text-[12px] leading-[1.5] text-[#6E675E] [word-break:keep-all]">
                  배경(AI 그림·내 사진·단색)을 고르고 글씨를 직접 놓아 꾸며요.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-2.5 mb-4 flex items-center gap-1.5 px-0.5 text-[12px] text-[#6E675E]">
            <LineIcon name="bulb" size={14} color="#6E675E" />
            내 Q.T·기도 기록에서 문구를 바로 가져올 수도 있어요.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={dismissForever}
              className="h-11 flex-1 rounded-full border border-[rgba(30,28,26,0.14)] bg-white text-[13.5px] font-semibold text-[#6E675E]"
            >
              다시 보지 않기
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-full bg-[#1E1C1A] text-[13.5px] font-semibold text-white"
            >
              시작하기
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
