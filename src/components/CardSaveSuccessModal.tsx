import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-md max-h-[90vh] overflow-y-auto p-0 bg-white border-none shadow-2xl">
        <DialogTitle className="sr-only">말씀카드 저장 완료</DialogTitle>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-4 right-4 ml-auto mr-4 mt-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10 bg-white/80 backdrop-blur-sm"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="p-6 pt-0">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
            카드가 저장되었습니다!
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6 px-4">
            📱 현재 기기에만 저장됩니다. 클라우드 백업은 추후 지원 예정이에요.
          </p>

          {/* Card Preview */}
          <div className="bg-gray-50 rounded-2xl overflow-hidden mb-6 shadow-sm flex items-center justify-center">
            <img
              src={cardData.imageDataUrl}
              alt="Saved card"
              className="w-full h-auto max-h-[50vh] object-contain"
            />
          </div>

          {/* Action Buttons - 3 Row Structure */}
          <div className="space-y-3">
            {/* Row 1: Primary Actions (Use this card) */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      const blob = await fetch(cardData.imageDataUrl).then(r => r.blob());
                      const file = new File([blob], 'card.png', { type: 'image/png' });
                      await navigator.share({
                        files: [file],
                        title: '말씀카드',
                      });
                    } catch (err) {
                      console.error('Share failed:', err);
                    }
                  }
                }}
                className="h-12 bg-[#7B9AAC] hover:bg-[#6A8A9C] text-white text-base font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                공유하기
              </Button>

              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `card-${Date.now()}.png`;
                  link.href = cardData.imageDataUrl;
                  link.click();
                }}
                className="h-12 bg-[#7B9AAC] hover:bg-[#6A8A9C] text-white text-base font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                저장하기
              </Button>
            </div>

            {/* Row 2: Secondary Action (Create more) */}
            <Button
              onClick={() => {
                onClose();
                onCreateNew();
              }}
              variant="outline"
              className="w-full h-12 border-2 border-[#7B9AAC] hover:bg-[#7B9AAC]/5 text-[#7B9AAC] text-base font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              새로운 카드 만들기
            </Button>

            {/* Row 3: Tertiary Navigation */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                onClick={() => {
                  onClose();
                  navigate(routes.cardsVault);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                보관함
              </button>

              <span className="text-gray-300">|</span>

              <button
                onClick={() => {
                  onClose();
                  navigate(routes.home);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                홈으로
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
