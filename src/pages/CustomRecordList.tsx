import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { SwipeableItem } from '@/components/SwipeableItem';
import { toast } from 'sonner';
import * as categoryStorage from '@/utils/categoryStorage';

type Category = {
  id: string;
  name: string;
  color: string;
  fields?: string[];
};

type CustomRecord = {
  id: string;
  categoryId: string;
  categoryName: string;
  title?: string;
  passage?: string;
  content?: string;
  application?: string | string[];
  applyChecked?: boolean[] | { [key: number]: boolean };
  answered?: boolean;
  answeredDetail?: string;
  createdAt: string;
};

const CustomRecordList = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<CustomRecord[]>([]);
  const highlightRef = useRef<HTMLButtonElement | null>(null);

  const refresh = () => {
    const saved = localStorage.getItem('custom_records');
    if (saved) {
      const allRecords: CustomRecord[] = JSON.parse(saved);
      const categoryRecords = allRecords.filter(r => r.categoryId === categoryId);
      // 최신순 정렬
      categoryRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(categoryRecords);
    }
  };

  const handleDelete = (id: string) => {
    const saved = localStorage.getItem('custom_records');
    if (saved) {
      const allRecords: CustomRecord[] = JSON.parse(saved);
      const filtered = allRecords.filter(r => r.id !== id);
      localStorage.setItem('custom_records', JSON.stringify(filtered));
      refresh();
      toast.success('기록이 삭제되었습니다');
    }
  };

  useEffect(() => {
    // Supabase에서 카테고리 정보 로드
    const loadCategory = async () => {
      try {
        if (!categoryId) return;

        const foundCategory = await categoryStorage.get(categoryId);
        if (foundCategory) {
          setCategory(foundCategory as Category);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to load category:', error);
        navigate('/');
      }
    };

    loadCategory();
    refresh();
  }, [categoryId, navigate]);

  // 새로 작성한 항목 하이라이트 + 스크롤
  useEffect(() => {
    const newId = searchParams.get('new');
    if (!newId) return;

    setTimeout(() => {
      if (highlightRef.current) {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightRef.current.classList.add('ring-2', 'ring-inset');
        highlightRef.current.style.setProperty('--tw-ring-color', category?.color || '#9BB9B0');
        
        setTimeout(() => {
          highlightRef.current?.classList.remove('ring-2', 'ring-inset');
        }, 1500);
      }
      
      setSearchParams({});
    }, 300);
  }, [searchParams, setSearchParams, category]);

  if (!category) {
    return null;
  }

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
          {category.name}
        </h1>

        <Button
          onClick={() => navigate(`/custom/${categoryId}/new`)}
          className="h-9 px-5 rounded-full text-white text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: category.color }}
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
              기록을 남겨보세요.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {items.map((record) => (
            <SwipeableItem
              key={record.id}
              onEdit={() => navigate(`/custom/${categoryId}/edit/${record.id}`)}
              onDelete={() => handleDelete(record.id)}
              editColor={category.color}
              deleteColor="#E06B6B"
            >
              <button
                ref={searchParams.get('new') === record.id ? highlightRef : null}
                onClick={() => navigate(`/custom/${categoryId}/${record.id}`)}
                className="w-full text-left rounded-2xl bg-white border border-[#F0EFED] shadow-sm px-4 py-4 hover:shadow-md transition-all duration-300"
              >
                <div className="flex flex-col gap-1">
                  {record.title && (
                    <div className="text-[16px] font-semibold text-[#2E2E2E] truncate">
                      {record.title}
                    </div>
                  )}
                  {record.passage && (
                    <div className="text-[14px] text-[#5A5A5A] whitespace-pre-wrap" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {record.passage}
                    </div>
                  )}
                  {record.content && (
                    <div className="text-[13px] text-[#777] whitespace-pre-wrap" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {record.content}
                    </div>
                  )}
                  {/* 적용 항목들 */}
                  {record.application && Array.isArray(record.application) && record.application.filter(item => item && item.trim()).length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="text-[12px] text-[#9B9B9B] mb-1">적용</div>
                      {record.application.filter(item => item && item.trim()).map((item, idx) => {
                        const isChecked = Array.isArray(record.applyChecked)
                          ? record.applyChecked[idx] || false
                          : typeof record.applyChecked === 'object' && record.applyChecked !== null
                          ? record.applyChecked[idx] || false
                          : false;

                        return (
                          <label
                            key={idx}
                            className="flex items-start gap-2 text-[13px] text-[#5A5A5A] cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                const saved = localStorage.getItem('custom_records');
                                if (saved) {
                                  const allRecords: CustomRecord[] = JSON.parse(saved);
                                  const updatedRecords = allRecords.map(r => {
                                    if (r.id === record.id) {
                                      const currentChecked = r.applyChecked || {};
                                      const newChecked = Array.isArray(currentChecked)
                                        ? [...currentChecked]
                                        : { ...currentChecked };

                                      if (Array.isArray(newChecked)) {
                                        newChecked[idx] = e.target.checked;
                                      } else {
                                        newChecked[idx] = e.target.checked;
                                      }

                                      return { ...r, applyChecked: newChecked };
                                    }
                                    return r;
                                  });
                                  localStorage.setItem('custom_records', JSON.stringify(updatedRecords));
                                  refresh();
                                }
                              }}
                              className="w-4 h-4 mt-0.5 cursor-pointer flex-shrink-0"
                            />
                            <span className={isChecked ? 'line-through text-[#ACACAC]' : ''}>{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {/* 단일 적용 (하위 호환성) */}
                  {record.application && typeof record.application === 'string' && record.application.trim() && (
                    <div className="text-[13px] text-[#8A8A8A] line-clamp-1 whitespace-pre-wrap">
                      적용: {record.application}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[12px] text-[#999]">
                      {format(new Date(record.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </div>
                    <div className="flex items-center gap-2">
                      {record.application && (() => {
                        // application이 배열인 경우 개별 체크 진행률 표시
                        if (Array.isArray(record.application)) {
                          const items = record.application.filter(item => item && item.trim());
                          if (items.length === 0) return null;

                          let checkedCount = 0;
                          if (Array.isArray(record.applyChecked)) {
                            checkedCount = record.applyChecked.filter(checked => checked === true).length;
                          } else if (typeof record.applyChecked === 'object' && record.applyChecked !== null) {
                            checkedCount = Object.values(record.applyChecked).filter(checked => checked === true).length;
                          }

                          return checkedCount > 0 ? (
                            <div className="shrink-0 flex items-center gap-1.5 text-[12px]" style={{ color: category.color }}>
                              ✓ 적용 {checkedCount}/{items.length}
                            </div>
                          ) : null;
                        } else {
                          // 단일 문자열인 경우 기존 로직
                          const hasChecked = typeof record.applyChecked === 'boolean' && record.applyChecked;
                          return hasChecked ? (
                            <div className="shrink-0 flex items-center gap-1.5 text-[12px]" style={{ color: category.color }}>
                              ✓ 적용
                            </div>
                          ) : null;
                        }
                      })()}
                      {record.answered !== undefined && (
                        <div className="shrink-0 flex items-center gap-1.5 text-[12px]" style={{ color: category.color }}>
                          {record.answered ? '✓ 완료' : ''}
                        </div>
                      )}
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

export default CustomRecordList;
