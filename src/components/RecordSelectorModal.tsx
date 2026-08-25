import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, Sparkles, Edit3, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useState, useEffect } from 'react';

type RecordType = 'meditation' | 'prayer' | 'gratitude' | 'diary';

interface Record {
  id: string;
  type: RecordType;
  date: string;
  created_at?: string;
  title?: string;
  content?: string;
  passage?: string;
  items?: string[];
}

interface RecordSelectorModalProps {
  open: boolean;
  onClose: () => void;
  records: Record[];
  onConfirm: (record: Record, selectedText: string) => void;
  onRefetch?: () => void; // 새로고침 콜백 추가
}

const getCategoryInfo = (type: RecordType) => {
  switch (type) {
    case 'meditation':
      return { icon: BookOpen, color: '#7DB87D', name: 'Q.T' };
    case 'prayer':
      return { icon: Heart, color: '#A57DB8', name: '기도' };
    case 'gratitude':
      return { icon: Sparkles, color: '#E8C87D', name: '감사' };
    case 'diary':
      return { icon: Edit3, color: '#DD957D', name: '일기' };
  }
};

const getContentPreview = (record: Record) => {
  let preview = '';
  if (record.type === 'gratitude' && record.items) {
    preview = record.items.slice(0, 2).join(', ');
  } else {
    preview = record.content || record.passage || '';
  }
  // Truncate to 60 characters for performance
  return preview.length > 60 ? preview.substring(0, 60) + '...' : preview;
};

const getRecordText = (record: Record) => {
  if (record.type === 'gratitude' && record.items?.length) {
    return record.items.join('\n');
  }
  return record.content || record.passage || record.title || '';
};

export function RecordSelectorModal({ open, onClose, records, onConfirm, onRefetch }: RecordSelectorModalProps) {
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [confirmedText, setConfirmedText] = useState('');
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [activeType, setActiveType] = useState<'all' | RecordType>('all');
  
  console.log('🎭 RecordSelectorModal render - open:', open, 'records:', records.length);

  // 모달이 열릴 때마다 최신 데이터 가져오기
  useEffect(() => {
    if (open && onRefetch) {
      console.log('🔄 Modal opened - triggering refetch');
      onRefetch();
    }
    // onRefetch는 useCallback으로 감싸져서 안정적인 참조를 가지므로 의존성 배열에 포함 가능
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // open이 변경될 때만 실행 (무한 루프 방지)

  useEffect(() => {
    if (!open) {
      setSelectedRecord(null);
      setConfirmedText('');
      setStep('select');
      setActiveType('all');
    }
  }, [open]);

  const handleSelectRecord = (record: Record) => {
    setSelectedRecord(record);
    setConfirmedText(getRecordText(record));
    setStep('confirm');
  };

  const handleConfirm = () => {
    const text = confirmedText.trim();
    if (selectedRecord && text) {
      onConfirm(selectedRecord, text);
      setSelectedRecord(null);
      setConfirmedText('');
      setStep('select');
    }
  };

  const filteredRecords = activeType === 'all'
    ? records
    : records.filter(record => record.type === activeType);

  const filters: { key: 'all' | RecordType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'meditation', label: 'QT' },
    { key: 'prayer', label: '기도' },
    { key: 'gratitude', label: '감사' },
    { key: 'diary', label: '일기' },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      console.log('📱 Dialog onOpenChange:', isOpen);
      if (!isOpen) onClose();
    }}>
      <DialogContent 
        className="max-w-[500px] max-h-[70vh] flex flex-col p-4 sm:p-6 bg-white"
        style={{ zIndex: 9999 }}
      >
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg sm:text-xl">
            {step === 'select' ? '내 기록에서 가져오기' : '카드에 담을 문구'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {step === 'select'
              ? '최근 기록에서 카드로 남길 내용을 선택하세요'
              : '원본 기록은 수정되지 않습니다'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {filters.map(filter => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveType(filter.key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeType === filter.key
                      ? 'border-[#1F1F1F] bg-[#1F1F1F] text-white'
                      : 'border-[#E3E2E0] bg-white text-[#7E7C78]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-1">
            {filteredRecords.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                불러올 기록이 없습니다. 먼저 Q.T, 기도, 감사 등을 작성해주세요.
              </div>
            ) : (
              filteredRecords.map((record) => {
                const categoryInfo = getCategoryInfo(record.type);
                const contentPreview = getContentPreview(record);

                return (
                  <button
                    key={record.id}
                    onClick={() => handleSelectRecord(record)}
                    className="w-full p-3 rounded-lg border border-gray-200 transition-colors text-left hover:border-[#4F8A5B]/50 hover:bg-[#F9F8F6]"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: categoryInfo.color }}
                      >
                        <categoryInfo.icon 
                          size={16}
                          strokeWidth={2}
                          color="#fff"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-xs" style={{ color: categoryInfo.color }}>
                            {categoryInfo.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(record.date || record.created_at || ''), 'M/d', { locale: ko })}
                          </span>
                        </div>

                        {record.title && (
                          <div className="font-medium text-xs mb-0.5 truncate">
                            {record.title}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {contentPreview}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {selectedRecord && (
              <button
                type="button"
                onClick={() => setStep('select')}
                className="inline-flex w-fit items-center gap-1 text-xs font-medium text-[#7E7C78]"
              >
                <ChevronLeft className="w-4 h-4" />
                다른 기록 선택
              </button>
            )}
            <textarea
              value={confirmedText}
              onChange={(e) => setConfirmedText(e.target.value)}
              placeholder="카드에 담을 문구를 확인해주세요"
              className="min-h-[220px] flex-1 resize-none rounded-xl border border-[#E3E2E0] bg-[#FAFAF9] p-3 text-[14px] leading-6 text-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-[#4F8A5B]/20"
            />
            <p className="text-[11px] leading-4 text-[#9A9894]">
              필요한 부분만 남기거나 줄바꿈을 정리해도 원본 기록은 바뀌지 않습니다.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 text-sm"
          >
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={step !== 'confirm' || !confirmedText.trim()}
            className="flex-1 h-10 text-sm bg-[#1F1F1F] hover:bg-[#333333] text-white disabled:opacity-50"
          >
            이 문구 사용하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
