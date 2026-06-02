import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { toast } from 'sonner';
import { clearAllCards } from '@/utils/verseCardDB';

export interface DGUser {
  id: string;
  email: string;
  name?: string;
  auth_method: string;
}

interface AuthContextType {
  user: DGUser | null;
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
  loading: true,
  signOut: async () => {},
  deleteAccount: async () => {},
  requireAuth: () => false,
  showLoginModal: false,
  setShowLoginModal: () => {},
  cancelPendingCallback: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<DGUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCallbackUrl, setLoginCallbackUrl] = useState<string>();
  const pendingCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json<{ user: DGUser | null }>())
      .then(({ user }) => {
        setUser(user);
        if (user && pendingCallbackRef.current) {
          const cb = pendingCallbackRef.current;
          pendingCallbackRef.current = null;
          setShowLoginModal(false);
          setTimeout(cb, 100);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    setUser(null);
    await clearAllCards().catch(() => {});
    toast.success('로그아웃되었습니다');
    window.location.href = '/api/auth/signout';
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('삭제 실패');
      setUser(null);
      const keys = ['meditations','prayers','gratitudes','diaries','custom_categories','custom_records','verse_cards','verse_cards_migrated','onboarding_completed'];
      keys.forEach(k => localStorage.removeItem(k));
      await clearAllCards().catch(() => {});
      toast.success('계정이 삭제되었습니다');
    } catch (err) {
      toast.error('계정 삭제에 실패했습니다');
      throw err;
    }
  };

  const requireAuth = (callback: () => void, callbackUrl?: string): boolean => {
    if (user) {
      callback();
      return true;
    }
    pendingCallbackRef.current = callback;
    setLoginCallbackUrl(callbackUrl);
    setShowLoginModal(true);
    return false;
  };

  const cancelPendingCallback = () => {
    pendingCallbackRef.current = null;
    setLoginCallbackUrl(undefined);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, deleteAccount, requireAuth, showLoginModal, setShowLoginModal, loginCallbackUrl, cancelPendingCallback }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
