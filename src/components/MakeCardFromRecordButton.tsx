import { useNavigate } from 'react-router-dom';
import { LineIcon } from '@/components/ui/LineIcon';
import { routes } from '@/config/routes';

/**
 * 기록 화면의 '이 기록으로 카드 만들기'.
 *
 * 2026-11-13 사용성 점검: 기록을 다 쓰고 열어도 수정·공유·삭제만 있어서, 카드로 남기려면
 * 카드 만들기 탭으로 가서 '내 기록에서 가져오기'로 같은 기록을 다시 찾아야 했다.
 * 문구를 sessionStorage 로 넘기면 카드 만들기가 '카드 내용 입력' 단계에 미리 채워 둔다.
 */
export function MakeCardFromRecordButton({ text, recordId }: { text: string; recordId?: string }) {
  const navigate = useNavigate();
  const phrase = text.trim();
  if (!phrase) return null;
  return (
    <button
      onClick={() => {
        // 새 카드다. 보관함에서 '편집'으로 열다 만 카드 상태가 남아 있으면 그 카드를 덮어쓰게 되므로 지운다(Codex 지적).
        sessionStorage.removeItem('edit_card_state');
        sessionStorage.removeItem('edit_card_id');
        sessionStorage.setItem('card_prefill_text', phrase);
        // 기록 id 를 함께 넘기면 카드 만들기가 '카드에 담을 문구' 창을 이 기록으로 연다(본문·묵상·AI 추천 중 고르기).
        if (recordId) sessionStorage.setItem('card_prefill_record', recordId);
        else sessionStorage.removeItem('card_prefill_record');
        navigate(routes.cardDesigner);
      }}
      className="w-full mt-6 py-3 rounded-full text-[15px] font-semibold text-white bg-[#1E1C1A] hover:bg-[#333333] transition-colors flex items-center justify-center gap-2"
    >
      {/* 하단 메뉴 '카드 만들기'와 같은 새싹 카드 아이콘(2026-11-13 사용자: 아이콘 통일) */}
      <LineIcon name="card" size={18} color="#FFFFFF" />
      이 기록으로 카드 만들기
    </button>
  );
}
