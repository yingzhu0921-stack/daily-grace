import React, { useState, useEffect, useRef } from 'react';
import { routes } from '@/config/routes';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import { LineIcon } from '@/components/ui/LineIcon';
import { tintColor } from '@/utils/tintColor';
import { getAllCards, type VerseCard } from '@/utils/verseCardDB';
import { BottomNav } from '@/components/BottomNav';
import { CategoryManager } from '@/components/CategoryManager';
import { UserMenu } from '@/components/UserMenu';
import { getAllRecords, hasRecordOnDate, getRecordCounts } from '@/utils/recordsQuery';
import { SwipeableRecordCard } from '@/components/SwipeableRecordCard';
import { getTodayGoalCount, getStreakDays } from '@/utils/recordsQuery';
import { toLocalDateString as toLocal } from '@/utils/dateHelpers';
import { toLocalDateString } from '@/utils/dateHelpers';
import * as categoryStorage from '@/utils/categoryStorage';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

type Category = {
  id: string;
  name: string;
  color: string;
  icon?: IconName;
  description?: string;
  iconBg?: string;
  iconColor?: string;
  cardBg?: string;
  titleColor?: string;
  subColor?: string;
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

const normalizeCategoryColor = (color?: string) => {
  if (!color) return '#7DB87D';
  const upper = color.toUpperCase();
  return LEGACY_COLOR_MAP[upper] || color;
};

/** 말씀 첫 줄(카드 칸 미리보기용). 사용자가 쓴 글자를 그대로 쓴다. */
const firstLine = (text?: string) => (text || '').split('\n').map((l) => l.trim()).find(Boolean) || '말씀카드';

const relativeDay = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((new Date(toLocal(new Date())).getTime() - new Date(toLocal(d)).getTime()) / 86400000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const IndexNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 홈 말씀카드 칸 아래 '최근에 만든 카드' 한 장(2026-11-13 UI 개편). 없으면 줄을 그리지 않는다.
  const [latestCard, setLatestCard] = useState<VerseCard | null>(null);
  useEffect(() => {
    let alive = true;
    getAllCards().then((cards) => { if (alive) setLatestCard(cards[0] ?? null); }).catch(() => { /* 카드가 없어도 홈은 그린다 */ });
    return () => { alive = false; };
  }, []);

  const [customCategories, setCustomCategories] = useState<any[]>([]);
  // 커스텀 카테고리는 서버에서 늦게 온다. 그동안 칸이 4개였다가 6개로 늘며 화면이 밀렸다.
  // 지난번 개수를 기억해 그만큼 빈 칸을 미리 깔아 둔다.
  const [categoriesReady, setCategoriesReady] = useState(false);
  const rememberedCustomCount = (() => {
    try { return Math.min(6, Math.max(0, Number(localStorage.getItem('custom_category_count') || 0))); }
    catch { return 0; }
  })();
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  /**
   * 카드를 길게 누르면 수정·삭제 메뉴(2026-11-10 사용자 결정). 전에는 카테고리 관리 창을 열어 찾아 들어가야 했고,
   * 그 창의 버튼은 폰에선 보이지도 않았다. 짧게 누르면 지금처럼 그 카테고리로 간다.
   */
  const [menuCategory, setMenuCategory] = useState<any | null>(null);
  const [categoryRequest, setCategoryRequest] = useState<{ action: 'edit' | 'delete'; id: string; nonce: number } | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  const [hintSeen, setHintSeen] = useState(() => {
    try { return localStorage.getItem('category_longpress_hint_seen') === '1'; } catch { return true; }
  });
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const startPress = (category: any, e: React.PointerEvent) => {
    longPressed.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    cancelPress();
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(10);
      if (category.listPath) {
        toast('기본 카테고리는 수정·삭제할 수 없어요');
      } else {
        setMenuCategory(category);
      }
      if (!hintSeen) {
        setHintSeen(true);
        try { localStorage.setItem('category_longpress_hint_seen', '1'); } catch { /* 다시 보여도 괜찮다 */ }
      }
    }, 500);
  };
  const movePress = (e: React.PointerEvent) => {
    // 스크롤하려고 끌면 길게 누르기가 아니다.
    const s0 = pressStart.current;
    if (s0 && Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 10) cancelPress();
  };
  const runCategoryAction = (action: 'edit' | 'delete') => {
    if (!menuCategory) return;
    setCategoryRequest({ action, id: menuCategory.id, nonce: Date.now() });
    setMenuCategory(null);
  };
  // 첫 그림부터 계산값으로 시작한다. 빈 값(0/4·0일)으로 그렸다가 바꾸면 홈에 돌아올 때마다 숫자가 깜빡였다.
  const [goalProgress, setGoalProgress] = useState(() => getTodayGoalCount());
  const [streakDays, setStreakDays] = useState(() => getStreakDays());
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const todayCounts = getRecordCounts(toLocal(new Date()));

  // 온보딩 체크
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (!onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  // 기본 카테고리
  const defaultCategories = [
    { id: '1', name: 'Q.T', color: '#7DB87D', icon: 'bookOpen' as IconName, description: '말씀을 묵상하며 은혜를 나눠요', path: '/meditation/new', listPath: '/meditation' },
    { id: '2', name: '기도', color: '#A57DB8', icon: 'hands' as IconName, description: '하루의 기도를 적어보세요', path: '/prayer/new', listPath: '/prayer' },
    { id: '3', name: '감사', color: '#E8C87D', icon: 'sun' as IconName, description: '감사했던 순간을 떠올려보세요', path: '/gratitude/new', listPath: '/gratitude' },
    { id: '4', name: '일기', color: '#DD957D', icon: 'pencilLine' as IconName, description: '오늘의 마음을 기록해보세요', path: '/diary/new', listPath: '/diary' },
  ];

  // Goal/Streak 계산
  useEffect(() => {
    const updateStats = () => {
      const goal = getTodayGoalCount();
      setGoalProgress(goal);
      setStreakDays(getStreakDays());
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  // 커스텀 카테고리를 다 불러오면 목표 개수(분모)를 바로 다시 센다. 전에는 30초 뒤에야 4 → 6 으로 바뀌었다.
  useEffect(() => {
    if (categoriesReady) setGoalProgress(getTodayGoalCount(customCategories));
  }, [categoriesReady, customCategories]);

  // 최신 기록 로드. 밀어서 지우거나 다른 화면·동기화로 바뀌면 'recordsUpdated' 가 온다 — 그때 다시 읽고
  // 오늘 완료·연속 숫자도 다시 센다.
  useEffect(() => {
    const load = () => {
      setRecentRecords(getAllRecords().slice(0, 5)); // 최신 5개
      setGoalProgress(getTodayGoalCount());
      setStreakDays(getStreakDays());
    };
    load();
    window.addEventListener('recordsUpdated', load);
    return () => window.removeEventListener('recordsUpdated', load);
  }, []);

  // 커스텀 카테고리 로드
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        // 먼저 캐시된 데이터를 즉시 표시
        const cached = sessionStorage.getItem('custom_categories');
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            setCustomCategories(cachedData.map((cat: any) => ({ ...cat, color: normalizeCategoryColor(cat.color) })));
          } catch (e) {
            console.error('Cache parse error:', e);
          }
        }

        // 백그라운드에서 최신 데이터 가져오기
        const dbCategories = await categoryStorage.list();

        // user_id가 있는 것만 커스텀 카테고리 (기본 카테고리는 user_id가 null)
        const customs = dbCategories
          .filter((cat: any) => cat.user_id != null)
          .map((cat: any) => ({ ...cat, color: normalizeCategoryColor(cat.color) }));

        // 캐시 업데이트
        sessionStorage.setItem('custom_categories', JSON.stringify(customs));
        setCustomCategories(customs);
        try { localStorage.setItem('custom_category_count', String(customs.length)); } catch { /* 저장 못 해도 동작엔 지장 없다 */ }
      } catch (error) {
        console.error('❌ Failed to load custom categories on Index page:', error);
      } finally {
        setCategoriesReady(true);
      }
    };

    loadCustomCategories();

    const handleCategoriesUpdated = () => {
      loadCustomCategories();
    };

    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);
    return () => window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
  }, []);

  // 추천 메시지. 2026-11-13 사용성 점검: 문구("감사를 먼저 기록해볼까요?") 바로 아래가 늘 '카드 만들기' 배너라
  // 문구를 따라 누르면 엉뚱한 곳으로 갔다. 이제 문구 자체가 그 기록 쓰기로 가는 버튼이다.
  // 또 화면이 다시 그려질 때마다 문구가 바뀌어서, 들어올 때 한 번만 고른다.
  const [recommendationPick] = useState(() => Math.floor(Math.random() * 4));
  const getRecommendation = (): { text: string; path?: string } => {
    // 다 채운 날에는 "시작해보세요" 가 어색하다. 완료 상태에 맞는 말을 한다.
    if (goalProgress.total > 0 && goalProgress.completed >= goalProgress.total) {
      return { text: '오늘의 기록을 모두 남겼어요' };
    }
    const messages = [
      { text: '오늘은 감사를 먼저 기록해볼까요?', path: routes.gratitudeNew },
      { text: '하루를 Q.T로 시작해보세요', path: routes.meditationNew },
      { text: '기도 제목을 적어볼까요?', path: routes.prayerNew },
      { text: '오늘의 마음을 일기로 남겨보세요', path: routes.diaryNew },
    ];
    return messages[recommendationPick];
  };

  // 카테고리 카드 클릭 핸들러 - 보관함/상세 페이지로 이동
  const handleCategoryClick = (category: any) => {
    // 커스텀 카테고리인 경우 sessionStorage에 캐시 저장 (빠른 로딩)
    if (!category.listPath) {
      sessionStorage.setItem(`category_${category.id}`, JSON.stringify(category));
    }

    if (category.listPath) {
      // 기본 카테고리는 listPath로 이동 (예: /meditation, /prayer)
      navigate(category.listPath);
    } else {
      // 커스텀 카테고리는 /custom/:id 경로로 이동
      navigate(`/custom/${category.id}`);
    }
  };

  // 캘린더 함수들
  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getWeekDays = () => {
    const days = [];
    const current = new Date(selectedDate);

    // 선택된 날짜를 중심으로 좌우 3일씩 (총 7일)
    for (let i = -3; i <= 3; i++) {
      const date = new Date(current);
      date.setDate(current.getDate() + i);
      days.push(date);
    }

    return days;
  };

  const weekDays = getWeekDays();
  const today = new Date();
  const isToday = (date: Date) => date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  const isSelected = (date: Date) => date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();

  // 모든 카테고리 합치기
  const allCategories = [...defaultCategories, ...customCategories];

  return (
    <div className="min-h-screen bg-[#F6F3EC] pb-nav">
      {/* 헤더 */}
      {/* 스크롤하면 같이 올라간다(2026-11-10 사용자 결정). 완료·연속·프로필은 들어올 때 한 번 보면 되는 정보라,
          고정해 두면 홈 화면 앱에서 시계 줄·하단 바와 함께 기록 볼 공간만 좁혔다. */}
      {/* 2026-11-13 UI 개편(시안 3): 흰 칸 + 옅은 선, 기록 종류 색은 루틴 칸에만. 흐름·기능은 그대로. */}
      <header>
        <div className="max-w-[480px] mx-auto px-6 pt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[14px] font-bold text-[#1E1C1A] mr-1">하루은혜</span>
            {/* 오늘 완료·연속 — 숫자만 차분하게 */}
            <span className="h-7 px-2.5 rounded-full bg-white border border-[rgba(30,28,26,0.12)] text-[11.5px] font-semibold text-[#2A2723] inline-flex items-center whitespace-nowrap">
              {goalProgress.completed}/{goalProgress.total} 완료
            </span>
            <span className="h-7 px-2.5 rounded-full bg-white border border-[rgba(30,28,26,0.12)] text-[11.5px] font-semibold text-[#2A2723] inline-flex items-center whitespace-nowrap">
              {streakDays}일 연속
            </span>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-6">
        {/* 캘린더 섹션 */}
        <section className="pt-5 pb-5">
          {/* 날짜 + 추천 문구 */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[26px] font-bold text-[#1E1C1A] leading-tight tracking-[-0.03em]">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
              </h2>
              {(() => {
                const rec = getRecommendation();
                const day = ['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()];
                return rec.path ? (
                  <button
                    onClick={() => navigate(rec.path!)}
                    className="mt-1 flex items-center gap-0.5 text-[13px] text-[#6E675E] hover:text-[#1E1C1A] text-left"
                  >
                    {day}요일 · {rec.text}
                    <ChevronRight className="w-3.5 h-3.5 text-[#B3AB9F] flex-shrink-0" />
                  </button>
                ) : (
                  <p className="mt-1 text-[13px] text-[#6E675E]">{day}요일 · {rec.text}</p>
                );
              })()}
            </div>
            <div className="flex items-center gap-1 pt-1 flex-shrink-0">
              <button
                onClick={handleToday}
                className="h-7 px-2.5 rounded-full border border-[rgba(30,28,26,0.12)] bg-white text-[11.5px] font-semibold text-[#2A2723]"
              >
                오늘
              </button>
              <button
                onClick={handlePrevWeek}
                aria-label="지난주"
                className="w-7 h-7 rounded-full border border-[rgba(30,28,26,0.12)] bg-white flex items-center justify-center"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[#2A2723]" />
              </button>
              <button
                onClick={handleNextWeek}
                aria-label="다음 주"
                className="w-7 h-7 rounded-full border border-[rgba(30,28,26,0.12)] bg-white flex items-center justify-center"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[#2A2723]" />
              </button>
            </div>
          </div>

          {/* 주간 캘린더 */}
          <div className="flex justify-between mt-4">
            {weekDays.map((date, index) => {
              const selected = isSelected(date);
              const dateStr = toLocalDateString(date);
              const hasRecord = hasRecordOnDate(dateStr);
              const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
              const future = date > today && !isToday(date);

              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedDate(date);
                    // 항상 캘린더 페이지로 이동하도록 수정
                    navigate(`/calendar?date=${dateStr}`);
                  }}
                  className="flex-1 min-w-0 flex flex-col items-center gap-1 py-1"
                >
                  <span className={`text-[11.5px] ${selected ? 'text-[#1E1C1A] font-bold' : 'text-[#9A9288]'}`}>{dayLabel}</span>
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] ${
                      selected ? 'bg-[#1E1C1A] text-white font-bold' : future ? 'text-[#C9C2B8]' : 'text-[#2A2723] font-medium'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <span className={`w-1 h-1 rounded-full ${hasRecord ? 'bg-[#2A2723]' : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* 말씀카드 — 홈의 주인공. 흰 칸, 아래에 최근에 만든 카드 한 장 */}
        <div
          className="rounded-[22px] bg-white border border-[rgba(30,28,26,0.12)] px-[18px] pt-4 pb-3.5 mb-6 cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => navigate('/cards/designer')}
        >
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#6E675E]">
            <LineIcon name="card" size={15} />
            오늘의 말씀카드
          </div>
          <h3 className="mt-1.5 text-[16px] font-bold leading-[1.45] tracking-[-0.02em] text-[#1E1C1A]">
            오늘의 말씀,<br />카드로 남겨볼까요?
          </h3>
          <span className="mt-3 inline-flex h-9 px-4 rounded-full bg-[#1E1C1A] text-white text-[13px] font-semibold items-center">
            만들기 →
          </span>
          {latestCard?.imageDataUrl && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(routes.cardsVault); }}
              className="mt-3.5 pt-3 w-full border-t border-[rgba(30,28,26,0.10)] flex items-center gap-2.5 text-left"
            >
              <img src={latestCard.imageDataUrl} alt="" className="w-[34px] h-[42px] rounded-[7px] object-cover border border-[rgba(30,28,26,0.12)] flex-shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] text-[#8A8278]">최근에 만든 카드 · {relativeDay(latestCard.createdAt)}</span>
                <span className="block text-[13px] font-semibold text-[#1E1C1A] truncate">{firstLine(latestCard.text)}</span>
              </span>
              <span className="text-[12px] font-semibold text-[#2A2723]">보기</span>
            </button>
          )}
        </div>

        {/* 루틴 섹션 — 4개 이하는 색 칸, 5개 이상은 작은 목록(색은 아이콘 칸에만) */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-[13px] font-bold text-[#1E1C1A]">
              나의 루틴
            </h2>
            {/* 길게 누르기는 눈에 안 보이는 동작이라, 직접 만든 카테고리가 있을 때 처음 한 번만 알려 준다. */}
            {!hintSeen && customCategories.length > 0 ? (
              <span className="text-[11px] text-[#9A9288]">길게 누르면 수정·삭제</span>
            ) : (
              <span className="text-[12px] text-[#8A8278]">오늘 {goalProgress.completed} / {goalProgress.total}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {allCategories.map((category) => {
              const isDone =
                category.id === '1' ? todayCounts.meditation > 0 :
                category.id === '2' ? todayCounts.prayer > 0 :
                category.id === '3' ? todayCounts.gratitude > 0 :
                category.id === '4' ? todayCounts.diary > 0 : false;
              const compact = allCategories.length > 4;
              const icon = category.icon ? (
                <AppIcon name={category.icon} size={compact ? 16 : 20} color="#1E1C1A" />
              ) : (
                <span className="text-[13px] font-bold text-[#1E1C1A]">{category.name.charAt(0)}</span>
              );
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    // 길게 눌러 메뉴를 띄운 뒤 손을 떼면 click 이 따라온다. 그때는 이동하지 않는다.
                    if (longPressed.current) { longPressed.current = false; return; }
                    handleCategoryClick(category);
                  }}
                  onPointerDown={(e) => startPress(category, e)}
                  onPointerMove={movePress}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`relative flex items-center text-left select-none transition-transform active:scale-[0.97] border border-[rgba(30,28,26,0.12)] ${
                    compact ? 'h-[46px] rounded-[14px] px-2.5 gap-2.5 bg-white' : 'h-16 rounded-2xl px-3.5 gap-2.5'
                  }`}
                  // 아이폰에서 길게 누르면 뜨는 기본 메뉴(복사 등)를 막는다.
                  style={{ WebkitTouchCallout: 'none', ...(compact ? {} : { backgroundColor: tintColor(category.color) }) }}
                >
                  {compact ? (
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tintColor(category.color) }}>
                      {icon}
                    </span>
                  ) : icon}
                  <span className={`flex-1 min-w-0 truncate font-bold text-[#1E1C1A] ${compact ? 'text-[13.5px]' : 'text-[14px]'}`}>
                    {category.name}
                  </span>
                  {isDone && <LineIcon name="check" size={16} color="#2A2723" />}
                </button>
              );
            })}
            {!categoriesReady && customCategories.length === 0 &&
              Array.from({ length: rememberedCustomCount }).map((_, i) => (
                <div
                  key={`routine-skeleton-${i}`}
                  aria-hidden
                  className="h-[46px] rounded-[14px] bg-white animate-pulse border border-[rgba(30,28,26,0.12)]"
                />
              ))}
          </div>

          {/* 카테고리 추가 버튼 */}
          <button
            onClick={() => setShowCategoryManager(true)}
            className="w-full h-11 rounded-[14px] border border-dashed border-[rgba(30,28,26,0.25)] text-[13px] font-medium text-[#6E675E] flex items-center justify-center gap-1.5 transition-all hover:bg-white active:scale-95"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            카테고리 추가
          </button>
        </section>

        {/* 최신 기록 섹션 */}
        {recentRecords.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-bold text-[#1E1C1A]">
                최근 기록
              </h2>
              <button
                onClick={() => navigate('/records')}
                className="text-[12px] text-[#8A8278] font-medium"
              >
                전체 보기
              </button>
            </div>

            <div className="space-y-3">
              {recentRecords.map((record) => (
                <SwipeableRecordCard key={record.id} {...record} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* 카테고리 관리 모달 */}
      <CategoryManager open={showCategoryManager} onClose={() => setShowCategoryManager(false)} request={categoryRequest} />

      {/* 카드를 길게 눌렀을 때의 메뉴 */}
      <Dialog open={!!menuCategory} onOpenChange={(o) => { if (!o) setMenuCategory(null); }}>
        <DialogContent hideCloseButton className="w-[calc(100%-32px)] max-w-[340px] rounded-3xl p-5 gap-0">
          <DialogTitle className="text-[16px] font-semibold text-[#2E2E2E] text-center">{menuCategory?.name}</DialogTitle>
          <DialogDescription className="sr-only">카테고리 수정 또는 삭제</DialogDescription>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => runCategoryAction('edit')}
              className="w-full h-12 rounded-xl border border-[#E8E7E5] bg-white text-[15px] font-medium text-[#2E2E2E] hover:bg-[#F9F8F6]"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => runCategoryAction('delete')}
              className="w-full h-12 rounded-xl border border-[#E8E7E5] bg-white text-[15px] font-medium text-[#DD5F4E] hover:bg-[#FFF5F2]"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={() => setMenuCategory(null)}
              className="w-full h-11 rounded-xl text-[14px] text-[#7E7C78]"
            >
              취소
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndexNew;
