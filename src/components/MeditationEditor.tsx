import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { MultiApplicationInput, ApplicationItem } from '@/components/MultiApplicationInput';

interface MeditationEditorProps {
  initialTitle: string;
  initialPassage: string;
  initialContent: string;
  initialApplication: string | string[] | ApplicationItem[];
  onChange: (title: string, passage: string, content: string, application: string | string[] | ApplicationItem[]) => void;
  onContentChange?: (hasContent: boolean) => void;
}

export const MeditationEditor: React.FC<MeditationEditorProps> = ({
  initialTitle,
  initialPassage,
  initialContent,
  initialApplication,
  onChange,
  onContentChange
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [passage, setPassage] = useState(initialPassage);
  const [content, setContent] = useState(initialContent);
  const [application, setApplication] = useState<string[] | ApplicationItem[]>(
    Array.isArray(initialApplication) ? initialApplication : (initialApplication ? [initialApplication] : [''])
  );
  const titleRef = useRef<HTMLInputElement>(null);
  const passageRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout>();

  // application의 텍스트 부분만 추출하는 헬퍼 함수
  const getApplicationTexts = (app: string[] | ApplicationItem[]): string[] => {
    return app.map(item => typeof item === 'string' ? item : item.text);
  };

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      // Save current cursor position and scroll
      const scrollPos = window.scrollY;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Reset height to auto first to get proper scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight to expand
      textarea.style.height = textarea.scrollHeight + 'px';
      // Force overflow-y hidden to remove scrollbar
      textarea.style.overflowY = 'hidden';
      
      // Restore cursor and scroll position
      textarea.setSelectionRange(start, end);
      window.scrollTo(0, scrollPos);
    }
  };

  useEffect(() => {
    setTitle(initialTitle);
    setPassage(initialPassage);
    setContent(initialContent);
    setApplication(Array.isArray(initialApplication) ? initialApplication : (initialApplication ? [initialApplication] : ['']));

    // 초기 로드 시 높이 조절
    setTimeout(() => {
      adjustTextareaHeight(passageRef.current);
      adjustTextareaHeight(contentRef.current);
    }, 0);
  }, [initialTitle, initialPassage, initialContent, initialApplication]);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  const handleChange = (field: 'title' | 'passage' | 'content', value: string, textarea?: HTMLTextAreaElement | null) => {
    let newTitle = title;
    let newPassage = passage;
    let newContent = content;

    if (field === 'title') {
      setTitle(value);
      newTitle = value;
    } else if (field === 'passage') {
      setPassage(value);
      newPassage = value;
      adjustTextareaHeight(textarea);
    } else if (field === 'content') {
      setContent(value);
      newContent = value;
      adjustTextareaHeight(textarea);
    }

    // 내용 변경 알림
    if (onContentChange) {
      const appTexts = getApplicationTexts(application);
      const hasContent =
        newTitle.trim().length > 0 ||
        newPassage.trim().length > 0 ||
        newContent.trim().length > 0 ||
        appTexts.some(item => item.trim().length > 0);
      onContentChange(hasContent);
    }

    // 자동 저장 (800ms 디바운스)
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      onChange(newTitle, newPassage, newContent, application);
    }, 800);
  };

  const handleApplicationChange = (newApplication: string[] | ApplicationItem[]) => {
    setApplication(newApplication);

    // 내용 변경 알림
    if (onContentChange) {
      const appTexts = getApplicationTexts(newApplication);
      const hasContent =
        title.trim().length > 0 ||
        passage.trim().length > 0 ||
        content.trim().length > 0 ||
        appTexts.some(item => item.trim().length > 0);
      onContentChange(hasContent);
    }

    // 자동 저장 (800ms 디바운스)
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      onChange(title, passage, content, newApplication);
    }, 800);
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto px-5 py-6 pb-32">
      {/* 제목 섹션 */}
      <section className="mb-12">
        <label className="mb-2 block text-sm text-[#9B9B9B]">제목</label>
        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="border-none bg-transparent px-0 text-lg font-semibold leading-relaxed text-[#2E2E2E] placeholder:text-[#D0D0D0] focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="오늘의 묵상 제목을 입력하세요"
        />
      </section>

      {/* 본문 섹션 */}
      <section className="mb-12">
        <label className="mb-2 block text-sm text-[#9B9B9B]">본문</label>
        <Textarea
          ref={passageRef}
          value={passage}
          onChange={(e) => handleChange('passage', e.target.value, e.target)}
          className="min-h-[120px] resize-none border-none bg-transparent px-0 text-base leading-[1.8] text-[#2E2E2E] placeholder:text-[#D0D0D0] focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ overflowY: 'hidden' }}
          placeholder="읽은 말씀을 적어보세요"
        />
      </section>

      {/* 내용 섹션 */}
      <section className="mb-12">
        <label className="mb-2 block text-sm text-[#9B9B9B]">내용</label>
        <Textarea
          ref={contentRef}
          value={content}
          onChange={(e) => handleChange('content', e.target.value, e.target)}
          className="min-h-[120px] resize-none border-none bg-transparent px-0 text-base leading-[1.8] text-[#2E2E2E] placeholder:text-[#D0D0D0] focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ overflowY: 'hidden' }}
          placeholder="묵상 내용을 자유롭게 적어보세요"
        />
      </section>

      {/* 적용 섹션 */}
      <MultiApplicationInput
        values={application}
        onChange={handleApplicationChange}
        label="적용"
        placeholder="오늘 말씀을 삶에 어떻게 적용할까요?"
        categoryColor="#7DB87D"
      />
    </div>
  );
};
