import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AppIcon } from '@/components/ui/AppIcon';
import { routes } from '@/config/routes';
import { BottomNav } from '@/components/BottomNav';
import { getAllRecords } from '@/utils/recordsQuery';
import { RecordCard } from '@/components/RecordCard';
import { toLocalDateString } from '@/utils/dateHelpers';
import * as categoryStorage from '@/utils/categoryStorage';

type Category = Pick<categoryStorage.Category, 'id' | 'name' | 'color' | 'icon' | 'includeInGoal' | 'description'> & {
  fields?: categoryStorage.Category['fields'];
};

const LEGACY_COLOR_MAP: Record<string, string> = {
  '#4F8A5B': '#7DB87D',
  '#7A6BB8': '#A57DB8',
  '#C89B3C': '#E8C87D',
  '#D97B5D': '#DD957D',
  '#6B9BD1': '#7BA8DB',
  '#E17B8C': '#C58BB8',
  '#C9A86A': '#D9B36B',
  '#9B87BE': '#A57DB8',
  '#D4886E': '#DD957D',
  '#7AA3B5': '#7BA8DB',
  '#B88FA3': '#C58BB8',
  '#8DABA8': '#7BA8DB',
  '#9AB8C6': '#7BA8DB',
  '#D8BE82': '#D9B36B',
  '#C7A0B2': '#C58BB8',
};

const RGBA_COLOR_MAP: Record<string, string> = {
  'rgba(125,184,125,1)': '#7DB87D',
  'rgba(165,125,184,1)': '#A57DB8',
  'rgba(232,200,125,1)': '#E8C87D',
  'rgba(221,149,125,1)': '#DD957D',
};

const normalizeCategoryColor = (color?: string) => {
  if (!color) return '#7DB87D';
  if (color.startsWith('rgba')) return RGBA_COLOR_MAP[color.replace(/\s/g, '')] || color;
  const upper = color.toUpperCase();
  return LEGACY_COLOR_MAP[upper] || color;
};

const Records: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  // 말씀카드는 /cards/vault 한 곳에서만 본다. 예전 '말씀카드' 탭 링크로 들어오면 그리로 보낸다.
  // (탭 쪽은 카드를 눌러도 열리지 않는 반쪽이어서 2026-11-02 에 없앴다.)
  useEffect(() => {
    if (searchParams.get('tab') === 'cards') navigate(routes.cardsVault, { replace: true });
  }, [searchParams, navigate]);

  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // id 는 기록의 type 과 같아야 한다. 종류 필터가 record.type 과 직접 비교하기 때문이다.
  // 예전에는 '1'~'4' 라서 어떤 기록과도 맞지 않아 필터가 항상 빈 화면이었다.
  const defaultCategories = [
    { id: 'meditation', label: 'Q.T', icon: 'bookOpen', route: routes.qt, color: '#7DB87D', desc: '오늘의 말씀을 나눠보세요' },
    { id: 'prayer', label: '기도', icon: 'heart', route: routes.prayer, color: '#A57DB8', desc: '하루의 기도를 적어보세요' },
    { id: 'gratitude', label: '감사', icon: 'star', route: routes.thanks, color: '#E8C87D', desc: '감사했던 순간을 떠올려보세요' },
    { id: 'diary', label: '일기', icon: 'pencilLine', route: routes.diary, color: '#DD957D', desc: '오늘의 마음을 기록해보세요' },
  ];

  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  // 커스텀 카테고리 로드
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        // 먼저 캐시된 데이터를 즉시 표시
        const cached = sessionStorage.getItem('custom_categories');
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            setCustomCategories(cachedData.map((cat: Category) => ({ ...cat, color: normalizeCategoryColor(cat.color) })));
          } catch (e) {
            console.error('Cache parse error:', e);
          }
        }

        // 백그라운드에서 최신 데이터 가져오기
        const categories = await categoryStorage.list();
        // user_id가 있는 것만 커스텀 카테고리 (기본 카테고리는 user_id가 null)
        const customs = categories
          .filter((cat: any) => cat.user_id != null)
          .map((cat: Category) => ({ ...cat, color: normalizeCategoryColor(cat.color) }));

        // 캐시 업데이트
        sessionStorage.setItem('custom_categories', JSON.stringify(customs));
        setCustomCategories(customs);
      } catch (error) {
        console.error('Failed to load custom categories:', error);
      }
    };

    loadCustomCategories();

    const handleCategoriesUpdated = () => {
      loadCustomCategories();
    };

    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);
    return () => window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
  }, []);

  // Load all records
  useEffect(() => {
    const allRecords = getAllRecords();
    setRecords(allRecords);
  }, []);


  // Filter records by date and category
  useEffect(() => {
    let filtered = records;

    if (dateParam) {
      filtered = filtered.filter(record => {
        const recordDate = toLocalDateString(new Date(record.createdAt));
        return recordDate === dateParam;
      });
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(record => record.type === selectedCategory);
    }

    setFilteredRecords(filtered);
  }, [records, dateParam, selectedCategory]);

  const formatDateHeader = () => {
    if (dateParam) {
      const date = new Date(dateParam);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
    return '전체 기록';
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-[#EDEDED]">
        <div className="max-w-[480px] mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
          </button>

          <h1 className="text-base font-medium text-[#2E2E2E]">보관함</h1>

          <div className="w-10" />
        </div>

      </header>

      <main className="max-w-[480px] mx-auto px-6 pb-8">
        {/* 전체 기록 탭 */}
          <>
            {/* 상단 헤더에 이미 '보관함' 이, 탭에 '전체 기록' 이 있다.
                날짜로 걸러 볼 때만 그 날짜를 제목으로 보여 준다. */}
            {dateParam && (
              <div className="pt-4 pb-4">
                <h1 className="text-[24px] font-semibold text-[#2E2E2E]">{formatDateHeader()}</h1>
                <button
                  onClick={() => navigate('/records')}
                  className="mt-2 text-[13px] text-[#1F1F1F] font-medium"
                >
                  전체 보기 →
                </button>
              </div>
            )}

            {/* Category Filter */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E2E2E]/20 ${
                  selectedCategory === 'all'
                    ? 'bg-[#1F1F1F] text-white'
                    : 'bg-white text-[#7C7C7C] border border-[#E8E7E5]'
                }`}
              >
                전체
              </button>
              {defaultCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E2E2E]/20 ${
                    selectedCategory === cat.id
                      ? 'text-[#2E2E2E]'
                      : 'bg-white text-[#7C7C7C] border border-[#E8E7E5]'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: `${cat.color}28`, border: `1.5px solid ${cat.color}` } : {}}
                >
                  {cat.label}
                </button>
              ))}
              {customCategories.map(cat => {
                const color = normalizeCategoryColor(cat.color);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E2E2E]/20 ${
                      selectedCategory === cat.id
                        ? 'text-[#2E2E2E]'
                        : 'bg-white text-[#7C7C7C] border border-[#E8E7E5]'
                    }`}
                    style={selectedCategory === cat.id ? { backgroundColor: `${color}28`, border: `1.5px solid ${color}` } : {}}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Records List */}
            <div className="space-y-3">
              {filteredRecords.length > 0 ? (
                filteredRecords.map(record => (
                  <RecordCard key={record.id} {...record} />
                ))
              ) : (
                <div className="text-center py-12">
                  <AppIcon name="archive" size={48} className="text-[#E8E7E5] mx-auto mb-3" />
                  <p className="text-[15px] text-[#ACACAC]">
                    {dateParam ? '이 날짜에 작성한 기록이 없어요' : '아직 작성한 기록이 없어요'}
                  </p>
                  <p className="text-[13px] text-[#D0D0D0] mt-1">
                    {dateParam ? '다른 날짜를 선택해보세요' : '첫 기록을 작성해보세요'}
                  </p>
                </div>
              )}
            </div>
          </>

        {/* 말씀카드 탭 */}
      </main>

      <BottomNav />
    </div>
  );
};

export default Records;
