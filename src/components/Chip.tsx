export function Chip({
  active, onClick, children, className = ''
}: { active?: boolean; onClick?: (e: React.MouseEvent<HTMLButtonElement>)=>void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px]",
        "border transition-colors",
        active
          ? "bg-[#E9F3EC] text-[#2F6B48] border-[#D9EADF]"
          : "bg-white text-[#6B6B6B] border-[#E7E5E0] hover:bg-[#F6F5F2]",
        className
      ].join(' ')}
    >
      <span aria-hidden>✔</span>
      {children}
    </button>
  );
}
