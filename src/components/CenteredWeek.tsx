import React from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
  onToday?: () => void;
};

export default function CenteredWeek({ selectedDate, onDateSelect, onToday }: Props) {
  const sel = new Date(selectedDate); sel.setHours(0,0,0,0);
  const todayStr = new Date().toISOString().split("T")[0];

  // 주 시작(일요일 기준)
  const getWeekStart = (d: Date) => {
    const copy = new Date(d);
    const day = copy.getDay();
    copy.setDate(copy.getDate() - day);
    copy.setHours(0,0,0,0);
    return copy;
  };

  const weekStart = getWeekStart(sel);
  const weekKey = weekStart.toISOString().slice(0,10);

  // 선택된 날짜를 중앙에 두고 좌우 3일씩
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sel);
    d.setDate(sel.getDate() + (i - 3));
    return d;
  });

  const moveWeek = (delta: number) => {
    const d = new Date(sel);
    d.setDate(sel.getDate() + delta * 7);
    onDateSelect(d);
  };

  const cell = (d: Date) => {
    const isSel = d.toDateString() === sel.toDateString();
    const isToday = d.toISOString().split("T")[0] === todayStr;
    return (
      <button
        key={d.toISOString()}
        onClick={()=>onDateSelect(d)}
        className={[
          "h-[64px] rounded-2xl flex flex-col items-center justify-center",
          "text-center transition-colors duration-150 select-none",
          isSel
            ? "bg-[#333] text-white shadow-[0_3px_8px_rgba(0,0,0,.10)]"
            : "bg-white text-[#2E2E2E] hover:bg-[#F3F2F1] border border-[#EFEDE8]"
        ].join(" ")}
      >
        <span className={`text-[11px] mb-0.5 ${isSel ? "text-white/80" : "text-[#A3A1A0]"}`}>
          {"일월화수목금토"[d.getDay()]}
        </span>
        <span className="text-[15px] font-semibold leading-none">{d.getDate()}</span>
        {!isSel && isToday && <i className="mt-0.5 block w-1.5 h-1.5 rounded-full bg-[#333]" />}
      </button>
    );
  };

  const dir = Math.sign(sel.getTime() - weekStart.getTime()) || 1;

  return (
    <div className="px-5">
      {/* 상단 컨트롤 */}
      <div className="flex items-center justify-between pt-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#7C7C7C]">오늘</span>
          {onToday && (
            <button
              onClick={onToday}
              className="px-2 py-0.5 rounded-full border border-[#E3E2E0] text-[12px] text-[#333] hover:bg-[#F3F2F1]"
            >
              오늘로 이동
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={()=>moveWeek(-1)}
            aria-label="이전 주"
            className="w-7 h-7 rounded-full bg-white border border-[#EDEBE6] hover:bg-[#F3F2F1] flex items-center justify-center text-[#333]"
          >‹</button>
          <button
            onClick={()=>moveWeek(1)}
            aria-label="다음 주"
            className="w-7 h-7 rounded-full bg-white border border-[#EDEBE6] hover:bg-[#F3F2F1] flex items-center justify-center text-[#333]"
          >›</button>
        </div>
      </div>

      {/* 고정 높이 컨테이너로 레이아웃 점프 방지 */}
      <div className="relative h-[68px] will-change-transform">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={weekKey}
            custom={dir}
            initial={{ x: dir > 0 ? 24 : -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir > 0 ? -24 : 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.6 }}
            className="grid grid-cols-7 gap-1.5 absolute inset-0"
          >
            {days.map(cell)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 달력 아래 여백 확보 */}
      <div className="mt-3" />
    </div>
  );
}
