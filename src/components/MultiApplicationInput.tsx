import React, { useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export type ApplicationItem = {
  text: string;
  checked: boolean;
};

interface MultiApplicationInputProps {
  values: string[] | ApplicationItem[];
  onChange: (values: string[] | ApplicationItem[]) => void;
  label?: string;
  placeholder?: string;
  categoryColor?: string;
  showCheckboxes?: boolean;
}

export const MultiApplicationInput: React.FC<MultiApplicationInputProps> = ({
  values,
  onChange,
  label = '적용',
  placeholder = '오늘의 적용점을 기록하세요',
  categoryColor = '#7DB87D',
  showCheckboxes = true
}) => {
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // values를 ApplicationItem[] 형태로 정규화
  const normalizedValues: ApplicationItem[] = values.map(v =>
    typeof v === 'string' ? { text: v, checked: false } : v
  );

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
    // 모든 textarea의 높이 조절
    textareaRefs.current.forEach(ref => adjustTextareaHeight(ref));
  }, [values]);

  const handleValueChange = (index: number, text: string) => {
    const newValues = [...normalizedValues];
    newValues[index] = { ...newValues[index], text };
    onChange(newValues);
  };

  const handleCheckChange = (index: number, checked: boolean) => {
    const newValues = [...normalizedValues];
    newValues[index] = { ...newValues[index], checked };
    onChange(newValues);
  };

  const handleAddNew = () => {
    onChange([...normalizedValues, { text: '', checked: false }]);
    // 새로운 필드에 포커스를 주기 위해 다음 틱까지 기다림
    setTimeout(() => {
      const lastIndex = textareaRefs.current.length - 1;
      textareaRefs.current[lastIndex]?.focus();
    }, 0);
  };

  const handleRemove = (index: number) => {
    const newValues = normalizedValues.filter((_, i) => i !== index);
    onChange(newValues.length === 0 ? [{ text: '', checked: false }] : newValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    // Enter 키를 누르면 새로운 필드 추가 (Shift+Enter는 줄바꿈)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      // 현재 값이 비어있지 않을 때만 새 필드 추가
      if (normalizedValues[index].text.trim()) {
        handleAddNew();
      }
    }
  };

  // 값이 없으면 최소 하나의 빈 입력 필드 표시
  const displayValues = normalizedValues.length === 0 ? [{ text: '', checked: false }] : normalizedValues;

  return (
    <section className="mb-12">
      <label className="mb-2 block text-sm text-[#9B9B9B]">{label}</label>
      <div className="space-y-3">
        {displayValues.map((item, index) => (
          <div key={index} className="flex gap-3 items-start">
            {showCheckboxes && (
              <div className="pt-3">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => handleCheckChange(index, checked as boolean)}
                  className="w-5 h-5 rounded-md"
                  style={{
                    borderColor: item.checked ? categoryColor : undefined,
                    backgroundColor: item.checked ? categoryColor : undefined,
                  }}
                />
              </div>
            )}
            <div className="flex-1 relative">
              <Textarea
                ref={(el) => { textareaRefs.current[index] = el; }}
                value={item.text}
                onChange={(e) => {
                  const scrollPos = window.scrollY;
                  handleValueChange(index, e.target.value);
                  adjustTextareaHeight(e.target);
                  requestAnimationFrame(() => window.scrollTo(0, scrollPos));
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={`${placeholder} ${displayValues.length > 1 ? `#${index + 1}` : ''}`}
                className={`min-h-[60px] resize-none border-none bg-transparent px-0 text-base leading-[1.8] placeholder:text-[#D0D0D0] focus-visible:ring-0 focus-visible:ring-offset-0 ${
                  item.checked ? 'text-[#ACACAC] line-through' : 'text-[#2E2E2E]'
                }`}
                style={{ overflowY: 'hidden' }}
              />
            </div>
            {displayValues.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="mt-2 p-1.5 rounded-lg hover:bg-[#F3F2F1] transition-colors"
                aria-label="항목 삭제"
              >
                <X className="w-4 h-4 text-[#ACACAC]" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddNew}
        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] transition-colors text-sm text-[#7C7C7C]"
        style={{ borderColor: `${categoryColor}40` }}
      >
        <Plus className="w-4 h-4" style={{ color: categoryColor }} />
        <span>적용점 추가하기</span>
      </button>

      <p className="mt-2 text-xs text-[#ACACAC]">
        💡 Enter 키를 누르면 새로운 적용점을 추가할 수 있어요
      </p>
    </section>
  );
};
