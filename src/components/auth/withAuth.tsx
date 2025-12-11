import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthGuarded(props: P) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading } = useAuth();

    useEffect(() => {
      if (!loading && !user) {
        const next = encodeURIComponent(location.pathname + location.search);
        navigate(`/auth?next=${next}`, { replace: true });
      }
    }, [user, loading, navigate, location]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[rgba(249,248,246,1)]">
          <div className="text-[#7E7C78]">로딩 중...</div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}
