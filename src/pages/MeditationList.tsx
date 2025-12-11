import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { list, remove, update, type MeditationNote } from '@/utils/meditationStorage';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { SwipeableItem } from '@/components/SwipeableItem';
import { toast } from 'sonner';

const MeditationList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<MeditationNote[]>([]);
  const highlightRef = useRef<HTMLButtonElement | null>(null);

  const refresh = () => setItems(list());

  useEffect(() => {
    refresh();
  }, []);

  // 새로 작성한 항목 하이라이트 + 스크롤
  useEffect(() => {
    const newId = searchParams.get('new');
    if (!newId) return;

    setTimeout(() => {
      if (highlightRef.current) {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightRef.current.classList.add('ring-2', 'ring-[#9BB9B0]', 'ring-inset');
        
        setTimeout(() => {
          highlightRef.current?.classList.remove('ring-2', 'ring-[#9BB9B0]', 'ring-inset');
        }, 1500);
      }
      
      // URL에서 파라미터 제거
      setSearchParams({});
    }, 300);
  }, [searchParams, setSearchParams]);

  const handleDelete = (id: string) => {
    remove(id);
    refresh();
    toast.success('Q.T 기록이 삭제되었습니다');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          Q.T
        </h1>

        <Button
          onClick={() => navigate('/meditation/new')}
          className="h-9 px-5 rounded-full bg-[#7DB87D] hover:bg-[#6da76d] text-white text-sm font-medium"
        >
          새로 작성
        </Button>
      </header>

      {/* 리스트 */}
      <div className="px-5 pb-24 pt-6">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 px-8">
            <p className="text-[15px] text-[#8B8B8B] text-center leading-relaxed">
              아직 기록이 없어요. '새로 작성'을 눌러 첫<br />
              Q.T를 남겨보세요.
            </p>
          </div>
        )}

        <div className="space-y-3">

          {items.map((n) => (
            <SwipeableItem
              key={n.id}
              onEdit={() => navigate(`/meditation/${n.id}`)}
              onDelete={() => handleDelete(n.id)}
              editColor="#7DB87D"
              deleteColor="#E06B6B"
            >
              <button
                ref={searchParams.get('new') === n.id ? highlightRef : null}
                onClick={() => navigate(`/meditation/${n.id}`)}
                className="w-full text-left rounded-2xl bg-white border border-[#F0EFED] shadow-sm px-4 py-4 hover:shadow-md transition-all duration-300"
              >
                <div className="flex flex-col gap-1">
                  <div className="text-[16px] font-semibold text-[#2E2E2E] truncate">
                    {n.title || '제목 없음'}
                  </div>
                  <div className="text-[14px] text-[#5A5A5A] line-clamp-2 whitespace-pre-wrap">
                    {n.passage || '본문 없음'}
                  </div>
                  {n.content && (
                    <div className="text-[13px] text-[#777] line-clamp-1 whitespace-pre-wrap">
                      {n.content}
                    </div>
                  )}
                  {/* 적용 항목들 */}
                  {(n.applications && n.applications.length > 0 ? n.applications : n.application ? [{ text: n.application, checked: n.applyChecked || false }] : []).length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="text-[12px] text-[#9B9B9B] mb-1">적용</div>
                      {(n.applications && n.applications.length > 0 ? n.applications : n.application ? [{ text: n.application, checked: n.applyChecked || false }] : []).map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-start gap-2 text-[13px] text-[#5A5A5A] cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => {
                              e.stopPropagation();
                              const updatedApplications = (n.applications && n.applications.length > 0 ? n.applications : [{ text: n.application || '', checked: n.applyChecked || false }]).map((app, i) =>
                                i === idx ? { ...app, checked: e.target.checked } : app
                              );
                              update(n.id, {
                                applications: updatedApplications,
                                applyChecked: updatedApplications.some(app => app.checked)
                              });
                              refresh();
                            }}
                            className="w-4 h-4 mt-0.5 cursor-pointer flex-shrink-0"
                          />
                          <span className={item.checked ? 'line-through text-[#ACACAC]' : ''}>{item.text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[12px] text-[#999]">
                      {format(new Date(n.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </div>
                  </div>
                </div>
              </button>
            </SwipeableItem>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeditationList;
