import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Download, Share2, Home, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';
import { toast } from 'sonner';

type CardSaveSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  cardData: {
    imageDataUrl: string;
    text: string;
  };
  onCreateNew: () => void;
};

export const CardSaveSuccessModal: React.FC<CardSaveSuccessModalProps> = ({
  open,
  onClose,
  cardData,
  onCreateNew,
}) => {
  const navigate = useNavigate();
  // 공유 버튼 클릭 직후 호출할 수 있도록 파일은 미리 준비합니다.
  const imageFile = React.useMemo(() => {
    try {
      const [header, encoded] = cardData.imageDataUrl.split(',');
      const mime = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/)?.[1];
      if (!mime || !encoded) return null;
      const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
      return new File([bytes], `card-${Date.now()}.${extension}`, { type: mime });
    } catch { return null; }
  }, [cardData.imageDataUrl]);

  const download = () => {
    const link = document.createElement('a');
    link.download = imageFile?.name || `card-${Date.now()}.png`;
    link.href = cardData.imageDataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.info('다운로드를 요청했어요. 기기의 다운로드 목록을 확인해주세요.');
  };

  const share = async (saveToDevice = false) => {
    if (!imageFile || !navigator.canShare?.({ files: [imageFile] })) {
      if (saveToDevice) download();
      else toast.info('이 브라우저는 이미지 공유를 지원하지 않아요. 기기에 다운로드한 뒤 공유해주세요.');
      return;
    }
    try {
      await navigator.share({ files: [imageFile], title: '말씀카드' });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error('공유 창을 열지 못했어요. 다운로드를 이용해주세요.');
    }
  };

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
            <h2 className="mt-3 text-[17px] font-semibold text-[#2E2E2E]">카드를 저장했어요</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#7E7C78]">
              보관함에 담았어요. 휴대폰에도 남기려면 기기에 저장을 눌러주세요.
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
              onClick={() => share(true)}
              className="h-12 rounded-xl bg-[#1F1F1F] hover:bg-[#333333] text-white text-[14px] font-medium flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              기기에 저장
            </Button>
            <Button
              onClick={() => share()}
              variant="outline"
              className="h-12 rounded-xl border border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] text-[#2E2E2E] text-[14px] font-medium flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              공유하기
            </Button>
          </div>

          {/* 다음에 갈 곳. 전에는 '홈으로'가 맨 아래 작은 회색 글씨라 안 보였고, 창을 닫으면 미리보기로
              돌아가 단계를 하나씩 거꾸로 밟아야 홈이었다. */}
          <div className="mt-2 grid grid-cols-2 gap-2">
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
            <Button
              onClick={() => {
                onClose();
                onCreateNew();
              }}
              variant="outline"
              className="h-12 rounded-xl border border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] text-[#2E2E2E] text-[14px] font-medium flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              새 카드 만들기
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3 text-[12px] text-[#7E7C78]">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(routes.cardsVault);
              }}
              className="underline underline-offset-2 hover:text-[#2E2E2E]"
            >
              보관함에서 보기
            </button>
            <span className="text-[#D9D8D5]">|</span>
            <button type="button" onClick={download} className="underline underline-offset-2 hover:text-[#2E2E2E]">
              파일로 다운로드
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
