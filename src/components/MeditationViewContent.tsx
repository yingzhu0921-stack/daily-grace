import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { MeditationNote } from '@/types/meditation';

interface MeditationViewContentProps {
  note: MeditationNote;
  onCheckChange: (index: number, checked: boolean) => void;
}

export const MeditationViewContent: React.FC<MeditationViewContentProps> = ({
  note,
  onCheckChange
}) => {
  // applications 배열이 있으면 사용, 없으면 application 문자열을 배열로 변환
  const displayApplications = note.applications && note.applications.length > 0
    ? note.applications
    : note.application
      ? [{ text: note.application, checked: note.applyChecked || false }]
      : [];

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
      {displayApplications.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm text-[#9B9B9B]">적용</h2>
          <div className="space-y-3">
            {displayApplications.map((item, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="pt-1">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(checked) => onCheckChange(index, checked as boolean)}
                    className="w-5 h-5 rounded-md"
                    style={{
                      borderColor: item.checked ? '#7DB87D' : undefined,
                      backgroundColor: item.checked ? '#7DB87D' : undefined,
                    }}
                  />
                </div>
                <div className={`flex-1 text-base leading-[1.8] ${
                  item.checked ? 'text-[#ACACAC] line-through' : 'text-[#2E2E2E]'
                }`}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
