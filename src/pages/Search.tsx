import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import { RecordCard } from '@/components/RecordCard';
import { searchRecords, RecordType } from '@/utils/recordsQuery';
import { Search as SearchIcon } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
  fields?: string[];
};

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<RecordType[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [results, setResults] = useState(() => searchRecords(''));
  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadCustomCategories = () => {
      const saved = localStorage.getItem('custom_categories');
      if (saved) {
        const parsed: Category[] = JSON.parse(saved);
        setCustomCategories(parsed.filter(c => !['1', '2', '3', '4'].includes(c.id)));
      }
    };

    loadCustomCategories();
    window.addEventListener('categoriesUpdated', loadCustomCategories);
    return () => window.removeEventListener('categoriesUpdated', loadCustomCategories);
  }, []);

  useEffect(() => {
    let filtered = searchRecords(query, selectedTypes.length > 0 ? selectedTypes : undefined);
    if (sortBy === 'oldest') {
      filtered = [...filtered].reverse();
    }
    setResults(filtered);
  }, [query, selectedTypes, sortBy]);

  const toggleType = (type: RecordType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const typeFilters = [
    { type: 'meditation' as const, label: 'Q.T', color: 'rgba(125,184,125,1)', icon: 'bookOpen' as IconName },
    { type: 'prayer' as const, label: '기도', color: 'rgba(165,125,184,1)', icon: 'heart' as IconName },
    { type: 'gratitude' as const, label: '감사', color: 'rgba(232,200,125,1)', icon: 'sparkles' as IconName },
    { type: 'diary' as const, label: '일기', color: 'rgba(221,149,125,1)', icon: 'pencilLine' as IconName },
  ];

  return (
    <div className="min-h-screen bg-[rgba(249,248,246,1)]">
      <Header />
      <main className="max-w-5xl mx-auto px-5 pb-8">
        {/* 헤더 */}
        <div className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <AppIcon name="search" size={18} className="text-[#7C7C7C]" />
            <span className="text-[13px] font-medium text-[#7C7C7C]">검색</span>
          </div>
          <h1 className="text-[24px] font-semibold text-[#2E2E2E]">기록 검색</h1>
        </div>

        {/* 검색바 */}
        <div className="mb-4">
          <div className="relative">
            <SearchIcon 
              size={18} 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B9B9B]" 
            />
            <input
              type="text"
              placeholder="제목, 내용으로 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-[#E8E6E1] text-[15px] text-[#2E2E2E] placeholder:text-[#BDBDBD] focus:outline-none focus:border-[#7DB87D]"
            />
          </div>
        </div>

        {/* 필터 - 가로 스크롤 지원 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#E8E6E1] scrollbar-track-transparent">
            <span className="text-[13px] text-[#7C7C7C] font-medium flex-shrink-0">필터:</span>
            
            {/* 기본 카테고리 필터 */}
            {typeFilters.map(filter => (
              <button
                key={filter.type}
                onClick={() => toggleType(filter.type)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium flex-shrink-0 transition-colors ${
                  selectedTypes.includes(filter.type)
                    ? 'text-white'
                    : 'bg-[#F3F2F1] text-[#7E7C78] hover:bg-[#E8E6E1]'
                }`}
                style={
                  selectedTypes.includes(filter.type)
                    ? { backgroundColor: filter.color }
                    : undefined
                }
              >
                <AppIcon name={filter.icon} size={14} strokeWidth={2} />
                {filter.label}
              </button>
            ))}

            {/* 커스텀 카테고리 필터 (현재는 표시만, 실제 필터링은 추후 구현) */}
            {customCategories.map(cat => (
              <button
                key={cat.id}
                disabled
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium flex-shrink-0 bg-[#F3F2F1] text-[#BDBDBD] cursor-not-allowed"
                title="커스텀 카테고리 검색은 곧 지원 예정입니다"
              >
                {cat.icon ? (
                  <AppIcon name={cat.icon} size={14} strokeWidth={2} />
                ) : (
                  <span className="text-[10px]">{cat.name.charAt(0)}</span>
                )}
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 정렬 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] text-[#7C7C7C]">
            {results.length}개의 기록
          </p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="px-3 py-1.5 bg-white rounded-lg border border-[#E8E6E1] text-[13px] text-[#333] focus:outline-none focus:border-[#7DB87D]"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
        </div>

        {/* 결과 */}
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map(record => (
              <RecordCard key={record.id} {...record} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl px-6 py-10 text-center">
            <p className="text-[14px] text-[#7E7C78] leading-relaxed">
              {query.trim() ? '일치하는 결과가 없어요.' : '검색어를 입력해보세요.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
