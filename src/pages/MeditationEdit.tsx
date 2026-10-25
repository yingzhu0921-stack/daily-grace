import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeditationEditor, type MeditationEditorHandle } from '@/components/MeditationEditor';
import { get, update } from '@/utils/meditationStorage';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ApplicationItem } from '@/types/meditation';
import { saveFeedback } from '@/utils/saveFeedback';

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
  const editorRef = useRef<MeditationEditorHandle>(null);

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

    // 에디터의 onChange 는 800ms 디바운스라, 타이핑 직후 저장을 누르면 state 가 아직 옛 값이다.
    // 그대로 저장하면 "저장 완료" 만 뜨고 내용은 그대로다.
    // 저장 시점에는 에디터가 들고 있는 현재 값을 직접 가져와 이 함수 안에서만 쓴다.
    const live = editorRef.current?.getValues();
    const titleNow = live?.title ?? title;
    const passageNow = live?.passage ?? passage;
    const contentNow = live?.content ?? content;
    const applicationNow = live?.application ?? application;

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

    const applicationText = getApplicationText(applicationNow);

    if (!titleNow.trim() && !passageNow.trim() && !contentNow.trim() && !applicationText.trim()) {
      toast({
        title: "내용을 입력해주세요",
        description: "최소 한 섹션 이상 작성해야 합니다.",
      });
      return;
    }

    const fullText = `# 제목\n${titleNow}\n\n## 본문\n${passageNow}\n\n## 내용\n${contentNow}\n\n## 적용\n${applicationText}`;

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

    const applicationsArray = getApplicationsArray(applicationNow);

    update(id, {
      title: titleNow.trim(),
      passage: passageNow.trim(),
      content: contentNow.trim(),
      application: applicationText.trim(),
      applications: applicationsArray,
      fullText
    });
    
    toast({
      title: "저장 완료!",
      description: saveFeedback(Boolean(user)),
      duration: 2000, // 2초
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
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#EDEDED] bg-[#FAFAF9]">
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
              ? 'bg-[#4F8A5B] hover:bg-[#3d7849] text-white' 
              : 'bg-[#E8E7E5] text-[#ACACAC] cursor-not-allowed'
          }`}
        >
          저장
        </button>
      </header>

      {/* 에디터 */}
      <main className="flex flex-1 flex-col">
        <MeditationEditor
          ref={editorRef}
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
