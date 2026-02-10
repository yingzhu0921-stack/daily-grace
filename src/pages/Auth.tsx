import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const callbackUrl = searchParams.get('callback');
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const redirectTo = callbackUrl || '/';
        navigate(redirectTo, { replace: true });
      }
    });
  }, [navigate, callbackUrl]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${callbackUrl || '/'}`,
      },
    });

    if (error) {
      toast({
        title: "오류",
        description: "Google 로그인에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "이메일 발송 완료",
        description: `${email}로 비밀번호 재설정 링크를 보냈습니다. 받은편지함을 확인해주세요.`,
      });
      setMode('login');
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "비밀번호 재설정 이메일 발송에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const redirectTo = callbackUrl || '/';
        navigate(redirectTo, { replace: true });
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: displayName,
            }
          }
        });

        if (error) throw error;

        if (data?.user && !data.session) {
          toast({
            title: "이메일 인증 필요",
            description: `${email}로 전송된 인증 링크를 클릭해주세요.`,
          });
          setMode('login');
          return;
        }

        toast({
          title: "회원가입 완료",
          description: "환영합니다!",
        });
        const redirectTo = callbackUrl || '/';
        navigate(redirectTo, { replace: true });
      }
    } catch (error: any) {
      let errorMessage = error.message || "문제가 발생했습니다.";

      if (error.message?.includes("Email not confirmed")) {
        errorMessage = "이메일 인증이 필요합니다. 받은편지함을 확인해주세요.";
      } else if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
      }

      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
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
          <p className="text-[#7E7C78] mt-2">
            {mode === 'forgot-password'
              ? '비밀번호를 재설정합니다'
              : '오늘 하루의 은혜를 기록해보세요'}
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm space-y-4">
          {mode === 'forgot-password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#2E2E2E]">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="border-[#E3E2E0] focus:border-[#7E7C78]"
                />
                <p className="text-xs text-[#7E7C78]">
                  가입한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[rgba(125,184,125,1)] hover:bg-[rgba(115,174,115,1)] text-white rounded-full py-6 font-medium"
                disabled={loading}
              >
                {loading ? '발송 중...' : '재설정 링크 보내기'}
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-[#7E7C78] hover:text-[#2E2E2E]"
              >
                로그인으로 돌아가기
              </button>
            </form>
          ) : (
            <>
              {/* Google 로그인 */}
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

              {/* 구분선 */}
              <div className="relative flex items-center">
                <Separator className="flex-1" />
                <span className="px-3 text-xs text-[#7E7C78] bg-white">또는</span>
                <Separator className="flex-1" />
              </div>

              {/* 이메일 로그인/회원가입 폼 */}
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-[#2E2E2E]">이름</Label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="홍길동"
                      required
                      className="border-[#E3E2E0] focus:border-[#7E7C78]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#2E2E2E]">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="border-[#E3E2E0] focus:border-[#7E7C78]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#2E2E2E]">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="border-[#E3E2E0] focus:border-[#7E7C78]"
                  />
                </div>

                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode('forgot-password')}
                      className="text-xs text-[#7E7C78] hover:text-[#2E2E2E]"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[rgba(125,184,125,1)] hover:bg-[rgba(115,174,115,1)] text-white rounded-full py-6 font-medium"
                  disabled={loading}
                >
                  {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
                </Button>
              </form>
            </>
          )}
        </div>

        {mode !== 'forgot-password' && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-[#7E7C78] hover:text-[#2E2E2E]"
            >
              {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
