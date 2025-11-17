/**
 * 🔒 ProtectedRoute (보호된 페이지 가드)
 * ─────────────────────────────────────────────────────────
 * Zustand 구독 최적화 버전:
 *  - 전역 스토어에서 필요한 값만 **원시값 selector**로 구독하여
 *    `getSnapshot should be cached` 경고와 리렌더 루프를 방지합니다.
 *  - 부팅(세션 확인) 완료 전에는 렌더를 보류하고, 이후 로그인 여부로 접근 제어합니다.
 *
 * 사용 방법
 *  - 로그인 필요 페이지 라우트의 element로 감싸서 사용합니다.
 *    예) <Route element={<ProtectedRoute/>}> ... </Route>
 *
 * 동작
 *  1) `ready`가 false면 아직 세션 확인 전 → null(또는 로딩 UI) 반환
 *  2) `ready`가 true면 로그인 여부 확인
 *     - 미로그인: "/before-login?next=원래경로"로 이동
 *     - 로그인: children 또는 <Outlet/> 렌더
 */

import { useAuth } from "@/store/auth"; // 전역 인증 스토어
import { Navigate, useLocation, Outlet } from "react-router-dom";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  // ✅ 중요: 객체가 아닌 "원시값" 단위 selector로 구독 → 스냅샷 안정화
  const ready = useAuth((s) => s.ready);
  const isLoggedIn = useAuth((s) => !!s.user);

  // 사용자가 접근하려던 원래 주소(쿼리/해시 포함)를 next로 보관
  const location = useLocation();

  // 1) 아직 인증 상태 결론이 나지 않았으면 판단 보류 (필요 시 로딩 UI로 교체)
  if (!ready) {
    return null; // e.g. return <FullScreenSpinner/>;
  }

  // 2) 미로그인 → 로그인 전 페이지로 이동, 로그인 성공 시 next로 복귀
  if (!isLoggedIn) {
    const next = encodeURIComponent(
      location.pathname + location.search + location.hash
    );
    return <Navigate to={`/before-login?next=${next}`} replace />;
  }

  // 3) 로그인 상태 → 보호된 자식 렌더 (children 우선, 없으면 <Outlet/>)
  return <>{children ?? <Outlet />}</>;
}