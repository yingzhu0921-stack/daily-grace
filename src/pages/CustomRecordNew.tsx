import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Share2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from '@/components/LoginModal';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimePicker } from '@/components/onboarding/TimePicker';
import { MultiApplicationInput } from '@/components/MultiApplicationInput';
import { AnsweredDetailInput } from '@/components/AnsweredDetailInput';
import * as categoryStorage from '@/utils/categoryStorage';

type Category = {
  id: string;
  name: string;
  color: string;
  fields?: string[];
};

const CustomRecordNew = () => {
  const navigate = useNavigate();
  const { categoryId, recordId } = useParams<{ categoryId: string; recordId?: string }>();
  const { user } = useAuth();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean | string[]>>({
    title: '',
    passage: '',
    content: '',
    application: [''], // 다중 적용을 위해 배열로 변경
    answered: false,
    answeredDetail: '', // 응답 상세 내용 추가
  });
  const [hasContent, setHasContent] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [applicationReminderTime, setApplicationReminderTime] = useState<string>(() => {
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  
  // Refs for auto-expanding textareas
  const passageRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const applicationRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      const scrollPos = window.scrollY;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      textarea.style.overflowY = 'hidden';
      window.scrollTo(0, scrollPos);
    }
  };

  useEffect(() => {
    // Supabase에서 카테고리 정보 로드
    const loadCategory = async () => {
      try {
        if (!categoryId) return;

        const foundCategory = await categoryStorage.get(categoryId);
        if (foundCategory) {
          setCategory(foundCategory as Category);
        } else {
          toast({
            title: "카테고리를 찾을 수 없습니다",
            variant: "destructive",
          });
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to load category:', error);
        toast({
          title: "카테고리를 불러오는데 실패했습니다",
          variant: "destructive",
        });
      }
    };

    loadCategory();

    // 편집 모드: 기존 레코드 로드
    if (recordId) {
      setIsEditMode(true);
      const recordsSaved = localStorage.getItem('custom_records');
      if (recordsSaved) {
        const records = JSON.parse(recordsSaved);
        const foundRecord = records.find((r: any) => r.id === recordId);
        if (foundRecord) {
          console.log('Loading record for edit:', foundRecord);
          console.log('Original application:', foundRecord.application);

          // application 필드 변환
          let applicationArray: string[] = [''];
          if (foundRecord.application) {
            if (Array.isArray(foundRecord.application)) {
              applicationArray = foundRecord.application;
            } else if (typeof foundRecord.application === 'string') {
              // 문자열을 줄바꿈으로 분리
              applicationArray = foundRecord.application.split('\n').filter((s: string) => s.trim());
            }
          }

          console.log('Converted application array:', applicationArray);

          setFormData({
            title: foundRecord.title || '',
            passage: foundRecord.passage || '',
            content: foundRecord.content || '',
            application: applicationArray,
            answered: foundRecord.answered || false,
            answeredDetail: foundRecord.answeredDetail || '',
          });
        } else {
          toast({
            title: "기록을 찾을 수 없습니다",
            variant: "destructive",
          });
          navigate(`/custom/${categoryId}`);
        }
      }
    }
  }, [categoryId, recordId, navigate]);

  useEffect(() => {
    console.log('=== formData changed ===');
    console.log('Current formData:', formData);

    // 내용 변경 감지
    const hasAnyContent = Object.entries(formData).some(([key, value]) => {
      if (key === 'answered') return false;
      if (key === 'application' && Array.isArray(value)) {
        return value.some(item => item.trim().length > 0);
      }
      return typeof value === 'string' && value.trim().length > 0;
    });

    console.log('hasContent calculated:', hasAnyContent);
    setHasContent(hasAnyContent);

    // 초기 로드 및 데이터 변경 시 높이 조절
    setTimeout(() => {
      adjustTextareaHeight(passageRef.current);
      adjustTextareaHeight(contentRef.current);
      adjustTextareaHeight(applicationRef.current);
    }, 0);
  }, [formData]);

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    console.log('=== handleComplete called ===');
    console.log('hasContent:', hasContent);
    console.log('formData:', formData);

    if (!hasContent) {
      toast({
        title: "내용을 입력해주세요",
        description: "최소 한 필드 이상 작성해야 합니다.",
      });
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!category) return;

    const existingRecords = localStorage.getItem('custom_records');
    const records = existingRecords ? JSON.parse(existingRecords) : [];

    if (isEditMode && recordId) {
      console.log('=== EDIT MODE ===');
      console.log('Updating record with ID:', recordId);
      console.log('Form data to save:', formData);

      // 편집 모드: 기존 레코드 업데이트
      const updatedRecords = records.map((r: any) => {
        if (r.id === recordId) {
          return {
            ...r,
            ...formData,
            categoryId: category.id,
            categoryName: category.name,
          };
        }
        return r;
      });

      console.log('Updated records:', updatedRecords);
      localStorage.setItem('custom_records', JSON.stringify(updatedRecords));

      toast({
        title: "수정 완료!",
        description: user ? "클라우드에 백업되었습니다." : "기기에 저장되었습니다.",
      });

      navigate(`/custom/${categoryId}/${recordId}`);
    } else {
      console.log('=== NEW MODE ===');
      console.log('Creating new record');
      console.log('Form data to save:', formData);

      // 새로 작성 모드
      const recordData = {
        categoryId: category.id,
        categoryName: category.name,
        ...formData,
        createdAt: new Date().toISOString(),
      };

      const newRecord = { id: Date.now().toString(), ...recordData };
      console.log('New record:', newRecord);

      records.push(newRecord);
      localStorage.setItem('custom_records', JSON.stringify(records));

      toast({
        title: "저장 완료!",
        description: user ? "클라우드에 백업되었습니다." : "기기에 저장되었습니다.",
      });

      // 적용 필드가 있고 값이 있으면 알림 모달 표시
      const hasApplication = fields.includes('application') && Array.isArray(formData.application) && formData.application.some(item => item.trim());
      if (hasApplication) {
        setSavedRecordId(newRecord.id);
        setShowReminderModal(true);
      } else {
        navigate(`/custom/${categoryId}`, { replace: true });
        setTimeout(() => {
          navigate(`/custom/${categoryId}?new=${newRecord.id}`);
        }, 0);
      }
    }
  };

  const handleSetReminder = () => {
    setShowReminderModal(false);
    setShowTimePickerModal(true);
  };

  const handleConfirmTime = async () => {
    if (!savedRecordId || !category) return;
    
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          const applicationReminders = JSON.parse(
            localStorage.getItem('application_reminders') || '{}'
          );
          
          applicationReminders[savedRecordId] = {
            time: applicationReminderTime,
            application: formData.application,
            title: formData.title || category.name,
            createdAt: new Date().toISOString(),
            enabled: true,
            frequency: 'today',
            customDays: [],
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
      } catch (error) {
        console.error('Notification permission error:', error);
      }
    } else {
      toast({
        title: "알림을 지원하지 않는 브라우저입니다",
        description: "다른 브라우저를 사용해주세요.",
        variant: "destructive",
      });
    }
    
    setShowTimePickerModal(false);
    navigateToRecord();
  };

  const handleSkipReminder = () => {
    setShowReminderModal(false);
    navigateToRecord();
  };

  const navigateToRecord = () => {
    if (savedRecordId && category) {
      navigate(`/custom/${categoryId}`, { replace: true });
      setTimeout(() => {
        navigate(`/custom/${categoryId}?new=${savedRecordId}`);
      }, 0);
    }
  };

  const handleShare = () => {
    if (!hasContent || !category) return;
    
    const parts: string[] = [];
    const today = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
    
    parts.push(today);
    parts.push(`${category.name}\n`);
    
    const fieldLabels: Record<string, string> = {
      title: '제목',
      passage: '본문',
      content: '내용',
      application: '적용',
    };
    
    fields.forEach(field => {
      if (field !== 'answered' && formData[field]) {
        const value = formData[field];
        if (Array.isArray(value)) {
          // application 배열 처리
          const items = value.filter(item => item.trim());
          if (items.length > 0) {
            parts.push(`${fieldLabels[field] || field}:\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`);
          }
        } else if (typeof value === 'string' && value.trim()) {
          parts.push(`${fieldLabels[field] || field}: ${value}`);
        }
      }
    });

    // answeredDetail도 추가
    if (fields.includes('answered') && formData.answered && formData.answeredDetail && typeof formData.answeredDetail === 'string' && formData.answeredDetail.trim()) {
      parts.push(`응답 내용: ${formData.answeredDetail}`);
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
        navigate(`/custom/${categoryId}`);
      }
    } else {
      navigate(`/custom/${categoryId}`);
    }
  };

  if (!category) {
    return null;
  }

  const fields = category.fields || [];

  return (
    <>
      <LoginModal 
        open={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        callbackUrl={`/custom/${categoryId}`}
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
          
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-medium text-[#2E2E2E]">
            {category.name}
          </h1>
          
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
                  ? 'text-white hover:opacity-90' 
                  : 'bg-[#E8E7E5] text-[#ACACAC] cursor-not-allowed'
              }`}
              style={hasContent ? { backgroundColor: category.color } : {}}
            >
              저장
            </button>
          </div>
        </header>

        {/* 에디터 */}
        <main className="mt-[60px] flex flex-1 flex-col overflow-auto px-5 py-6 pb-32">
          {fields.includes('title') && (
            <section className="mb-12">
              <label className="mb-2 block text-sm text-[#9B9B9B]">제목</label>
              <Input
                value={formData.title as string}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={`${category.name} 제목을 입력하세요`}
                className="border-none bg-transparent px-0 text-lg font-semibold leading-relaxed text-[#2E2E2E] placeholder:text-[#D0D0D0] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </section>
          )}

          {fields.includes('passage') && (
            <section className="mb-12">
              <label className="mb-2 block text-sm text-[#9B9B9B]">본문</label>
              <Textarea
                ref={passageRef}
                value={formData.passage as string}
                onChange={(e) => {
                  const scrollPos = window.scrollY;
                  handleInputChange('passage', e.target.value);
                  adjustTextareaHeight(e.target);
                  requestAnimationFrame(() => window.scrollTo(0, scrollPos));
                }}
                placeholder={`${category.name} 관련 본문이나 구절을 적어보세요`}
                className="min-h-[120px] resize-none border-none bg-transparent px-0 text-base leading-[1.8] text-[#2E2E2E] placeholder:text-[#D0D0D0] focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ overflowY: 'hidden' }}
              />
            </section>
          )}

          {fields.includes('content') && (
            <section className="mb-12">
              <label className="mb-2 block text-sm text-[#9B9B9B]">내용</label>
              <Textarea
                ref={contentRef}
                value={formData.content as string}
                onChange={(e) => {
                  const scrollPos = window.scrollY;
                  handleInputChange('content', e.target.value);
                  adjustTextareaHeight(e.target);
                  requestAnimationFrame(() => window.scrollTo(0, scrollPos));
                }}
                placeholder={`${category.name} 내용을 기록해보세요`}
                className="min-h-[120px] resize-none border-none bg-transparent px-0 text-base leading-[1.8] text-[#2E2E2E] placeholder:text-[#D0D0D0] focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ overflowY: 'hidden' }}
              />
            </section>
          )}

          {fields.includes('application') && (
            <MultiApplicationInput
              values={formData.application as string[]}
              onChange={(values) => {
                // Convert ApplicationItem[] to string[] for storage
                const stringValues = values.map((v: any) =>
                  typeof v === 'string' ? v : v.text
                );
                handleInputChange('application', stringValues);
              }}
              label="적용"
              placeholder={`오늘 ${category.name} 적용점 기록하기`}
              categoryColor={category.color}
              showCheckboxes={false}
            />
          )}

          {fields.includes('answered') && (
            <AnsweredDetailInput
              answered={formData.answered as boolean}
              answeredDetail={formData.answeredDetail as string}
              onAnsweredChange={(answered) => handleInputChange('answered', answered)}
              onDetailChange={(detail) => handleInputChange('answeredDetail', detail)}
              categoryName={category.name}
              categoryColor={category.color}
            />
          )}
        </main>
      </div>

      {/* 알림 설정 모달 */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${category?.color}1A` }}>
                <Bell className="w-6 h-6" style={{ color: category?.color }} />
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
              className="w-full h-12 text-white rounded-xl text-[15px] font-medium"
              style={{ backgroundColor: category?.color }}
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
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${category?.color}1A` }}>
                <Bell className="w-6 h-6" style={{ color: category?.color }} />
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
                className="w-full h-12 text-white rounded-xl text-[15px] font-medium"
                style={{ backgroundColor: category?.color }}
              >
                확인
              </Button>
              <Button
                onClick={() => {
                  setShowTimePickerModal(false);
                  navigateToRecord();
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

export default CustomRecordNew;
