import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Download, Share2, Home, Archive } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';
import { prepareCardFile, saveCardFile, shareCardFile, saveImageLabel } from '@/utils/cardImageActions';

type CardSaveSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  cardData: {
    imageDataUrl: string;
    text: string;
  };
  /** 예전 '새 카드 만들기' 버튼용. 버튼은 뺐지만 부르는 쪽 호환을 위해 남겨 둔다. */
  onCreateNew?: () => void;
};

export const CardSaveSuccessModal: React.FC<CardSaveSuccessModalProps> = ({
  open,
  onClose,
  cardData,
}) => {
  const navigate = useNavigate();
  // 공유 버튼 클릭 직후 호출할 수 있도록 파일은 미리 준비한다. 저장·공유 방식은 보관함과 같은 공용 함수(cardImageActions).
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  React.useEffect(() => {
    let alive = true;
    prepareCardFile(cardData.imageDataUrl).then((f) => { if (alive) setImageFile(f); });
    return () => { alive = false; };
  }, [cardData.imageDataUrl]);

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose(); }}>
      <DialogContent hideCloseButton className="w-[calc(100%-32px)] max-w-md max-h-[90vh] overflow-y-auto p-0 bg-white border-none shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">말씀카드 저장 완료</DialogTitle>

        {/* 닫기 — 편집 화면으로 돌아간다. 저장한 카드를 이어서 고치고 싶을 때를 위해 남겨 둔다. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="sticky top-3 ml-auto mr-3 mt-3 p-2 rounded-full bg-white/90 hover:bg-[#F4F3F1] transition-colors z-10 outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20"
        >
          <X className="w-5 h-5 text-[#7E7C78]" />
        </button>

        <div className="px-5 pb-5 -mt-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-11 h-11 rounded-full bg-[#1F1F1F] flex items-center justify-center">
              <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="mt-3 text-[17px] font-semibold text-[#2E2E2E]">보관함에 저장했어요</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#7E7C78]">
              언제든 보관함 › 말씀카드에서 다시 볼 수 있어요.
            </p>
          </div>

          <div className="mt-4 rounded-2xl overflow-hidden bg-[#F4F3F1] flex items-center justify-center">
            <img
              src={cardData.imageDataUrl}
              alt="저장한 말씀카드"
              className="w-full h-auto max-h-[46vh] object-contain"
            />
          </div>

          {/* 이 카드로 할 일 */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => saveCardFile(imageFile)}
              className="h-12 rounded-xl bg-[#1F1F1F] hover:bg-[#333333] text-white text-[14px] font-medium flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              {saveImageLabel()}
            </Button>
            <Button
              onClick={() => shareCardFile(imageFile)}
              variant="outline"
              className="h-12 rounded-xl border border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] text-[#2E2E2E] text-[14px] font-medium flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              공유하기
            </Button>
          </div>

          {/* 다음에 갈 곳. 2026-11-13 사용성 점검: 버튼이 6개(기기에 저장·공유·홈·새 카드·보관함·파일 다운로드)라
              헷갈렸다. '기기에 저장'과 '파일로 다운로드'는 같은 일이라 하나로 합쳤고(공유를 못 쓰면 다운로드로 넘어간다),
              '새 카드 만들기'는 하단 탭에 있어 뺐다. */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                onClose();
                navigate(routes.cardsVault);
              }}
              variant="outline"
              className="h-12 rounded-xl border border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] text-[#2E2E2E] text-[14px] font-medium flex items-center justify-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              보관함에서 보기
            </Button>
            <Button
              onClick={() => {
                onClose();
                navigate(routes.home);
              }}
              variant="outline"
              className="h-12 rounded-xl border border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] text-[#2E2E2E] text-[14px] font-medium flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              홈으로
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
