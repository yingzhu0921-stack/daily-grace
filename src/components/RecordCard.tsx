import { useNavigate } from 'react-router-dom';
import { AppIcon, IconName } from './ui/AppIcon';
import { RecordType } from '@/utils/recordsQuery';
import { routes } from '@/config/routes';
import { normalizeColor } from '@/utils/categoryStorage';

type RecordCardProps = {
  id: string;
  /** 기본 네 종류이거나, 커스텀 카테고리의 id */
  type: RecordType | string;
  title: string;
  content: string;
  date: string;
  /** 커스텀 기록일 때만 온다 */
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
};

// 색·아이콘은 홈 카테고리 카드(src/pages/Index.tsx defaultCategories)와 같게 둔다.
// 전에는 진한 색 배경에 흰 아이콘, 감사는 반짝이 아이콘이라 홈과 다른 앱처럼 보였다.
const typeConfig: Record<RecordType, { icon: IconName; color: string; label: string; route: string }> = {
  meditation: { icon: 'bookOpen', color: '#7DB87D', label: 'Q.T', route: routes.qt },
  prayer: { icon: 'heart', color: '#A57DB8', label: '기도', route: routes.prayer },
  gratitude: { icon: 'star', color: '#E8C87D', label: '감사', route: routes.thanks },
  diary: { icon: 'pencilLine', color: '#DD957D', label: '일기', route: routes.diary },
};

/** 홈 아이콘 배경과 같은 진하기(16%). 6자리 hex 가 아니면 color-mix 로 같은 효과를 낸다. */
const tint = (color: string) =>
  /^#[0-9a-f]{6}$/i.test(color) ? `${color}28` : `color-mix(in srgb, ${color} 16%, transparent)`;

export function RecordCard({ id, type, title, content, date, categoryId, categoryName, categoryColor, categoryIcon }: RecordCardProps) {
  const navigate = useNavigate();
  // 커스텀 카테고리는 typeConfig 에 없다. 그대로 두면 config 가 undefined 라 터진다.
  const config = typeConfig[type as RecordType] ?? {
    // 커스텀 카테고리는 홈 카드처럼 그 카테고리의 아이콘을 쓴다(전엔 모두 연필).
    icon: (categoryIcon || 'pencilLine') as IconName,
    color: normalizeColor(categoryColor || '#7BA8DB'),
    label: categoryName || '기록',
    route: `/custom/${categoryId || type}`,
  };

  const handleClick = () => {
    navigate(`${config.route}/${id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: tint(config.color) }}
        >
          <AppIcon name={config.icon} size={20} color={config.color} strokeWidth={1.5} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[#6E6E6E]">{config.label}</span>
            <span className="text-xs text-[#767676]">{date}</span>
          </div>
          
          <h3 className="text-[15px] font-semibold text-[#2E2E2E] mb-1 truncate">
            {title}
          </h3>
          
          <p className="text-[13px] text-[#7E7C78] line-clamp-2">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
