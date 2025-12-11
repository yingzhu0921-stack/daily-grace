import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MoreVertical, Share2, Trash2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeditationViewContent } from '@/components/MeditationViewContent';
import { get, update, remove } from '@/utils/meditationStorage';
import { MeditationNote } from '@/types/meditation';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MeditationView = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<MeditationNote | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  useEffect(() => {
    if (id) {
      const foundNote = get(id);
      if (foundNote) {
        setNote(foundNote);
      } else {
        toast({
          title: "묵상을 찾을 수 없습니다",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  }, [id, navigate]);

  const handleCheckChange = (checked: boolean) => {
    if (!note || !id) return;

    if (checked) {
      setShowReminderModal(true);
    }

    update(id, {
      applyChecked: checked,
      applyCheckedAt: checked ? new Date().toISOString() : null
    });

    setNote({ ...note, applyChecked: checked, applyCheckedAt: checked ? new Date().toISOString() : undefined });

    toast({
      title: checked ? "적용을 완료로 표시했어요" : "적용 완료를 해제했어요",
    });
  };

  const handleShare = () => {
    if (!note) return;

    const parts: string[] = [];
    const date = new Date(note.createdAt).toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
    
    parts.push(date);
    parts.push('Q.T\n');
    
    if (note.title?.trim()) parts.push(`제목: ${note.title}`);
    if (note.passage?.trim()) parts.push(`본문: ${note.passage}`);
    if (note.content?.trim()) parts.push(`내용: ${note.content}`);
    if (note.application?.trim()) parts.push(`적용: ${note.application}`);
    
    const shareText = parts.join('\n\n');
    
    if (navigator.share) {
      navigator.share({
        title: 'Q.T 기록',
        text: shareText,
      }).catch(err => console.log('Share failed:', err));
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "전체 내용이 복사되었어요!",
      });
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!note) return;
    
    remove(note.id);
    toast({
      title: "묵상이 삭제되었습니다",
    });
    navigate('/meditation');
  };

  const handleEdit = () => {
    navigate(`/meditation/${id}/edit`);
  };

  if (!note) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F7]">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button
          onClick={() => navigate('/meditation')}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">Q.T</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 -mr-2">
              <MoreVertical className="w-5 h-5 text-[#2E2E2E]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              공유하기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              삭제하기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* 본문 */}
      <main className="flex-1 overflow-auto px-5 py-6 pb-32">
        <MeditationViewContent note={note} onCheckChange={handleCheckChange} />
      </main>

      {/* 하단 고정 바 */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t border-[#F0EFED] bg-[#FAF9F7] px-5 py-4">
        <Button
          onClick={handleEdit}
          className="flex-1 h-11 rounded-full bg-[#7DB87D] hover:bg-[#6da76d] text-white text-sm font-medium"
        >
          수정
        </Button>
      </footer>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>묵상을 삭제하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 묵상은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 알림 설정 모달 */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-[18px] font-semibold text-[#2E2E2E] text-center">
              오늘의 적용을 기억하도록<br />알림을 받을까요?
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-3">
            <Button
              onClick={() => {
                toast({ title: "알림이 설정되었습니다" });
                setShowReminderModal(false);
              }}
              className="w-full h-12 bg-[#7DB87D] hover:bg-[#6da76d] text-white rounded-xl text-[15px] font-medium"
            >
              <Bell className="w-4 h-4 mr-2" />
              알림 받기
            </Button>
            <Button
              onClick={() => setShowReminderModal(false)}
              variant="ghost"
              className="w-full h-12 text-[#7E7C78] hover:bg-[#F3F2F1] rounded-xl text-[15px] font-medium"
            >
              다음에 하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeditationView;
