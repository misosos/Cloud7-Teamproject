/****
 * 🔒 ProtectedRoute (보호된 페이지 가드)
 * ─────────────────────────────────────────────────────────
 * Zustand 인증 게이트(useAuthGate)를 활용한 보호 라우트 버전입니다.
 *
 * 핵심 아이디어
 *  - 전역 인증 스토어에서 "로그인 체크 중인지 / 로그인 되어 있는지"만 구독
 *  - 아직 로그인/세션 체크 중이면 → 절대 바로 튕기지 않고, 로딩 화면만 보여줌
 *  - 체크가 끝난 뒤에만(isLoggedIn 값이 확정된 뒤에만) 접근 제어를 수행
 *  - next 파라미터에 원래 가려던 경로를 인코딩해 두었다가, 로그인 후 복귀에 사용
 *
 * 사용 예시
 *  <Route element={<ProtectedRoute />}>
 *    <Route path="/dashboard" element={<Dashboard />} />
 *  </Route>
 */

import { useMemo, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthGate } from "@/store/authStore"; // ✅ 인증 게이트 훅

type ProtectedRouteProps = {
  children?: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // 1) 현재 URL 정보 (path + query + hash)
  const location = useLocation();

  // 2) 전역 인증 상태 (게이트 훅으로 통일)
  const { checking, isLoggedIn } = useAuthGate();

  // 3) 로그인 후 돌아올 목적지(next) 문자열을 미리 계산해 둠
  const next = useMemo(
    () =>
      encodeURIComponent(
        `${location.pathname}${location.search}${location.hash}`
      ),
    [location.pathname, location.search, location.hash]
  );

  // ✅ 안전장치:
  // 만약 /before-login 라우트 자체를 ProtectedRoute로 감싸버리면
  // 여기서 다시 /before-login으로 Navigate하는 "무한 루프"가 생길 수 있으므로
  // 이 경우에는 그냥 children / <Outlet />을 그대로 렌더만 해준다.
  if (location.pathname.startsWith("/before-login")) {
    return <>{children ?? <Outlet />}</>;
  }

  // 4) 아직 로그인/세션 체크 중인 상태라면
  //    → 로그인 여부가 확정되지 않았으니, 절대 여기서 튕기지 말고
  //      잠깐 로딩 화면만 보여준다.
  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-stone-600">
        로그인 상태를 확인하는 중입니다...
      </div>
    );
  }

  // 5) 로그인 체크가 끝났고, 미로그인 상태라면
  //    → 로그인 전 페이지로 보내되, 로그인 성공 시 돌아올 목적지(next)를 함께 전달
  if (!isLoggedIn) {
    return <Navigate to={`/before-login?next=${next}`} replace />;
  }

  // 6) 로그인 되어 있다면 → 보호된 자식 라우트를 그대로 렌더
  //    - children이 있으면 children 우선 사용
  //    - 없으면 <Outlet />을 사용해 중첩 라우트를 렌더
  return <>{children ?? <Outlet />}</>;
}