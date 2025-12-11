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
        <div className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <AppIcon name="sun" size={18} className="text-[#7C7C7C]" />
            <span className="text-[13px] font-medium text-[#7C7C7C]">오늘</span>
          </div>
          <h1 className="text-[24px] font-semibold text-[#2E2E2E]">{dateLabel}</h1>
        </div>

        {/* 오늘 요약 카드 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {categories.map(cat => {
            const completed = counts[cat.type as keyof typeof counts] > 0;
            return (
              <div
                key={cat.type}
                className="bg-white rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(cat.route)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: cat.color }}
                  >
                    <AppIcon name={cat.icon as any} size={20} color="#fff" strokeWidth={1.75} />
                  </div>
                  <StatusBadge completed={completed} variant="compact" />
                </div>
                <h3 className="text-[15px] font-semibold text-[#2E2E2E] mb-0.5">{cat.label}</h3>
                <p className="text-[12px] text-[#9B9B9B]">
                  {completed ? `${counts[cat.type as keyof typeof counts]}개 작성` : '아직 기록 없음'}
                </p>
              </div>
            );
          })}
        </div>

        {/* 오늘 타임라인 */}
        <div className="mb-6">
          <h2 className="text-[16px] font-semibold text-[#2E2E2E] mb-3 px-1">오늘의 기록</h2>
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
