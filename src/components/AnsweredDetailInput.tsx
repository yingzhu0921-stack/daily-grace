import React, { useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface AnsweredDetailInputProps {
  answered: boolean;
  answeredDetail?: string;
  onAnsweredChange: (answered: boolean) => void;
  onDetailChange: (detail: string) => void;
  label?: string;
  checkboxLabel?: string;
  detailLabel?: string;
  detailPlaceholder?: string;
  categoryName?: string;
  categoryColor?: string;
}

export const AnsweredDetailInput: React.FC<AnsweredDetailInputProps> = ({
  answered,
  answeredDetail = '',
  onAnsweredChange,
  onDetailChange,
  label = '완료',
  checkboxLabel = '완료함',
  detailLabel = '응답 내용 / 간증',
  detailPlaceholder = '어떻게 응답되었는지, 은혜받은 내용을 기록해보세요',
  categoryName = '',
  categoryColor = '#A57DB8'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      const scrollPos = window.scrollY;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      textarea.style.overflowY = 'hidden';
      window.scrollTo(0, scrollPos);
    }
  };

  useEffect(() => {
    if (answered) {
      adjustTextareaHeight(textareaRef.current);
      // 체크박스를 선택하면 텍스트 영역에 포커스
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [answered, answeredDetail]);

  return (
    <section className="mb-12">
      <label className="mb-3 block text-sm text-[#9B9B9B]">{label}</label>

      {/* 응답/완료 체크박스 */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E7E5] bg-[#FAFAFA] p-4 transition-colors hover:bg-[#F5F5F5]">
        <Checkbox
          id="answered"
          checked={answered}
          onCheckedChange={(checked) => onAnsweredChange(checked as boolean)}
          className="mt-0.5"
          style={answered ? {
            borderColor: categoryColor,
            backgroundColor: categoryColor
          } : {}}
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-[#2E2E2E]">
            {categoryName} {checkboxLabel}
          </div>
          <div className="mt-1 text-xs text-[#7E7C78]">
            완료한 항목을 체크하여 관리하세요.
          </div>
        </div>
      </label>

      {/* 응답 상세 내용 입력 (체크 시에만 표시) */}
      {answered && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="mb-2 block text-sm font-medium text-[#2E2E2E]">
            {detailLabel}
          </label>
          <div className="rounded-xl border border-[#E8E7E5] bg-white p-4">
            <Textarea
              ref={textareaRef}
              value={answeredDetail}
              onChange={(e) => {
                const scrollPos = window.scrollY;
                onDetailChange(e.target.value);
                adjustTextareaHeight(e.target);
                requestAnimationFrame(() => window.scrollTo(0, scrollPos));
              }}
              placeholder={detailPlaceholder}
              className="min-h-[100px] resize-none border-none bg-transparent px-0 text-base leading-[1.8] text-[#2E2E2E] placeholder:text-[#D0D0D0] focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ overflowY: 'hidden' }}
            />
          </div>
          <p className="mt-2 text-xs text-[#ACACAC]">
            📝 응답받은 내용이나 감사한 일을 기록해보세요
          </p>
        </div>
      )}
    </section>
  );
};
