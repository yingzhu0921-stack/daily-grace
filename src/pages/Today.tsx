import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { AppIcon } from '@/components/ui/AppIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordCard } from '@/components/RecordCard';
import { getTodayRecords, getRecordCounts } from '@/utils/recordsQuery';
import { toLocalDateString } from '@/utils/dateHelpers';
import { routes } from '@/config/routes';

const Today: React.FC = () => {
  const navigate = useNavigate();
  const today = toLocalDateString(new Date());
  const [records, setRecords] = useState(() => getTodayRecords());
  const [counts, setCounts] = useState(() => getRecordCounts(today));

  useEffect(() => {
    const updateData = () => {
      setRecords(getTodayRecords());
      setCounts(getRecordCounts(today));
    };
    updateData();
    const interval = setInterval(updateData, 5000);
    return () => clearInterval(interval);
  }, [today]);

  const dateLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const categories = [
    { type: 'meditation', label: 'Q.T', color: 'rgba(125,184,125,1)', icon: 'bookOpen', route: routes.meditationNew },
    { type: 'prayer', label: '기도', color: 'rgba(165,125,184,1)', icon: 'heart', route: routes.prayerNew },
    { type: 'gratitude', label: '감사', color: 'rgba(232,200,125,1)', icon: 'sparkles', route: routes.gratitudeNew },
    { type: 'diary', label: '일기', color: 'rgba(221,149,125,1)', icon: 'pencilLine', route: routes.diaryNew },
  ] as const;

  return (
    <div className="min-h-screen bg-[rgba(249,248,246,1)]">
      <Header />
      <main className="max-w-5xl mx-auto px-5 pb-8">
        {/* 헤더 */}
        <div className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <AppIcon name="sun" size={18} className="text-[#7C7C7C]" />
            <span className="text-[13px] font-medium text-[#7C7C7C]">오늘</span>
          </div>
          <h1 className="text-[24px] font-semibold text-[#2E2E2E]">{dateLabel}</h1>
        </div>

        {/* 말씀카드 배너 */}
        <div
          className="rounded-3xl p-5 mb-6 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between"
          style={{ backgroundColor: '#C8E6D7' }}
          onClick={() => navigate('/cards/designer')}
        >
          <div>
            <h3 className="text-[14px] font-semibold text-[#2E2E2E] mb-1">⭐ 말씀카드 만들기</h3>
            <p className="text-[13px] text-[#2E2E2E]">오늘의 말씀을 카드로</p>
            <p className="text-[12px] text-[#666] mt-0.5">AI 생성 · 직접 꾸미기</p>
          </div>
          <AppIcon name="arrowRight" size={24} className="text-[#2E2E2E] flex-shrink-0" />
        </div>

        {/* MY ROUTINE 섹션 */}
        <div className="mb-6">
          <h2 className="text-[13px] font-semibold text-[#999] uppercase mb-3 px-1 tracking-widest">MY ROUTINE</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {categories.map(cat => {
              const completed = counts[cat.type as keyof typeof counts] > 0;
              return (
                <div
                  key={cat.type}
                  className="bg-white rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow h-[100px] flex flex-col justify-between"
                  onClick={() => navigate(cat.route)}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: cat.color }}
                    >
                      <AppIcon name={cat.icon as any} size={18} color="#fff" strokeWidth={1.75} />
                    </div>
                    <StatusBadge completed={completed} variant="compact" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#2E2E2E]">{cat.label}</h3>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-[#D9D9D9] text-[14px] font-medium text-[#999] hover:border-[#999] hover:text-[#2E2E2E] transition-colors"
          >
            + 카테고리 추가
          </button>
        </div>

        {/* RECENT RECORDS */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-[13px] font-semibold text-[#999] uppercase tracking-widest">RECENT RECORDS</h2>
            <button
              onClick={() => navigate('/records')}
              className="text-[12px] font-medium text-[#999] hover:text-[#2E2E2E] transition-colors flex items-center gap-1"
            >
              전체보기 <AppIcon name="arrowRight" size={16} />
            </button>
          </div>
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.map(record => (
                <RecordCard key={record.id} {...record} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl px-6 py-10 text-center">
              <p className="text-[14px] text-[#7E7C78] leading-relaxed mb-4">
                아직 오늘의 기록이 없어요.<br />
                마음을 담은 첫 기록을 남겨보세요.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map(cat => (
                  <button
                    key={cat.type}
                    onClick={() => navigate(cat.route)}
                    className="px-4 py-2 rounded-full text-[13px] font-medium transition-colors"
                    style={{
                      backgroundColor: `${cat.color}15`,
                      color: cat.color,
                    }}
                  >
                    {cat.label} 기록하기
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Today;
