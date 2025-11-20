/****
 * 🔒 ProtectedRoute (보호된 페이지 가드)
 * ─────────────────────────────────────────────────────────
 * Zustand 구독 최적화 + 안전장치 버전:
 *  - 전역 스토어에서 필요한 값만 **원시값 selector**로 구독 → 리렌더 루프/경고 방지
 *  - 부팅(세션 확인) 완료 전에는 렌더 보류, 이후 로그인 여부로 접근 제어
 *  - 실수로 /before-login 라우트 자체에 감쌀 경우를 대비한 **루프 방지 가드** 추가
 *  - FIX: Hooks 규칙 준수 — `useMemo`는 반드시 최상위에서 호출되도록 이동
 *  - redirect `next` 파라미터는 useMemo로 **한 번만 계산**해 안정화
 *
 * 사용 방법
 *  - 로그인 필요한 라우트를 감싸서 사용합니다.
 *    예) <Route element={<ProtectedRoute/>}> <Route path="/dashboard" element={<Dashboard/>}/> </Route>
 *
 * 동작
 *  1) `ready`가 false → 세션 확인 전이므로 판단 보류 (null 또는 로딩 UI)
 *  2) `ready`가 true → 로그인 여부 확인
 *     - 미로그인: "/before-login?next=원래경로"로 이동 (로그인 성공 시 원래 페이지 복귀)
 *     - 로그인: children 또는 <Outlet/> 렌더
 */

import { useAuth } from "@/store/authStore"; // 전역 인증 스토어(Zustand)
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useMemo, type ReactNode } from "react";

export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  // 중요: 객체 전체가 아닌 "원시값" 단위 selector로 구독 → 스냅샷/리렌더 안정화
  const ready = useAuth((s) => s.ready);
  const isLoggedIn = useAuth((s) => !!s.user);

  // 사용자가 접근하려던 원래 주소(쿼리/해시 포함)를 next로 보관
  const location = useLocation();

  // Hooks 규칙 준수: useMemo는 조건문 밖, 최상위에서 호출
  const next = useMemo(
    () => encodeURIComponent(`${location.pathname}${location.search}${location.hash}`),
    [location.pathname, location.search, location.hash]
  );

  // 안전장치: 만약 실수로 /before-login 트리에 ProtectedRoute를 감싸면
  //             여기서 다시 /before-login으로 리다이렉트하는 루프가 생길 수 있으므로 방지
  if (location.pathname.startsWith("/before-login")) {
    return <>{children ?? <Outlet />}</>;
  }

  // 1) 아직 인증 상태 결론이 나지 않았으면 판단 보류 (원하면 로딩 컴포넌트로 교체)
  if (!ready) {
    return null; // e.g. return <FullScreenSpinner/>;
  }

  // 2) 미로그인 → 로그인 전 페이지로 이동, 로그인 성공 시 next로 복귀
  if (!isLoggedIn) {
    return <Navigate to={`/before-login?next=${next}`} replace />;
  }

  // 3) 로그인 상태 → 보호된 자식 렌더 (children 우선, 없으면 <Outlet/>)
  return <>{children ?? <Outlet />}</>;
}