import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import { routes } from '@/config/routes';
import { BottomNav } from '@/components/BottomNav';
import { getAllRecords } from '@/utils/recordsQuery';
import { RecordCard } from '@/components/RecordCard';
import { toLocalDateString } from '@/utils/dateHelpers';
import * as categoryStorage from '@/utils/categoryStorage';
import { getAllCards, type VerseCard } from '@/utils/verseCardDB';

type Category = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
  fields?: string[];
  includeInGoal?: boolean;
  description?: string;
};

type TabType = 'records' | 'cards';

const Records: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const tabParam = (searchParams.get('tab') as TabType) || 'records';

  const [activeTab, setActiveTab] = useState<TabType>(tabParam);
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cards, setCards] = useState<VerseCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  const defaultCategories = [
    { id: '1', label: 'Q.T', icon: 'bookOpen', route: routes.qt, color: 'rgba(125,184,125,1)', desc: '오늘의 말씀을 나눠보세요' },
    { id: '2', label: '기도', icon: 'heart', route: routes.prayer, color: 'rgba(165,125,184,1)', desc: '하루의 기도를 적어보세요' },
    { id: '3', label: '감사', icon: 'sparkles', route: routes.thanks, color: 'rgba(232,200,125,1)', desc: '감사했던 순간을 떠올려보세요' },
    { id: '4', label: '일기', icon: 'pencilLine', route: routes.diary, color: 'rgba(221,149,125,1)', desc: '오늘의 마음을 기록해보세요' },
  ];

  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  // 탭 변경 핸들러
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    setSearchParams(newSearchParams);
  };

  // 커스텀 카테고리 로드 (Supabase에서)
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        // 먼저 캐시된 데이터를 즉시 표시
        const cached = sessionStorage.getItem('custom_categories');
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            setCustomCategories(cachedData);
          } catch (e) {
            console.error('Cache parse error:', e);
          }
        }

        // 백그라운드에서 최신 데이터 가져오기
        const categories = await categoryStorage.list();
        // user_id가 있는 것만 커스텀 카테고리 (기본 카테고리는 user_id가 null)
        const customs = categories.filter((cat: any) => cat.user_id != null);

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

  // Load cards
  useEffect(() => {
    const loadCards = async () => {
      if (activeTab === 'cards') {
        try {
          setIsLoadingCards(true);
          const loadedCards = await getAllCards();
          setCards(loadedCards);
        } catch (error) {
          console.error('Failed to load cards:', error);
        } finally {
          setIsLoadingCards(false);
        }
      }
    };

    loadCards();
  }, [activeTab]);

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
    <div className="min-h-screen bg-[#FAF9F7] pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-[#F0EFED]">
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

        {/* 탭 */}
        <div className="max-w-[480px] mx-auto px-6 flex gap-6 pt-2">
          <button
            onClick={() => handleTabChange('records')}
            className={`pb-3 text-[15px] font-medium transition-colors relative ${
              activeTab === 'records' ? 'text-[#2E2E2E]' : 'text-[#ACACAC]'
            }`}
          >
            전체 기록
            {activeTab === 'records' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7DB87D]" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('cards')}
            className={`pb-3 text-[15px] font-medium transition-colors relative ${
              activeTab === 'cards' ? 'text-[#2E2E2E]' : 'text-[#ACACAC]'
            }`}
          >
            말씀카드
            {activeTab === 'cards' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7DB87D]" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-6 pb-8">
        {/* 전체 기록 탭 */}
        {activeTab === 'records' && (
          <>
            <div className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <AppIcon name="archive" size={18} className="text-[#7C7C7C]" />
                <span className="text-[13px] font-medium text-[#7C7C7C]">보관함</span>
              </div>
              <h1 className="text-[24px] font-semibold text-[#2E2E2E]">{formatDateHeader()}</h1>
              {dateParam && (
                <button
                  onClick={() => navigate('/records')}
                  className="mt-2 text-[13px] text-[#7DB87D] font-medium"
                >
                  전체 보기 →
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#7DB87D] text-white'
                    : 'bg-white text-[#7C7C7C] border border-[#E8E7E5]'
                }`}
              >
                전체
              </button>
              {defaultCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'text-white'
                      : 'bg-white text-[#7C7C7C] border border-[#E8E7E5]'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.label}
                </button>
              ))}
              {customCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'text-white'
                      : 'bg-white text-[#7C7C7C] border border-[#E8E7E5]'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.name}
                </button>
              ))}
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
        )}

        {/* 말씀카드 탭 */}
        {activeTab === 'cards' && (
          <div className="pt-4">
            {isLoadingCards ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#7B9AAC] border-r-transparent mb-4"></div>
                  <p className="text-sm text-[#7E7C78]">카드 불러오는 중...</p>
                </div>
              </div>
            ) : cards.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {cards.map(card => (
                  <div
                    key={card.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate('/cards/vault')}
                  >
                    {card.imageDataUrl ? (
                      <img
                        src={card.imageDataUrl}
                        alt={card.text}
                        className="w-full h-auto object-cover"
                      />
                    ) : (
                      <div
                        className="aspect-square flex items-center justify-center p-6"
                        style={{ backgroundColor: card.bg.startsWith('#') ? card.bg : '#7B9AAC' }}
                      >
                        <div className="text-center">
                          <p className="text-white text-[14px] font-medium line-clamp-4">
                            {card.text}
                          </p>
                          {card.ref && (
                            <p className="text-white/80 text-[11px] mt-2">{card.ref}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl px-6 py-10 text-center">
                <p className="text-[14px] text-[#7E7C78] leading-relaxed mb-4">
                  아직 만든 카드가 없어요.<br />
                  '카드 만들기'에서 시작해보세요.
                </p>
                <button
                  onClick={() => navigate(routes.cardDesigner)}
                  className="px-5 py-2.5 bg-[#7DB87D] text-white rounded-full text-[14px] font-medium hover:bg-[#6FA76F] transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  카드 만들기
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Records;
