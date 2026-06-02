import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const callbackUrl = searchParams.get('callback');
  const { user } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) navigate(callbackUrl || '/', { replace: true });
  }, [user, navigate, callbackUrl]);

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google/start';
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('전송 실패');
      setSent(true);
    } catch {
      toast({
        title: '오류',
        description: '이메일 전송에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgba(249,248,246,1)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#2E2E2E]">하루은혜</h1>
          <p className="text-[#7E7C78] mt-2">오늘 하루의 은혜를 기록해보세요</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm space-y-4">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-4xl">✉️</div>
              <h2 className="text-lg font-semibold text-[#2E2E2E]">이메일을 확인해주세요</h2>
              <p className="text-sm text-[#7E7C78]">
                <span className="font-medium text-[#2E2E2E]">{email}</span>로<br />
                로그인 링크를 보냈습니다. (15분 유효)
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-sm text-[#7E7C78] hover:text-[#2E2E2E] mt-2"
              >
                다른 이메일로 시도
              </button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full py-6 font-medium border-[#E3E2E0] hover:bg-[#F9F8F6] text-[#2E2E2E]"
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google로 계속하기
              </Button>

              <div className="relative flex items-center">
                <Separator className="flex-1" />
                <span className="px-3 text-xs text-[#7E7C78] bg-white">또는</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#2E2E2E]">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="border-[#E3E2E0] focus:border-[#7E7C78]"
                  />
                  <p className="text-xs text-[#7E7C78]">
                    이메일로 로그인 링크를 보내드립니다. 비밀번호가 필요 없어요.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[rgba(125,184,125,1)] hover:bg-[rgba(115,174,115,1)] text-white rounded-full py-6 font-medium"
                  disabled={loading}
                >
                  {loading ? '전송 중...' : '로그인 링크 받기'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
