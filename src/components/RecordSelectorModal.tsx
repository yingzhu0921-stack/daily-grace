import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, Sparkles, Edit3 } from 'lucide-react';
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
  onConfirm: (record: Record) => void;
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

export function RecordSelectorModal({ open, onClose, records, onConfirm, onRefetch }: RecordSelectorModalProps) {
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  
  console.log('🎭 RecordSelectorModal render - open:', open, 'records:', records.length);

  // 모달이 열릴 때마다 최신 데이터 가져오기
  useEffect(() => {
    if (open && onRefetch) {
      console.log('🔄 Modal opened - triggering refetch');
      onRefetch();
    }
  }, [open, onRefetch]);

  const handleConfirm = () => {
    if (selectedRecord) {
      onConfirm(selectedRecord);
      setSelectedRecord(null);
    }
  };

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
          <DialogTitle className="text-lg sm:text-xl">어떤 기록으로 배경을 만들까요?</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            최근 8개 기록만 표시됩니다
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-1">
          {records.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              분석할 기록이 없습니다. 먼저 Q.T, 기도, 감사 등을 작성해주세요.
            </div>
          ) : (
            records.map((record) => {
              const categoryInfo = getCategoryInfo(record.type);
              const isSelected = selectedRecord?.id === record.id;
              const contentPreview = getContentPreview(record);

              return (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`w-full p-3 rounded-lg border transition-colors text-left ${
                    isSelected
                      ? 'border-[#7B9AAC] bg-[#7B9AAC]/10'
                      : 'border-gray-200 hover:border-[#7B9AAC]/50 hover:bg-gray-50'
                  }`}
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
            disabled={!selectedRecord}
            className="flex-1 h-10 text-sm bg-[#7B9AAC] hover:bg-[#6A8A9C] text-white disabled:opacity-50"
          >
            이 기록으로 만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
