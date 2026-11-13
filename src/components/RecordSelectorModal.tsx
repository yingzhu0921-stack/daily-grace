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
  purpose?: 'text' | 'background';
}

const getCategoryInfo = (type: RecordType | string, record?: Record) => {
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
  // 커스텀 카테고리(설교·찬양 등). 이름·색은 기록에 함께 실려 온다.
  return {
    icon: Edit3,
    color: (record as any)?.categoryColor || '#7B9AAC',
    name: (record as any)?.categoryName || '기록',
  };
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
  // 2026-11-13 사용성 점검: Q.T 를 가져오면 말씀(본문)이 아니라 묵상 내용만 들어갔다.
  // 말씀 카드를 만드는 경우가 많으니 Q.T 는 본문을 먼저 넣는다(아래에서 묵상 내용으로 바꿀 수 있다).
  if (record.type === 'meditation' && record.passage?.trim()) {
    return record.passage;
  }
  return record.content || record.passage || record.title || '';
};

/**
 * AI 추천에 보낼 글. Q.T 는 본문을 먼저 넣지만, 본문이 "히 4장"처럼 짧으면 추천 버튼이 아예 안 떴다
 * (2026-11-13 사용자 "ai 추천이 안떠"). 본문이 짧으면 묵상 내용으로 추천한다.
 */
const getRecommendSource = (record: Record) => {
  const base = getRecordText(record);
  if (record.type === 'meditation' && base.replace(/\s/g, '').length <= 22 && record.content?.trim()) {
    return record.content;
  }
  return base;
};

export function RecordSelectorModal({ open, onClose, records, onConfirm, onRefetch, purpose = 'text' }: RecordSelectorModalProps) {
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [confirmedText, setConfirmedText] = useState('');
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [activeType, setActiveType] = useState<'all' | RecordType | string>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  // AI 가 원문에서 그대로 고른 문장과 그 종류 이름표(짧은 한 줄·이어진 두 문장·마음이 담긴 문장).
  const [options, setOptions] = useState<{ text: string; label: string }[]>([]);

  // 키보드가 올라오면 보이는 화면이 줄어든다. vh 는 그대로라 창이 화면 밖으로 밀려
  // 아래쪽(분류 버튼)이 가려졌다. 실제로 보이는 높이를 따라간다.
  // 창은 fixed top:50% 라 레이아웃 화면의 한가운데에 놓인다. 키보드가 올라오면
  // 그 한가운데가 보이는 화면 밖으로 내려가므로, 높이와 함께 중심도 옮겨 준다.
  const [viewport, setViewport] = useState<{ h: number; mid: number } | null>(null);
  // 키보드가 올라온 상태. 이때는 설명줄·여백을 줄여 목록에 높이를 넘긴다.
  const short = !!viewport && viewport.h < 620;
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewport({ h: vv.height, mid: vv.offsetTop + vv.height / 2 });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  const [recommending, setRecommending] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  // 몇 번째 추천 요청인지. 0 이면 아직 안 누른 것. 늘릴 때마다 다시 받아온다.
  const [recommendCount, setRecommendCount] = useState(0);
  const recommendationRequested = recommendCount > 0;

  useEffect(() => {
    setVisibleCount(12);
  }, [query, activeType]);

  // 다른 기록을 고르거나 단계가 바뀌면 지난 추천을 버린다.
  // 이 초기화를 아래 요청 effect 안에 두면 recommendCount 가 자기 자신을 되돌려
  // cleanup 이 방금 띄운 요청을 취소해 버린다. 반드시 따로 둔다.
  useEffect(() => {
    setOptions([]);
    setRecommendCount(0);
    setRecommendationError('');
    setRecommending(false);
  }, [open, selectedRecord, step, purpose]);

  useEffect(() => {
    if (!recommendCount || !open || step !== 'confirm' || !selectedRecord || purpose === 'background') return;
    setOptions([]);
    setRecommendationError('');
    const raw = getRecommendSource(selectedRecord);
    if (raw.replace(/\s/g, '').length <= 22) return;
    const controller = new AbortController();
    setRecommending(true);
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST', credentials: 'include', signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'condense', text: raw }),
        });
        if (!response.ok) throw new Error('Recommendation failed');
        const data = await response.json();
        const candidates: unknown[] = Array.isArray(data.options) ? data.options : [data.text];
        const labels: unknown[] = Array.isArray(data.labels) ? data.labels : [];
        const picks: { text: string; label: string }[] = [];
        candidates.forEach((value, i) => {
          if (typeof value !== 'string' || !value.trim()) return;
          const text = value.trim();
          if (text === raw.trim() || picks.some((p) => p.text === text)) return;
          picks.push({ text, label: typeof labels[i] === 'string' && labels[i] ? (labels[i] as string) : `추천 ${picks.length + 1}` });
        });
        if (!picks.length) throw new Error('Empty recommendation');
        if (active) setOptions(picks.slice(0, 3));
      } catch {
        if (active) setRecommendationError('추천을 불러오지 못했어요. 원문을 그대로 사용하거나 수정할 수 있어요.');
      } finally {
        window.clearTimeout(timeout);
        if (active) setRecommending(false);
      }
    })();
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [open, selectedRecord, step, purpose, recommendCount]);

  // 모달이 열릴 때마다 최신 데이터 가져오기
  useEffect(() => {
    if (open && onRefetch) {
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
      setQuery('');
      setVisibleCount(12);
      setRecommendCount(0);
    }
  }, [open]);

  const handleSelectRecord = (record: Record) => {
    setSelectedRecord(record);
    setConfirmedText(getRecordText(record));
    setOptions([]);
    setRecommendCount(0);
    setRecommendationError('');
    setRecommendCount(0);
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

  const filteredRecords = records.filter(record =>
    (activeType === 'all' || record.type === activeType) &&
    `${record.title || ''} ${getRecordText(record)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  // 기본 네 종류 + 실제로 기록이 있는 커스텀 카테고리.
  // 'QT' 만 혼자 점이 없었다. 앱의 다른 곳은 모두 'Q.T' 다.
  const customFilters = Array.from(
    new Map(
      records
        .filter((r: any) => r.categoryId)
        .map((r: any) => [r.categoryId as string, (r.categoryName as string) || '기록']),
    ),
  ).map(([key, label]) => ({ key, label }));

  const filters: { key: string; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'meditation', label: 'Q.T' },
    { key: 'prayer', label: '기도' },
    { key: 'gratitude', label: '감사' },
    { key: 'diary', label: '일기' },
    ...customFilters,
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent
        className="max-w-[500px] flex flex-col p-4 sm:p-6 bg-white"
        style={{
          zIndex: 9999,
          maxHeight: viewport ? `${Math.round(viewport.h * (short ? 0.96 : 0.88))}px` : '70vh',
          ...(viewport ? { top: `${Math.round(viewport.mid)}px` } : {}),
        }}
        overlayClassName="z-[9998]"
        // 창이 열리자마자 검색칸에 커서가 가서 아이폰 키보드가 올라왔다. 창이 반으로 줄어 기록이 두 개만 보이고
        // 아래로 내릴 수 없었다(2026-11-10 사용자 영상). 검색은 사용자가 칸을 누를 때만 연다.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className={short ? 'pb-1' : 'pb-3'}>
          <DialogTitle className={short ? 'text-base' : 'text-lg sm:text-xl'}>
            {step === 'select' ? '내 기록에서 가져오기' : purpose === 'background' ? '배경에 참고할 내용' : '카드에 담을 문구'}
          </DialogTitle>
          <DialogDescription className={`text-xs text-muted-foreground mt-1 ${short ? 'hidden' : ''}`}>
            {step === 'select'
              ? '최근 기록에서 카드로 남길 내용을 선택하세요'
              : purpose === 'background' ? '배경에만 참고하며 기존 카드 글씨는 바뀌지 않아요.' : '원문 또는 AI 추천을 선택하고 수정하세요. 원본 기록은 바뀌지 않아요.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <input aria-label="기록 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="제목이나 내용으로 검색" className="w-full rounded-lg border p-3 text-sm" />
            <div className={`flex shrink-0 gap-1.5 overflow-x-auto overflow-y-visible ${short ? 'pb-1' : 'pb-2'}`}>
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

            <div className="min-h-0 flex-1 overflow-y-auto space-y-2 py-1">
            {filteredRecords.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                {query || activeType !== 'all' ? '조건에 맞는 기록이 없어요. 검색어나 카테고리를 바꿔보세요.' : '아직 기록이 없어요. 기록을 작성하거나 돌아가서 문구를 직접 입력해주세요.'}
              </div>
            ) : (
              filteredRecords.slice(0, visibleCount).map((record) => {
                const categoryInfo = getCategoryInfo(record.type, record);
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
                            {Number.isFinite(new Date(record.date || record.created_at || '').getTime()) ? format(new Date(record.date || record.created_at || ''), 'M/d', { locale: ko }) : '날짜 없음'}
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
            {filteredRecords.length > visibleCount && <Button variant="outline" className="w-full" onClick={() => setVisibleCount(count => count + 12)}>기록 더 보기</Button>}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3">
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
            {purpose === 'text' && selectedRecord && (
              /* 2026-11-13 사용자: '본문 사용·묵상 사용·AI 추천' 버튼이 나란히 있어 애매했다.
                 → "어떤 문구로 만들까요?" 아래 고르는 줄로. 각 줄에 미리보기, 고른 줄은 검은 테두리.
                 AI 는 버튼을 눌렀을 때만 기록을 보낸다(전송 안내 유지). AI 도 원문 문장을 그대로 고른다. */
              <div className="space-y-2">
                <p className="text-[12px] font-bold text-[#6E675E]">어떤 문구로 만들까요?</p>
                {(selectedRecord.type === 'meditation' && selectedRecord.passage?.trim() && selectedRecord.content?.trim()
                  ? [
                      { label: '말씀(본문) 그대로', text: selectedRecord.passage || '' },
                      { label: '묵상 내용 그대로', text: selectedRecord.content || '' },
                    ]
                  : [{ label: '원문 그대로', text: getRecordText(selectedRecord) }]
                ).map((choice) => {
                  const on = confirmedText === choice.text;
                  return (
                    <button
                      key={choice.label}
                      type="button"
                      onClick={() => setConfirmedText(choice.text)}
                      className={`w-full rounded-[14px] border bg-white px-3.5 py-2.5 text-left transition-colors ${
                        on ? 'border-[#1E1C1A] border-2' : 'border-[rgba(30,28,26,0.14)]'
                      }`}
                    >
                      <span className="block text-[12px] font-bold text-[#1E1C1A]">{choice.label}</span>
                      {/* block 을 같이 주면 line-clamp 의 display 를 덮어써서 두 줄로 안 잘렸다. */}
                      <span className="mt-0.5 text-[13px] leading-5 text-[#6E675E] line-clamp-2">{choice.text}</span>
                    </button>
                  );
                })}

                {getRecommendSource(selectedRecord).replace(/\s/g, '').length > 22 && (
                  <div className="rounded-[14px] border border-dashed border-[rgba(30,28,26,0.25)] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-[#1E1C1A]">AI가 원문에서 고른 문장</span>
                      {/* 추천을 받은 뒤에도 버튼을 남긴다. 사라지면 다시 받을 길이 없어 어색하다. */}
                      <button
                        type="button"
                        disabled={recommending}
                        onClick={() => setRecommendCount((n) => n + 1)}
                        className="h-8 shrink-0 rounded-full bg-[#1E1C1A] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                      >
                        {recommending ? '고르는 중…' : recommendationRequested ? '다시 고르기' : 'AI 추천 받기'}
                      </button>
                    </div>
                    <p role="status" className="text-[11.5px] leading-4 text-[#8A8278]">
                      {recommending
                        ? '원문에서 문장을 고르는 중이에요. 기다리지 않고 위에서 골라도 돼요.'
                        : recommendationError || (recommendationRequested
                          ? '추천을 위해 선택한 기록을 AI에 전송했어요. 문장은 원문 그대로예요.'
                          : '누르면 선택한 기록이 AI에 전송돼요. 원문 문장을 그대로 골라 줘요.')}
                    </p>
                    {options.map((option) => {
                      const on = confirmedText === option.text;
                      return (
                        <button
                          key={option.text}
                          type="button"
                          onClick={() => setConfirmedText(option.text)}
                          className={`w-full rounded-[12px] border bg-white px-3 py-2.5 text-left ${
                            on ? 'border-[#1E1C1A] border-2' : 'border-[rgba(30,28,26,0.14)]'
                          }`}
                        >
                          <span className="block text-[11.5px] font-bold text-[#6E675E]">{option.label}</span>
                          <span className="mt-0.5 block text-[13.5px] leading-5 text-[#1E1C1A]">{option.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <textarea
              aria-label={purpose === 'background' ? '배경 참고 내용' : '카드 문구 수정'}
              value={confirmedText}
              onChange={(e) => setConfirmedText(e.target.value)}
              placeholder="카드에 담을 문구를 확인해주세요"
              className="block w-full min-h-[160px] resize-y rounded-xl border border-[#E3E2E0] bg-[#F6F3EC] p-3 text-[14px] leading-6 text-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-[#4F8A5B]/20"
            />
            <p className="text-[11px] leading-4 text-[#9A9894]">
              필요한 부분만 남기거나 줄바꿈을 정리해도 원본 기록은 바뀌지 않습니다.
            </p>
          </div>
        )}

        <div className="flex shrink-0 gap-2 pt-3 border-t">
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
            {purpose === 'background' ? '배경에만 적용' : '이 문구로 만들기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
