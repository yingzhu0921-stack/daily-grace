import { useNavigate } from 'react-router-dom';
import { AppIcon, IconName } from './ui/AppIcon';
import { RecordType } from '@/utils/recordsQuery';
import { routes } from '@/config/routes';

type RecordCardProps = {
  id: string;
  type: RecordType;
  title: string;
  content: string;
  date: string;
};

const typeConfig: Record<RecordType, { icon: IconName; color: string; label: string; route: string }> = {
  meditation: { icon: 'bookOpen', color: 'rgba(125,184,125,1)', label: 'Q.T', route: routes.qt },
  prayer: { icon: 'heart', color: 'rgba(165,125,184,1)', label: '기도', route: routes.prayer },
  gratitude: { icon: 'sparkles', color: 'rgba(232,200,125,1)', label: '감사', route: routes.thanks },
  diary: { icon: 'pencilLine', color: 'rgba(221,149,125,1)', label: '일기', route: routes.diary },
};

export function RecordCard({ id, type, title, content, date }: RecordCardProps) {
  const navigate = useNavigate();
  const config = typeConfig[type];

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
          style={{ backgroundColor: config.color }}
        >
          <AppIcon name={config.icon} size={20} color="#fff" strokeWidth={1.75} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[#9B9B9B]">{config.label}</span>
            <span className="text-xs text-[#BDBDBD]">{date}</span>
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
