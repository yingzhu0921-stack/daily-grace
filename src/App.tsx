import React, { useEffect } from "react";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useDataSync } from "./hooks/useDataSync";
import { LoginModal } from "@/components/LoginModal";
import { checkAndShowReminder } from "@/utils/notifications";
import { AppRoutes } from "./AppRoutes";
import { recordRoute } from "@/utils/routeHistory";

const queryClient = new QueryClient();

const ModalManager = () => {
  const { showLoginModal, setShowLoginModal, loginCallbackUrl, cancelPendingCallback, loginPrompt } = useAuth();
  const location = useLocation();

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    cancelPendingCallback();
  };

  // Auth 페이지에서는 모달을 표시하지 않음
  const shouldShowModal = showLoginModal && location.pathname !== '/auth';

  return (
    <LoginModal
      open={shouldShowModal}
      onClose={handleCloseLoginModal}
      callbackUrl={loginCallbackUrl}
      guestAllowed={loginPrompt.guestAllowed !== false}
      title={loginPrompt.title}
      description={loginPrompt.description}
    />
  );
};

/** 화면이 바뀔 때마다 직전 경로를 기억한다(저장 후 돌아갈 곳 판단용). */
const RouteTracker = () => {
  const location = useLocation();
  // 주소 뒤 ?… 만 바뀌어 history 가 한 칸 쌓이는 경우도 있으니 search 까지 한 단위로 기록한다.
  useEffect(() => { recordRoute(location.pathname + location.search); }, [location.pathname, location.search]);
  return null;
};

/**
 * 새 화면으로 갈 때는 맨 위에서 시작한다(2026-11-13 사용자: 설정에 들어가면 위가 안 보이고 '알림 관리'가 잘렸다).
 * 앞 화면(홈)에서 내린 스크롤 위치가 그대로 남아 있었다. 뒤로 가기(POP)는 원래 위치를 유지한다.
 */
const ScrollToTopOnNavigate = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navType]);
  return null;
};

const AppContent = () => {
  const { loading } = useAuth();
  // 데이터 동기화 (로그인 시 자동으로 클라우드에서 로드)
  useDataSync();
  
  // 알림 체크 (1분마다)
  useEffect(() => {
    checkAndShowReminder();
    const interval = setInterval(checkAndShowReminder, 60000); // 1분마다 체크
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="min-h-screen bg-[rgba(249,248,246,1)]" aria-label="로딩 중" />;

  return (
    <>
      <TooltipProvider>
        <ShadcnToaster />
        <Sonner />
        <RouteTracker />
        <ScrollToTopOnNavigate />
        <AppRoutes />
        <ModalManager />
      </TooltipProvider>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
