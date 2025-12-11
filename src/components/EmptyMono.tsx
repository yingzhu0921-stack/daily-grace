export function EmptyMono({ text }: { text?: string }) {
  return (
    <div className="px-6 py-10 text-center text-[#7E7C78]">
      <p className="leading-7">
        {text ?? "아직 오늘의 기록이 없어요. 마음을 담은 첫 기록을 남겨보세요."}
      </p>
    </div>
  );
}
