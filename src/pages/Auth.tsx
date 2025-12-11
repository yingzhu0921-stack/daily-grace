import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const callbackUrl = searchParams.get('callback');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 이미 로그인되어 있으면 콜백 URL 또는 메인 페이지로
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const redirectTo = callbackUrl || '/';
        navigate(redirectTo, { replace: true });
      }
    });
  }, [navigate, callbackUrl]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
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

        // 이메일 인증이 필요한 경우
        if (data?.user && !data.session) {
          toast({
            title: "이메일 인증 필요",
            description: `${email}로 전송된 인증 링크를 클릭해주세요.`,
          });
          setIsLogin(true); // 로그인 탭으로 전환
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

      // 이메일 인증 관련 에러 메시지 개선
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
            {isLogin ? '오늘 하루의 은혜를 기록해보세요' : '오늘 하루의 은혜를 기록해보세요'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 bg-white p-8 rounded-3xl shadow-sm">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-[#2E2E2E]">이름</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="홍길동"
                required={!isLogin}
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

          <Button 
            type="submit" 
            className="w-full bg-[rgba(125,184,125,1)] hover:bg-[rgba(115,174,115,1)] text-white rounded-full py-6 font-medium" 
            disabled={loading}
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-[#7E7C78] hover:text-[#2E2E2E]"
          >
            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
