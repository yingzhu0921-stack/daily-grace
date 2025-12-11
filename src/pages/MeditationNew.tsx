import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeditationEditor } from '@/components/MeditationEditor';
import { create } from '@/utils/meditationStorage';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from '@/components/LoginModal';
import { meditationSchema } from '@/utils/validation';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimePicker } from '@/components/onboarding/TimePicker';
import { ApplicationItem } from '@/types/meditation';

const MeditationNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [passage, setPassage] = useState('');
  const [content, setContent] = useState('');
  const [application, setApplication] = useState<string | string[] | ApplicationItem[]>([{ text: '', checked: false }]);
  const [hasContent, setHasContent] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [applicationReminderTime, setApplicationReminderTime] = useState<string>(() => {
    // 현재 시간 + 2시간을 기본값으로
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });

  const handleContentChange = (newTitle: string, newPassage: string, newContent: string, newApplication: string | string[] | ApplicationItem[]) => {
    setTitle(newTitle);
    setPassage(newPassage);
    setContent(newContent);
    setApplication(newApplication);
  };

  const handleComplete = async () => {
    // ApplicationItem[] 형식을 문자열로 변환
    const getApplicationText = (app: string | string[] | ApplicationItem[]): string => {
      if (typeof app === 'string') return app;
      if (Array.isArray(app)) {
        return app
          .map(item => typeof item === 'string' ? item : item.text)
          .filter(text => text.trim())
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

    // 입력 검증
    const validationResult = meditationSchema.safeParse({
      title,
      passage,
      content,
      application: applicationText,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "입력 오류",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    // 로그인 체크
    if (!user) {
      setShowLoginModal(true);
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

    // 즉시 저장 (Optimistic UI)
    const newNote = await create({
      title: title.trim(),
      passage: passage.trim(),
      content: content.trim(),
      application: applicationText.trim(),
      applications: applicationsArray, // 배열 형태로 저장
      applyChecked: false,
      fullText
    });

    // 즉시 피드백
    toast({
      title: "저장 완료!",
      description: "클라우드에 백업되었습니다.",
      duration: 2000, // 2초
    });

    // 저장된 노트 ID 저장하고 알림 모달 표시
    setSavedNoteId(newNote.id);
    setShowReminderModal(true);
  };

  const handleSetReminder = () => {
    // 알림 프롬프트 모달 닫고 시간 선택 모달 표시
    setShowReminderModal(false);
    setShowTimePickerModal(true);
  };

  const handleConfirmTime = async () => {
    if (!savedNoteId) return;

    // 알림 권한 요청
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // 해당 Q.T의 적용 알림 저장
        const applicationReminders = JSON.parse(
          localStorage.getItem('application_reminders') || '{}'
        );

        const getApplicationText = (app: string | string[] | ApplicationItem[]): string => {
          if (typeof app === 'string') return app;
          if (Array.isArray(app)) {
            return app
              .map(item => typeof item === 'string' ? item : item.text)
              .filter(text => text.trim())
              .join('\n');
          }
          return '';
        };

        const applicationText = getApplicationText(application);

        applicationReminders[savedNoteId] = {
          time: applicationReminderTime,
          application: applicationText,
          title: title,
          createdAt: new Date().toISOString(),
          enabled: true,
          frequency: 'today', // 기본값: 오늘만
          customDays: [], // 커스텀 요일 (비어있음)
        };

        localStorage.setItem('application_reminders', JSON.stringify(applicationReminders));
        
        toast({
          title: "적용 알림이 설정되었습니다",
          description: `오늘 ${applicationReminderTime}에 적용 내용을 알려드립니다.`,
        });
      } else {
        toast({
          title: "알림 권한이 필요합니다",
          description: "브라우저 설정에서 알림 권한을 허용해주세요.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "알림을 지원하지 않는 브라우저입니다",
        description: "다른 브라우저를 사용해주세요.",
        variant: "destructive",
      });
    }
    
    setShowTimePickerModal(false);
    navigateToNote();
  };

  const handleSkipReminder = () => {
    setShowReminderModal(false);
    navigateToNote();
  };

  const navigateToNote = () => {
    if (savedNoteId) {
      navigate('/meditation', { replace: true });
      setTimeout(() => {
        navigate(`/meditation/${savedNoteId}?new=${savedNoteId}`);
      }, 0);
    }
  };

  const handleShare = () => {
    const parts: string[] = [];
    const today = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');

    parts.push(today);
    parts.push('Q.T\n');

    if (title.trim()) parts.push(`제목: ${title}`);
    if (passage.trim()) parts.push(`본문: ${passage}`);
    if (content.trim()) parts.push(`내용: ${content}`);

    const getApplicationText = (app: string | string[] | ApplicationItem[]): string => {
      if (typeof app === 'string') return app;
      if (Array.isArray(app)) {
        return app
          .map(item => typeof item === 'string' ? item : item.text)
          .filter(text => text.trim())
          .join('\n');
      }
      return '';
    };

    const applicationText = getApplicationText(application);
    if (applicationText.trim()) {
      const items = Array.isArray(application)
        ? application.map(item => typeof item === 'string' ? item : item.text).filter(text => text.trim())
        : [application as string];

      if (items.length > 1) {
        parts.push(`적용:\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`);
      } else {
        parts.push(`적용: ${applicationText}`);
      }
    }

    const shareText = parts.join('\n\n');

    navigator.clipboard.writeText(shareText);
    toast({
      title: "전체 내용이 복사되었어요!",
    });
  };

  const handleBack = () => {
    if (hasContent) {
      if (confirm('작성 중인 내용이 있어요. 나가시겠어요?')) {
        navigate('/meditation');
      }
    } else {
      navigate('/meditation');
    }
  };

  return (
    <>
      <LoginModal 
        open={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        callbackUrl="/meditation/new"
        title="기록을 안전하게 저장하시겠어요?"
        description="클라우드에 저장하고 언제 어디서나 확인하세요."
      />
      
      <div className="flex min-h-screen flex-col bg-[#FAF9F7]">
        {/* 헤더 */}
      <header className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-[#F0EFED] bg-[#FAF9F7] px-5 py-4">
        <button
          onClick={handleBack}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-medium text-[#2E2E2E]">Q.T</h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={!hasContent}
            className="p-2"
          >
            <Share2 className={`w-5 h-5 ${hasContent ? 'text-[#2E2E2E]' : 'text-[#ACACAC]'}`} />
          </button>
          <button
            onClick={handleComplete}
            disabled={!hasContent}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              hasContent 
                ? 'bg-[#7DB87D] text-white hover:bg-[#6da76d]' 
                : 'bg-[#E8E7E5] text-[#ACACAC] cursor-not-allowed'
            }`}
          >
            저장
          </button>
        </div>
      </header>

      {/* 에디터 */}
      <main className="mt-[60px] flex flex-1 flex-col">
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

    {/* 알림 설정 모달 */}
    <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
      <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-[#7DB87D]/10 flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#7DB87D]" />
            </div>
          </div>
          <DialogTitle className="text-[18px] font-semibold text-[#2E2E2E] text-center">
            오늘의 적용을 기억하도록<br />알림을 받을까요?
          </DialogTitle>
          <p className="text-[13px] text-[#7E7C78] text-center mt-2">
            작성한 적용을 실천할 수 있도록<br />
            원하는 시간에 알림을 보내드립니다.
          </p>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={handleSetReminder}
            className="w-full h-12 bg-[#7DB87D] hover:bg-[#6da76d] text-white rounded-xl text-[15px] font-medium"
          >
            알림 설정하기
          </Button>
          <Button
            onClick={handleSkipReminder}
            variant="ghost"
            className="w-full h-12 text-[#7E7C78] hover:bg-[#F3F2F1] rounded-xl text-[15px] font-medium"
          >
            지금은 안 받을게요
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* 시간 선택 모달 */}
    <Dialog open={showTimePickerModal} onOpenChange={setShowTimePickerModal}>
      <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-[#7DB87D]/10 flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#7DB87D]" />
            </div>
          </div>
          <DialogTitle className="text-[18px] font-semibold text-[#2E2E2E] text-center">
            언제 실천하실 건가요?
          </DialogTitle>
          <p className="text-[13px] text-[#7E7C78] text-center mt-2">
            설정한 시간에 오늘의 적용 내용을<br />
            알림으로 알려드립니다.
          </p>
        </DialogHeader>
        <div className="px-6 pb-6">
          <div className="mb-4 flex justify-center">
            <TimePicker value={applicationReminderTime} onChange={setApplicationReminderTime} />
          </div>
          <div className="space-y-3">
            <Button
              onClick={handleConfirmTime}
              className="w-full h-12 bg-[#7DB87D] hover:bg-[#6da76d] text-white rounded-xl text-[15px] font-medium"
            >
              확인
            </Button>
            <Button
              onClick={() => {
                setShowTimePickerModal(false);
                navigateToNote();
              }}
              variant="ghost"
              className="w-full h-12 text-[#7E7C78] hover:bg-[#F3F2F1] rounded-xl text-[15px] font-medium"
            >
              나중에 하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default MeditationNew;
