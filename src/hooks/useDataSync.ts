import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { MeditationNote } from '@/utils/meditationStorage';
import type { PrayerNote } from '@/types/prayer';
import type { GratitudeNote } from '@/types/gratitude';
import type { Diary } from '@/utils/diaryStorage';

export function useDataSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    loadFromCloud().catch(console.error);
  }, [user]);

  const loadFromCloud = async () => {
    if (!user || isSyncing) return;

    setIsSyncing(true);
    try {
      // 1. Q.T 노트 다운로드
      const { data: meditations } = await supabase
        .from('meditation_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const localMeditations: MeditationNote[] = meditations?.map(m => ({
        id: m.id,
        title: m.title,
        passage: m.passage || '',
        content: m.content,
        application: m.application || '',
        applyChecked: m.apply_checked,
        applyCheckedAt: m.apply_checked_at,
        fullText: m.full_text || '',
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      })) || [];
      localStorage.setItem('meditations', JSON.stringify(localMeditations));

      // 2. 기도 제목 다운로드
      const { data: prayers } = await supabase
        .from('prayer_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const localPrayers: PrayerNote[] = prayers?.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        answered: p.answered || false,
        answeredAt: p.answered_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })) || [];
      localStorage.setItem('prayers', JSON.stringify(localPrayers));

      // 3. 감사 노트 다운로드
      const { data: gratitudes } = await supabase
        .from('gratitude_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const localGratitudes: GratitudeNote[] = gratitudes?.map(g => ({
        id: g.id,
        items: g.items,
        createdAt: g.created_at,
        updatedAt: g.created_at,
      })) || [];
      localStorage.setItem('gratitudes', JSON.stringify(localGratitudes));

      // 4. 일기 다운로드
      const { data: diaries } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const localDiaries: Diary[] = diaries?.map(d => ({
        id: d.id,
        content: d.content,
        createdAt: d.created_at,
        updatedAt: d.created_at,
      })) || [];
      localStorage.setItem('diaries', JSON.stringify(localDiaries));

      // 5. 카테고리 다운로드
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const localCategories = categories?.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        description: cat.description,
        includeInGoal: cat.include_in_goal,
        activeDays: cat.active_days,
        fields: cat.fields,
      })) || [];
      
      // 기본 카테고리와 병합
      const defaultCategories = [
        { id: '1', name: 'Q.T', color: '#7DB87D', icon: 'bookOpen', description: 'Q.T에 대해 기록해보세요', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6], fields: ['title', 'passage', 'content', 'application'] },
        { id: '2', name: '기도', color: '#A57DB8', icon: 'heart', description: '기도에 대해 기록해보세요', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6], fields: ['title', 'content', 'answered'] },
        { id: '3', name: '감사', color: '#E8C87D', icon: 'sparkles', description: '감사에 대해 기록해보세요', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6], fields: ['items'] },
        { id: '4', name: '일기', color: '#DD957D', icon: 'pencilLine', description: '일기에 대해 기록해보세요', includeInGoal: true, activeDays: [0, 1, 2, 3, 4, 5, 6], fields: ['content'] },
      ];
      
      localStorage.setItem('custom_categories', JSON.stringify([...defaultCategories, ...localCategories]));

      // 6. 커스텀 레코드 다운로드
      const { data: customRecords } = await supabase
        .from('custom_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const localRecords = customRecords?.map(rec => ({
        id: rec.id,
        categoryId: rec.category_id,
        data: rec.data,
        date: rec.date,
        createdAt: rec.created_at,
        updatedAt: rec.updated_at,
      })) || [];
      localStorage.setItem('custom_records', JSON.stringify(localRecords));

      setLastSyncAt(new Date());
      console.log('✅ 클라우드 데이터 동기화 완료');
    } catch (error) {
      console.error('동기화 실패:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToCloud = async () => {
    // 사용자가 수동으로 업로드 버튼 누를 때만 사용 (옵션)
    console.log('수동 업로드는 자동 백업으로 대체됨');
  };

  return {
    isSyncing,
    lastSyncAt,
    syncToCloud,
    loadFromCloud,
  };
}
