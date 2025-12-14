import { type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthGate } from "@/store/authStore";
import { useLiveLocationTracker } from "@/hooks/useLiveLocationTracker";

type ProtectedRouteProps = {
  children?: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { checking, isLoggedIn } = useAuthGate();

  // ✅ 훅은 무조건 최상단에서 호출
  // 실제 동작 여부는 enabled 값으로만 제어
  useLiveLocationTracker({
    enabled: isLoggedIn, // 로그인된 경우에만 위치 전송
    intervalMs: 15_000,
  });

  // before-login 보호 루프 방지
  if (location.pathname.startsWith("/before-login")) {
    return <>{children ?? <Outlet />}</>;
  }

  // 로그인 체크 중
  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-stone-600">
        로그인 상태를 확인하는 중입니다...
      </div>
    );
  }

  // 미로그인
  if (!isLoggedIn) {
    return <Navigate to="/before-login" replace />;
  }

  // 로그인 완료 → 보호된 페이지 진입
  return <>{children ?? <Outlet />}</>;
}
