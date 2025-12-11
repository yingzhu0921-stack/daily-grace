export function WeekRailMono({
  days, selected, onSelect,
}: { days: Date[]; selected: Date; onSelect: (d: Date) => void }) {
  const selKey = selected.toDateString();
  const todayKey = new Date().toDateString();

  return (
    <div className="px-5">
      <div className="flex gap-10 overflow-x-auto no-scrollbar py-2">
        {days.map((d) => {
          const isSel = d.toDateString() === selKey;
          const isToday = d.toDateString() === todayKey;
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelect(d)}
              className={`w-[72px] h-[110px] rounded-[28px] flex flex-col items-center justify-center transition-all duration-200 flex-shrink-0
                ${isSel ? "bg-[#333] text-white shadow-[0_6px_14px_rgba(0,0,0,0.12)]"
                        : "bg-white text-[#2E2E2E] hover:bg-[#F3F2F1]"}`}
            >
              <span className={`text-[16px] mb-3 ${isSel ? "text-white/85" : "text-[#9B9B9B]"}`}>
                {"일월화수목금토"[d.getDay()]}
              </span>
              <span className="text-[22px] font-semibold leading-none">
                {d.getDate()}
              </span>
              {/* 오늘 점 표시(아주 미세하게) */}
              {!isSel && isToday && <i className="mt-2 block w-1.5 h-1.5 rounded-full bg-[#333]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
