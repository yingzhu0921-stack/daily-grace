import { useState, useEffect, useCallback } from 'react';
import { MeditationNote, MeditationDraft } from '@/types/meditation';

const NOTES_KEY = 'meditation_notes';
const DRAFTS_KEY = 'meditation_drafts';

export const useMeditationStorage = () => {
  const [notes, setNotes] = useState<MeditationNote[]>([]);
  const [drafts, setDrafts] = useState<MeditationDraft[]>([]);

  useEffect(() => {
    const storedNotes = localStorage.getItem(NOTES_KEY);
    const storedDrafts = localStorage.getItem(DRAFTS_KEY);
    
    if (storedNotes) {
      const parsedNotes = JSON.parse(storedNotes);
      // 기존 노트에 content 필드 추가 (마이그레이션)
      const migratedNotes = parsedNotes.map((note: any) => ({
        ...note,
        content: note.content || '' // content 필드가 없으면 빈 문자열
      }));
      setNotes(migratedNotes);
      // 마이그레이션된 데이터 저장
      if (JSON.stringify(parsedNotes) !== JSON.stringify(migratedNotes)) {
        localStorage.setItem(NOTES_KEY, JSON.stringify(migratedNotes));
      }
    }
    if (storedDrafts) {
      setDrafts(JSON.parse(storedDrafts));
    }
  }, []);

  const saveNote = useCallback((note: MeditationNote) => {
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== note.id);
      const updated = [...filtered, note];
      localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== id);
      localStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
      return filtered;
    });
  }, []);

  const getNote = useCallback((id: string) => {
    return notes.find(n => n.id === id);
  }, [notes]);

  const saveDraft = useCallback((draft: MeditationDraft) => {
    setDrafts(prev => {
      const filtered = prev.filter(d => d.id !== draft.id);
      const updated = [...filtered, draft];
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getDraft = useCallback((id: string) => {
    return drafts.find(d => d.id === id);
  }, [drafts]);

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => {
      const filtered = prev.filter(d => d.id !== id);
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
      return filtered;
    });
  }, []);

  return {
    notes,
    saveNote,
    deleteNote,
    getNote,
    saveDraft,
    getDraft,
    deleteDraft
  };
};
