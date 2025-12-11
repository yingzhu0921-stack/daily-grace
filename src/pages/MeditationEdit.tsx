import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeditationEditor } from '@/components/MeditationEditor';
import { get, update } from '@/utils/meditationStorage';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationItem } from '@/types/meditation';

const MeditationEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [passage, setPassage] = useState('');
  const [content, setContent] = useState('');
  const [application, setApplication] = useState<string | string[] | ApplicationItem[]>('');
  const [hasContent, setHasContent] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (id) {
      const note = get(id);
      if (note) {
        setTitle(note.title || '');
        setPassage(note.passage || '');
        setContent(note.content || '');
        // applications 배열이 있으면 사용, 없으면 application 문자열 사용
        setApplication(note.applications || note.application || '');
        setHasContent(true);
      } else {
        toast({
          title: "묵상을 찾을 수 없습니다",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  }, [id, navigate]);

  const handleContentChange = (newTitle: string, newPassage: string, newContent: string, newApplication: string | string[] | ApplicationItem[]) => {
    setTitle(newTitle);
    setPassage(newPassage);
    setContent(newContent);
    setApplication(newApplication);
    setIsDirty(true);
  };

  const handleComplete = () => {
    if (!id) return;

    // ApplicationItem[] 형식을 문자열로 변환
    const getApplicationText = (app: string | string[] | ApplicationItem[]): string => {
      if (typeof app === 'string') return app;
      if (Array.isArray(app)) {
        return app
          .map((item) => typeof item === 'string' ? item : item.text)
          .filter((text) => text.trim())
          .join('\n');
      }
      return '';
    };

    const applicationText = getApplicationText(application);

    if (!title.trim() && !passage.trim() && !content.trim() && !applicationText.trim()) {
      toast({
        title: "내용을 입력해주세요",
        description: "최소 한 섹션 이상 작성해야 합니다.",
      });
      return;
    }

    const fullText = `# 제목\n${title}\n\n## 본문\n${passage}\n\n## 내용\n${content}\n\n## 적용\n${applicationText}`;

    // ApplicationItem[] 배열 추출
    const getApplicationsArray = (app: string | string[] | ApplicationItem[]): ApplicationItem[] => {
      if (Array.isArray(app)) {
        return app
          .map((item) => typeof item === 'string' ? { text: item, checked: false } : item)
          .filter((item) => item.text.trim());
      }
      if (typeof app === 'string' && app.trim()) {
        return [{ text: app, checked: false }];
      }
      return [];
    };

    const applicationsArray = getApplicationsArray(application);

    update(id, {
      title: title.trim(),
      passage: passage.trim(),
      content: content.trim(),
      application: applicationText.trim(),
      applications: applicationsArray,
      fullText
    });
    
    toast({
      title: "저장 완료!",
      description: "클라우드에 백업되었습니다.",
    });
    navigate(`/meditation/${id}`, { replace: true });
  };

  const handleBack = () => {
    if (isDirty) {
      if (confirm('수정 중인 내용이 있어요. 저장하지 않고 나가시겠어요?')) {
        navigate(`/meditation/${id}`);
      }
    } else {
      navigate(`/meditation/${id}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F7]">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED] bg-[#FAF9F7]">
        <button
          onClick={handleBack}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">Q.T</h1>
        
        <button
          onClick={handleComplete}
          disabled={!hasContent}
          className={`h-9 px-5 rounded-full text-sm font-medium transition-colors ${
            hasContent 
              ? 'bg-[#7DB87D] hover:bg-[#6da76d] text-white' 
              : 'bg-[#E8E7E5] text-[#ACACAC] cursor-not-allowed'
          }`}
        >
          저장
        </button>
      </header>

      {/* 에디터 */}
      <main className="flex flex-1 flex-col">
        <MeditationEditor
          initialTitle={title}
          initialPassage={passage}
          initialContent={content}
          initialApplication={application}
          onChange={handleContentChange}
          onContentChange={setHasContent}
        />
      </main>
    </div>
  );
};

export default MeditationEdit;
