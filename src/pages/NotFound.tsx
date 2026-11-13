import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

/** 없는 주소로 들어왔을 때. 2026-11-13 체험 배포 전 점검: 영어 기본 화면이 그대로 남아 있었다. */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F6F3EC] px-6">
      <div className="w-full max-w-[320px] text-center">
        <p className="text-[13px] font-semibold text-[#8A8278]">404</p>
        <h1 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-[#1E1C1A]">페이지를 찾을 수 없어요</h1>
        <p className="mt-2 text-[14px] leading-[22px] text-[#6E675E]">주소가 바뀌었거나 없는 화면이에요.</p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="mt-6 h-12 w-full rounded-full bg-[#1E1C1A] text-[15px] font-semibold text-white"
        >
          홈으로
        </button>
      </div>
    </div>
  );
};

export default NotFound;
