import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrayerResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (response: string) => void;
  initialResponse?: string;
  prayerTitle: string;
}

export function PrayerResponseModal({
  isOpen,
  onClose,
  onSave,
  initialResponse = '',
  prayerTitle,
}: PrayerResponseModalProps) {
  const [response, setResponse] = useState(initialResponse);
  // 키보드가 올라오면 줄어드는 '보이는 화면'. 창을 그 안에 둔다.
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewport({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [isOpen]);

  const handleSave = () => {
    onSave(response.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal
              2026-11-13 사용자(아이폰): 창이 화면 아래로 처져 있고 키보드가 올라오면 입력칸이 가려졌다.
              움직임 효과(scale·y)가 transform 을 덮어써서 '-translate-y-1/2' 가운데 맞춤이 사라졌기 때문.
              위치는 움직이지 않는 바깥 틀이 맡고, 키보드를 뺀 '보이는 화면'(visualViewport) 안에서 가운데에 둔다. */}
          <div
            className="fixed inset-x-0 z-50 flex items-center justify-center px-4 pointer-events-none"
            style={viewport ? { top: viewport.top, height: viewport.height } : { top: 0, bottom: 0 }}
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="pointer-events-auto w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-y-auto overscroll-contain"
            style={{ maxHeight: viewport ? viewport.height - 24 : '90vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
              <h2 className="text-lg font-semibold text-[#2E2E2E]">기도 응답 기록</h2>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#F3F2F1] rounded-full transition-colors"
              >
                <X size={20} className="text-[#8B8B8B]" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#8B8B8B] mb-2">
                  기도 제목
                </label>
                <div className="text-base text-[#2E2E2E] font-medium bg-[#FAF9F7] px-4 py-3 rounded-xl">
                  {prayerTitle}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-2">
                  응답 내용 <span className="text-[#BDBDBD] text-xs">(선택사항)</span>
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="하나님께서 어떻게 응답하셨나요? (입력하지 않아도 됩니다)"
                  className="w-full h-40 px-4 py-3 rounded-xl border border-[#E3E2E0] focus:border-[#A57DB8] focus:ring-2 focus:ring-[#A57DB8]/20 outline-none resize-none text-[15px] text-[#2E2E2E] placeholder:text-[#BDBDBD]"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-[#F0EFED]">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-[#F3F2F1] hover:bg-[#E3E2E0] text-[#2E2E2E] font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex-1 h-11 rounded-xl bg-[#A57DB8] hover:bg-[#956daa] text-white font-medium transition-colors"
              >
                저장
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
