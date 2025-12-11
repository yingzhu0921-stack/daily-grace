import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      });

      if (error) throw error;

      toast.success('프로필이 업데이트되었습니다');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('프로필 업데이트에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      navigate('/auth', { replace: true });
    } catch (error) {
      // 에러는 deleteAccount 함수에서 이미 처리됨
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <p className="text-[#7E7C78]">로그인이 필요합니다</p>
      </div>
    );
  }

  const userInitial = (displayName || user.email?.split('@')[0] || 'U')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#FAF9F7] border-b border-[#F0EFED]">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          계정 관리
        </h1>

        <div className="w-10" />
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        {/* 프로필 이미지 */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-[#7DB87D]/20 text-[#7DB87D] text-2xl font-semibold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <button 
              className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-[#E3E2E0]"
              onClick={() => toast.info('프로필 사진 업로드 기능은 준비 중입니다')}
            >
              <Camera className="w-4 h-4 text-[#7E7C78]" />
            </button>
          </div>
        </div>

        {/* 계정 정보 */}
        <div className="bg-white rounded-2xl p-5 mb-4">
          <div className="mb-5">
            <Label htmlFor="email" className="text-sm font-medium text-[#2E2E2E] mb-2 block">
              이메일
            </Label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-[#F7F6F4] border-[#E3E2E0] text-[#7E7C78]"
            />
          </div>

          <div>
            <Label htmlFor="displayName" className="text-sm font-medium text-[#2E2E2E] mb-2 block">
              닉네임
            </Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="닉네임을 입력하세요"
              className="bg-white border-[#E3E2E0]"
            />
          </div>
        </div>

        {/* 저장 버튼 */}
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full bg-[#7DB87D] hover:bg-[#6FA76F] text-white rounded-xl h-12 mb-4"
        >
          {isLoading ? '저장 중...' : '변경사항 저장'}
        </Button>

        {/* 로그아웃 버튼 */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-[#E3E2E0] text-[#2E2E2E] hover:bg-[#F7F6F4] rounded-xl h-12 mb-8"
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>

        {/* 위험 구역 */}
        <div className="border-t border-[#F0EFED] pt-6">
          <h2 className="text-sm font-semibold text-[#DD5757] mb-2">위험 구역</h2>
          <p className="text-xs text-[#7E7C78] mb-4">
            계정 삭제 시 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-[#DD5757] text-[#DD5757] hover:bg-[#DD5757]/5 rounded-xl h-12"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? '삭제 중...' : '계정 삭제'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white max-w-[90vw] sm:max-w-md rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-semibold text-[#2E2E2E]">
                  정말 계정을 삭제하시겠습니까?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-[#7E7C78] space-y-2">
                  <p>계정 삭제 시 다음 데이터가 <strong className="text-[#DD5757]">영구적으로 삭제</strong>됩니다:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Q.T, 기도, 감사, 일기 기록</li>
                    <li>말씀카드 및 저장된 배경 이미지</li>
                    <li>커스텀 카테고리 및 알림 설정</li>
                    <li>프로필 정보 및 계정</li>
                  </ul>
                  <p className="text-[#DD5757] font-medium mt-3">
                    이 작업은 되돌릴 수 없습니다
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel className="rounded-xl border-[#E3E2E0]">
                  취소
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-[#DD5757] hover:bg-[#CC4848] text-white rounded-xl"
                  disabled={isDeleting}
                >
                  {isDeleting ? '삭제 중...' : '삭제하기'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default ProfileEdit;
