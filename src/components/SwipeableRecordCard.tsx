import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { RecordCard } from './RecordCard';
import { SwipeableItem } from './SwipeableItem';
import { deleteRecord, recordEditPath } from '@/utils/recordActions';
import type { UnifiedRecord } from '@/utils/recordsQuery';

const TYPE_LABEL: Record<string, string> = {
  meditation: 'Q.T 기록', prayer: '기도 기록', gratitude: '감사 기록', diary: '일기',
};

/**
 * 여러 종류가 섞인 기록 목록(홈 최근 기록·보관함·캘린더)용. 왼쪽으로 밀면 [수정] [삭제].
 * 삭제는 한 번 묻고, 지운 뒤에는 저장소가 'recordsUpdated' 를 쏘므로 목록은 그 신호로 다시 그린다.
 */
export function SwipeableRecordCard(record: UnifiedRecord) {
  const navigate = useNavigate();
  const label = TYPE_LABEL[record.type] ?? `${record.categoryName || ''} 기록`.trim();

  return (
    <SwipeableItem
      onEdit={() => navigate(recordEditPath(record))}
      onDelete={async () => {
        try {
          await deleteRecord(record);
          toast.success('기록을 삭제했어요');
        } catch {
          toast.error('삭제하지 못했어요. 다시 시도해 주세요.');
        }
      }}
      editColor="#8C8A86"
      deleteColor="#E06B6B"
      deleteLabel={label}
    >
      <RecordCard {...record} />
    </SwipeableItem>
  );
}
