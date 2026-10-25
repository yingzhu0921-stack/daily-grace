import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { toast } from 'sonner';
import { clearAllCards } from '@/utils/verseCardDB';
import { initCustomRecordSync, stopCustomRecordSync } from '@/utils/customRecordSync';
import { clearLocalDataForUser, switchLocalDataScope } from '@/utils/localDataScope';

export interface DGUser {
  id: string;
  email: string;
  name?: string;
  auth_method: string;
}

/** 로그인 창에 무엇을 보여줄지. 기능마다 다르게 줄 수 있다 */
export interface LoginPrompt {
  /** 게스트로 계속할 수 있는 기능인지. false 면 게스트 버튼을 숨긴다 */
  guestAllowed?: boolean;
  title?: string;
  description?: string;
}

interface AuthContextType {
  user: DGUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  requireAuth: (callback: () => void, callbackUrl?: string, prompt?: LoginPrompt) => boolean;
  loginPrompt: LoginPrompt;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  loginCallbackUrl?: string;
  cancelPendingCallback: () => void;
}

/**
 * 개발용 로그인 우회 — 로그인이 걸린 화면(카드 만들기·직접 편집·온보딩·큐티)을
 * 로컬에서 띄워 눈으로 확인하기 위한 것이다. 서버는 전혀 건드리지 않는다.
 * 가짜 사용자 객체를 넣어 화면만 열리게 하므로 실제 API는 그대로 401이 난다.
 *
 * 운영 빌드에는 들어가지 않는다. 두 겹으로 막는다.
 *  1) `import.meta.env.DEV` — `vite build`(production)에서 false 로 치환돼 분기 전체가 사라진다.
 *  2) `VITE_DEV_AUTH_BYPASS === '1'` — 명시적으로 켜야만 동작한다. 설정하지 않으면
 *     undefined 로 치환돼 역시 분기가 사라진다.
 * 둘 다 빌드 시점에 상수로 바뀌므로 번들에 코드 자체가 남지 않는다.
 *
 * 켜는 법: `VITE_DEV_AUTH_BYPASS=1 npm run dev`
 */
const DEV_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === '1';

const DEV_BYPASS_USER: DGUser = {
  id: 'dev-local-bypass',
  email: 'dev@localhost',
  name: '개발용 계정',
  auth_method: 'dev-bypass',
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  deleteAccount: async () => {},
  requireAuth: () => false,
  loginPrompt: {},
  showLoginModal: false,
  setShowLoginModal: () => {},
  cancelPendingCallback: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<DGUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCallbackUrl, setLoginCallbackUrl] = useState<string>();
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt>({});
  const pendingCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      // 화면만 열어 주는 용도다. 저장된 데이터는 **건드리지 않는다.**
      //
      // switchLocalDataScope 를 부르지 않는 이유: 이전 소유자가 게스트면 게스트 기록을
      // 이 가짜 계정으로 합치고 게스트 캐시를 지운다. 우회를 껐을 때 기록이 사라진
      // 것처럼 보인다. 동기화도 시작하지 않는다.
      //
      // 주의: 이 브라우저에 진짜 세션 쿠키가 있으면 서버는 여전히 진짜 사용자로 인증한다.
      // 화면만 가짜 사용자가 되므로 실제 계정 데이터가 섞일 수 있다.
      // 반드시 로그인하지 않은 별도 브라우저 프로필에서만 쓴다.
      console.warn(
        '[auth] 개발용 로그인 우회가 켜져 있습니다. 화면 확인 전용이며 운영 빌드에는 포함되지 않습니다.\n' +
        '       로그인된 브라우저에서는 쓰지 마세요. 서버는 실제 세션 쿠키로 인증합니다.',
      );
      setUser(DEV_BYPASS_USER);
      setLoading(false);
      return;
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r): Promise<{ user: DGUser | null }> => r.json())
      .then(({ user }) => {
        switchLocalDataScope(user?.id ?? null);
        setUser(user);
        if (user) {
          // 로그인 상태면 커스텀 기록을 클라우드와 동기화 시작
          initCustomRecordSync().catch(() => {});
        }
        if (user && pendingCallbackRef.current) {
          const cb = pendingCallbackRef.current;
          pendingCallbackRef.current = null;
          setShowLoginModal(false);
          setTimeout(cb, 100);
        }
      })
      .catch(() => {
        switchLocalDataScope(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('로그아웃 실패');
      stopCustomRecordSync();
      switchLocalDataScope(null);
      setUser(null);
      await clearAllCards().catch(() => {});
      toast.success('로그아웃되었습니다');
      window.location.href = '/';
    } catch {
      toast.error('로그아웃에 실패했습니다');
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('삭제 실패');
      stopCustomRecordSync();
      clearLocalDataForUser(user.id);
      switchLocalDataScope(null);
      setUser(null);
      localStorage.removeItem('verse_cards');
      localStorage.removeItem('verse_cards_migrated');
      await clearAllCards().catch(() => {});
      toast.success('계정이 삭제되었습니다');
    } catch (err) {
      toast.error('계정 삭제에 실패했습니다');
      throw err;
    }
  };

  const requireAuth = (callback: () => void, callbackUrl?: string, prompt: LoginPrompt = {}): boolean => {
    if (user) {
      callback();
      return true;
    }
    pendingCallbackRef.current = callback;
    setLoginCallbackUrl(callbackUrl);
    setLoginPrompt(prompt);
    setShowLoginModal(true);
    return false;
  };

  const cancelPendingCallback = () => {
    pendingCallbackRef.current = null;
    setLoginCallbackUrl(undefined);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, deleteAccount, requireAuth, loginPrompt, showLoginModal, setShowLoginModal, loginCallbackUrl, cancelPendingCallback }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
