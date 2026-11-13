import { useNavigate } from 'react-router-dom';
import { Palette } from 'lucide-react';
import { routes } from '@/config/routes';

/**
 * 기록 화면의 '이 기록으로 카드 만들기'.
 *
 * 2026-11-13 사용성 점검: 기록을 다 쓰고 열어도 수정·공유·삭제만 있어서, 카드로 남기려면
 * 카드 만들기 탭으로 가서 '내 기록에서 가져오기'로 같은 기록을 다시 찾아야 했다.
 * 문구를 sessionStorage 로 넘기면 카드 만들기가 '카드 내용 입력' 단계에 미리 채워 둔다.
 */
export function MakeCardFromRecordButton({ text }: { text: string }) {
  const navigate = useNavigate();
  const phrase = text.trim();
  if (!phrase) return null;
  return (
    <button
      onClick={() => {
        sessionStorage.setItem('card_prefill_text', phrase);
        navigate(routes.cardDesigner);
      }}
      className="w-full mt-6 py-3 rounded-xl text-[15px] font-semibold text-white bg-[#1F1F1F] hover:bg-[#333333] transition-colors flex items-center justify-center gap-2"
    >
      <Palette className="w-4 h-4" />
      이 기록으로 카드 만들기
    </button>
  );
}
