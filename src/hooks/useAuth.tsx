import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { clearAllCards } from '@/utils/verseCardDB';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  requireAuth: (callback: () => void, callbackUrl?: string) => boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  loginCallbackUrl?: string;
  cancelPendingCallback: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  deleteAccount: async () => {},
  requireAuth: () => false,
  showLoginModal: false,
  setShowLoginModal: () => {},
  cancelPendingCallback: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCallbackUrl, setLoginCallbackUrl] = useState<string>();
  const pendingCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // 인증 상태 리스너 설정
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // TOKEN_REFRESHED 실패 시 세션 정리
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('Token refresh failed, clearing session');
          clearInvalidSession();
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // 로그인이 완료되었고 대기 중인 콜백이 있으면 실행
        if (session?.user && pendingCallbackRef.current) {
          const callback = pendingCallbackRef.current;
          pendingCallbackRef.current = null;
          setShowLoginModal(false);
          setTimeout(() => {
            callback();
          }, 100);
        }
      }
    );

    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // 세션 에러 시 (invalid refresh token 등) 정리
      if (error) {
        console.error('Session error:', error);
        clearInvalidSession();
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Get session failed:', error);
      clearInvalidSession();
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // 무효한 세션 정리 함수
  const clearInvalidSession = () => {
    setSession(null);
    setUser(null);
    setLoading(false);
    // Supabase 관련 localStorage 항목 제거
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    }
  };

  const signOut = async () => {
    try {
      // 먼저 로컬 상태 정리 (Safari 호환성)
      setSession(null);
      setUser(null);
      
      // Supabase 로그아웃
      await supabase.auth.signOut();
      
      // 모든 Supabase 관련 localStorage 항목만 제거 (기록 데이터는 보존)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // IndexedDB 말씀카드 데이터 제거 (계정 전환 시 이전 계정 카드 방지)
      await clearAllCards().catch(err => console.error('Failed to clear cards:', err));
      
      toast.success('로그아웃되었습니다');
    } catch (err) {
      console.log('Logout error:', err);
      // 에러 발생 시에도 강제 정리
      setSession(null);
      setUser(null);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      }
      // 에러 시에도 IndexedDB 정리 시도
      clearAllCards().catch(err => console.error('Failed to clear cards:', err));
      toast.success('로그아웃되었습니다');
    }
  };

  const requireAuth = (callback: () => void, callbackUrl?: string): boolean => {
    if (user) {
      callback();
      return true;
    }
    // 콜백 함수 저장
    pendingCallbackRef.current = callback;
    setLoginCallbackUrl(callbackUrl);
    setShowLoginModal(true);
    return false;
  };

  const deleteAccount = async () => {
    if (!user) return;

    try {
      console.log('=== 계정 삭제 시작 ===');
      console.log('User ID:', user.id);
      
      // Edge Function 호출하여 계정 삭제
      const { data, error } = await supabase.functions.invoke('delete-user', {
        method: 'POST',
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(`계정 삭제 실패: ${error.message}`);
        throw error;
      }

      if (data?.error) {
        console.error('Response error:', data.error);
        toast.error(`계정 삭제 실패: ${data.error}`);
        throw new Error(data.error);
      }

      console.log('계정 삭제 성공, 로컬 데이터 정리 중...');

      // 로컬 데이터 정리
      setSession(null);
      setUser(null);
      
      // 모든 Supabase 관련 localStorage 항목 제거
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      }
      
      // 사용자 기록 데이터 제거
      localStorage.removeItem('meditations');
      localStorage.removeItem('prayers');
      localStorage.removeItem('gratitudes');
      localStorage.removeItem('diaries');
      localStorage.removeItem('custom_categories');
      localStorage.removeItem('custom_records');
      localStorage.removeItem('verse_cards');
      localStorage.removeItem('verse_cards_migrated');
      localStorage.removeItem('onboarding_completed');
      
      // IndexedDB 말씀카드 데이터 제거
      await clearAllCards().catch(err => console.error('Failed to clear cards:', err));
      
      console.log('✅ 모든 데이터 정리 완료');
      toast.success('계정이 삭제되었습니다');
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error(error instanceof Error ? error.message : '계정 삭제에 실패했습니다');
      throw error;
    }
  };

  const cancelPendingCallback = () => {
    pendingCallbackRef.current = null;
    setLoginCallbackUrl(undefined);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, deleteAccount, requireAuth, showLoginModal, setShowLoginModal, loginCallbackUrl, cancelPendingCallback }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
