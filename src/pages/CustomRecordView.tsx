import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Edit2, Share2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
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

const CustomRecordView = () => {
  const navigate = useNavigate();
  const { categoryId, recordId } = useParams<{ categoryId: string; recordId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [record, setRecord] = useState<CustomRecord | null>(null);

  useEffect(() => {
    // Supabase에서 카테고리 정보 로드
    const loadCategory = async () => {
      try {
        if (!categoryId) return;

        const foundCategory = await categoryStorage.get(categoryId);
        if (foundCategory) {
          setCategory(foundCategory as Category);
        }
      } catch (error) {
        console.error('Failed to load category:', error);
      }
    };

    loadCategory();

    // 기록 정보 로드
    const recordsSaved = localStorage.getItem('custom_records');
    if (recordsSaved) {
      const records: CustomRecord[] = JSON.parse(recordsSaved);
      const foundRecord = records.find(r => r.id === recordId);
      if (foundRecord) {
        // application이 문자열이면 배열로 변환 (하위 호환성)
        if (foundRecord.application && typeof foundRecord.application === 'string') {
          console.log('Converting application from string to array');
          foundRecord.application = [foundRecord.application];
        }

        console.log('Found record:', foundRecord);
        console.log('Application is array:', Array.isArray(foundRecord.application));

        setRecord(foundRecord);
      } else {
        toast({
          title: "기록을 찾을 수 없습니다",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  }, [categoryId, recordId, navigate]);

  const handleCheckChange = (checked: boolean) => {
    if (!record || !recordId) return;

    const saved = localStorage.getItem('custom_records');
    if (saved) {
      const records: CustomRecord[] = JSON.parse(saved);
      const updatedRecords = records.map(r =>
        r.id === recordId ? { ...r, answered: checked } : r
      );
      localStorage.setItem('custom_records', JSON.stringify(updatedRecords));
      setRecord({ ...record, answered: checked });

      toast({
        title: checked ? "완료로 표시했어요" : "완료를 해제했어요",
      });
    }
  };

  const handleApplicationCheckChange = (index: number, checked: boolean) => {
    if (!record || !recordId) return;

    const saved = localStorage.getItem('custom_records');
    if (saved) {
      const records: CustomRecord[] = JSON.parse(saved);
      const updatedRecords = records.map(r => {
        if (r.id === recordId) {
          const currentChecked = r.applyChecked || {};
          const newChecked = Array.isArray(currentChecked)
            ? [...currentChecked]
            : { ...currentChecked };

          if (Array.isArray(newChecked)) {
            newChecked[index] = checked;
          } else {
            newChecked[index] = checked;
          }

          return { ...r, applyChecked: newChecked };
        }
        return r;
      });
      localStorage.setItem('custom_records', JSON.stringify(updatedRecords));

      const updatedRecord = updatedRecords.find(r => r.id === recordId);
      if (updatedRecord) {
        setRecord(updatedRecord);
      }
    }
  };

  const handleShare = () => {
    if (!record) return;

    const parts: string[] = [];
    const date = new Date(record.createdAt).toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');

    parts.push(date);
    parts.push(`${category?.name}\n`);

    // 동적으로 필드 레이블과 값 구성
    const fieldLabels: Record<string, string> = {
      title: '제목',
      passage: '본문',
      content: '내용',
      application: '적용',
    };

    // 카테고리에 포함된 필드만 순회
    const fields = category?.fields || [];
    fields.forEach(field => {
      if (field !== 'answered' && record[field as keyof CustomRecord]) {
        const value = record[field as keyof CustomRecord];
        if (Array.isArray(value)) {
          // application 배열 처리
          const items = value.filter(item => item && item.trim());
          if (items.length > 0) {
            parts.push(`${fieldLabels[field] || field}:\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`);
          }
        } else if (typeof value === 'string' && value.trim()) {
          parts.push(`${fieldLabels[field] || field}: ${value}`);
        }
      }
    });

    // answeredDetail도 추가
    if (fields.includes('answered') && record.answered && record.answeredDetail && typeof record.answeredDetail === 'string' && record.answeredDetail.trim()) {
      parts.push(`응답 내용: ${record.answeredDetail}`);
    }

    const shareText = parts.join('\n\n');

    // 클립보드에 복사
    navigator.clipboard.writeText(shareText);
    toast({
      title: "전체 내용이 복사되었어요!",
    });
  };

  const handleDelete = () => {
    if (!confirm('이 기록을 삭제할까요?')) return;

    if (!recordId) return;

    const saved = localStorage.getItem('custom_records');
    if (saved) {
      const records: CustomRecord[] = JSON.parse(saved);
      const updatedRecords = records.filter(r => r.id !== recordId);
      localStorage.setItem('custom_records', JSON.stringify(updatedRecords));
    }

    toast({
      title: "기록이 삭제되었습니다",
    });
    navigate(`/custom/${categoryId}`);
  };

  if (!category || !record) {
    return null;
  }

  const fields = category.fields || [];

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
          <button
            onClick={() => navigate(`/custom/${categoryId}`)}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
          </button>

          <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
            {category.name}
          </h1>

          <div className="w-10" />
        </header>

        {/* 콘텐츠 */}
        <main className="px-5 py-6 pb-24 max-w-[680px] mx-auto">
          {fields.includes('title') && record.title && (
            <section className="mb-12">
              <h2 className="mb-2 text-sm text-[#9B9B9B]">제목</h2>
              <div className="text-lg font-semibold leading-relaxed text-[#2E2E2E] whitespace-pre-wrap">
                {record.title}
              </div>
            </section>
          )}

          {fields.includes('passage') && record.passage && (
            <section className="mb-12">
              <h2 className="mb-2 text-sm text-[#9B9B9B]">본문</h2>
              <div className="text-base leading-[1.8] text-[#2E2E2E] whitespace-pre-wrap">
                {record.passage}
              </div>
            </section>
          )}

          {fields.includes('content') && record.content && (
            <section className="mb-12">
              <h2 className="mb-2 text-sm text-[#9B9B9B]">내용</h2>
              <div className="text-base leading-[1.8] text-[#2E2E2E] whitespace-pre-wrap">
                {record.content}
              </div>
            </section>
          )}

          {fields.includes('application') && record.application && (
            <section className="mb-12">
              <h2 className="mb-3 text-sm text-[#9B9B9B]">적용</h2>
              <div className="space-y-3">
                {Array.isArray(record.application) ? (
                  record.application.map((item, index) => {
                    if (!item || !item.trim()) return null;
                    const isChecked = Array.isArray(record.applyChecked)
                      ? record.applyChecked[index] || false
                      : typeof record.applyChecked === 'object'
                      ? record.applyChecked[index] || false
                      : false;

                    return (
                      <label
                        key={index}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E7E5] bg-[#FAFAFA] p-4 transition-colors hover:bg-[#F5F5F5]"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleApplicationCheckChange(index, checked as boolean)
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 text-[15px] text-[#2E2E2E] leading-relaxed">
                          {item}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-base leading-[1.8] text-[#2E2E2E] whitespace-pre-wrap">
                    {record.application}
                  </div>
                )}
              </div>
            </section>
          )}

          {fields.includes('answered') && record.answered !== undefined && (
            <section className="mb-12">
              <h2 className="mb-3 text-sm text-[#9B9B9B]">응답</h2>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E7E5] bg-[#FAFAFA] p-4 transition-colors hover:bg-[#F5F5F5]">
                <Checkbox
                  checked={record.answered}
                  onCheckedChange={(checked) => handleCheckChange(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#2E2E2E]">응답됨</div>
                  {record.answeredDetail && (
                    <div className="mt-2 text-[15px] text-[#2E2E2E] leading-relaxed whitespace-pre-wrap">
                      {record.answeredDetail}
                    </div>
                  )}
                </div>
              </label>
            </section>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-2 pt-6 mt-6 border-t border-[#F0EFED]">
            <button
              onClick={() => navigate(`/custom/${categoryId}/edit/${recordId}`)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#2E2E2E] bg-white border border-[#E8E7E5] hover:bg-[#F9F8F6] transition-colors flex items-center justify-center gap-1.5"
            >
              <Edit2 className="w-4 h-4" />
              수정하기
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#2E2E2E] bg-white border border-[#E8E7E5] hover:bg-[#F9F8F6] transition-colors"
            >
              공유하기
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#DD957D] bg-white border border-[#E8E7E5] hover:bg-[#FFF5F2] transition-colors"
            >
              삭제하기
            </button>
          </div>

          {/* 작성 일시 */}
          <div className="pt-4 text-center">
            <p className="text-sm text-[#999]">
              {format(new Date(record.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
            </p>
          </div>
        </main>
    </div>
  );
};

export default CustomRecordView;
