import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { MeditationNote } from '@/types/meditation';

interface MeditationViewContentProps {
  note: MeditationNote;
  onCheckChange: (checked: boolean) => void;
}

export const MeditationViewContent: React.FC<MeditationViewContentProps> = ({
  note,
  onCheckChange
}) => {
  return (
    <div className="flex-1 overflow-auto px-5 py-6 pb-32">
      {/* 제목 섹션 */}
      {note.title && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm text-[#9B9B9B]">제목</h2>
          <div className="text-lg font-semibold leading-relaxed text-[#2E2E2E]">
            {note.title}
          </div>
        </section>
      )}

      {/* 본문 섹션 */}
      {note.passage && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm text-[#9B9B9B]">본문</h2>
          <div className="whitespace-pre-wrap text-base leading-[1.8] text-[#2E2E2E]">
            {note.passage}
          </div>
        </section>
      )}

      {/* 내용 섹션 */}
      {note.content && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm text-[#9B9B9B]">내용</h2>
          <div className="whitespace-pre-wrap text-base leading-[1.8] text-[#2E2E2E]">
            {note.content}
          </div>
        </section>
      )}

      {/* 적용 섹션 */}
      {note.application && (
        <section className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Checkbox
              checked={note.applyChecked}
              onCheckedChange={onCheckChange}
            />
            <h2 className="text-sm text-[#9B9B9B]">적용</h2>
          </div>
          <div className="whitespace-pre-wrap text-base leading-[1.8] text-[#2E2E2E]">
            {note.application}
          </div>
        </section>
      )}
    </div>
  );
};
