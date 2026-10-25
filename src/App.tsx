import React, { useEffect } from "react";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useDataSync } from "./hooks/useDataSync";
import { LoginModal } from "@/components/LoginModal";
import { checkAndShowReminder } from "@/utils/notifications";
import { AppRoutes } from "./AppRoutes";

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
