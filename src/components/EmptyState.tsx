import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export const EmptyState: React.FC = () => {
  const handleClearData = () => {
    if (confirm('모든 묵상 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem('meditation_notes');
      localStorage.removeItem('meditation_drafts');
      toast({
        title: "데이터 초기화 완료",
        description: "페이지를 새로고침합니다.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="flex w-full flex-col items-center text-sm sm:text-base text-[rgba(107,107,112,1)] font-normal text-center leading-relaxed justify-center mt-6 px-4 py-2 gap-4">
      <p>
        아직 오늘의 기록이 없어요 🌤 마음을 담은 첫 기록을 남겨보세요.
      </p>
      <Button
        variant="outline"
        onClick={handleClearData}
        className="text-xs text-[#9B9B9B] border-[#E5E5EA]"
      >
        데이터 초기화 (개발용)
      </Button>
    </div>
  );
};
