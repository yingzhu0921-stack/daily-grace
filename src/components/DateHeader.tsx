import { CalendarDays } from "lucide-react";

export function DateHeader({
  dateLabel,
  onToday,
}: { dateLabel: string; onToday: () => void }) {
  return (
    <div className="px-5 pt-3 pb-2 space-y-2">
      {/* 라벨 행 */}
      <div className="flex items-center gap-2">
        <CalendarDays size={16} className="text-[#7C7C7C]" />
        <span className="text-[13px] font-medium text-[#7C7C7C]">오늘</span>
        <button
          onClick={onToday}
          className="ml-2 px-2 py-0.5 rounded-full border border-[#E3E2E0] text-[12px] text-[#333] hover:bg-[#F3F2F1]"
        >
          오늘로 이동
        </button>
      </div>

      {/* 날짜 타이틀 */}
      <h2 className="text-[24px] font-semibold text-[#2E2E2E]">{dateLabel}</h2>

      {/* 섬세한 구분선 */}
      <div className="mt-2 h-[1px] w-9 bg-[#E8E6E1] rounded-full" />
    </div>
  );
}
