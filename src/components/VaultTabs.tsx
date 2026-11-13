import { useNavigate } from 'react-router-dom';
import { routes } from '@/config/routes';

/**
 * 보관함 안의 '기록 / 말씀카드' 탭.
 *
 * 2026-11-13 사용성 점검: 말씀카드 보관함(/cards/vault)은 카드를 저장한 직후
 * '보관함에서 보기'로만 갈 수 있었다. 하단 '보관함'은 기록만 보여 줘서, 저장 창을 닫으면
 * 만든 카드를 다시 찾을 길이 없었다. 두 화면 위에 같은 탭을 두어 오가게 한다.
 */
export function VaultTabs({ active }: { active: 'records' | 'cards' }) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'records' as const, label: '기록', path: routes.records },
    { id: 'cards' as const, label: '말씀카드', path: routes.cardsVault },
  ];
  return (
    <div className="max-w-[480px] mx-auto px-6 pb-3" role="tablist" aria-label="보관함 종류">
      <div className="flex rounded-xl bg-[#F0EFED] p-[3px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => { if (active !== t.id) navigate(t.path, { replace: true }); }}
            className={`flex-1 min-h-10 rounded-[9px] text-[14px] font-medium transition-colors ${
              active === t.id ? 'bg-white text-[#1F1F1F] shadow-sm' : 'text-[#7E7C78]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
