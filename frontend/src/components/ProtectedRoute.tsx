/**
 * 🔒 ProtectedRoute (보호된 페이지 가드)
 * ─────────────────────────────────────────────────────────
 * 목적: "로그인이 필요한 페이지"에 로그인하지 않은 사용자가 들어오면
 *       로그인 전 랜딩(/before-login)으로 보내고, 로그인 후 원래 오려던 곳으로 돌려보냅니다.
 *
 * 이 파일을 보면 좋은 사람
 *  - 기획/디자인: 로그인 흐름이 페이지에서 어떻게 막히고/열리는지 이해할 때
 *  - QA: 비로그인 접근 → 리다이렉트 → 로그인 후 복귀(next) 시나리오를 점검할 때
 *
 * 동작 개요
 *  1) 사용자가 보호된 경로(예: "/취향기록")에 접근하면,
 *  2) 현재 로그인 상태를 확인합니다.
 *     - Zustand 전역 상태(isLoggedIn)
 *     - 브라우저 저장소(localStorage/sessionStorage)의 세션(auth_user)
 *  3) 로그인되어 있지 않다면 "/before-login?next=원래경로"로 보냅니다.
 *  4) 로그인/회원가입이 성공하면, `next` 값이 있으면 거기로, 없으면 홈("/")로 이동합니다.
 *
 * 용어 정리
 *  - next: 로그인 후 "돌아갈 주소"를 뜻합니다. 주소창의 쿼리스트링으로 전달합니다.
 *          예) /before-login?next=/취향기록/123
 *
 * 구현 포인트
 *  - children이 있을 땐 그대로 렌더, 없을 땐 <Outlet/>으로 중첩 라우트를 지원합니다.
 *  - try/catch: 브라우저 환경이 아닌 경우(극히 드묾)에 대비해 안전하게 처리합니다.
 */

import { useAuth } from "@/store/auth"; // 전역 로그인 상태(Zustand)에서 isLoggedIn 값을 읽습니다.
import { Navigate, useLocation, Outlet } from "react-router-dom"; // 라우터 도구들
import type { ReactNode } from "react";

/**
 * hasStoredUser()
 * - 브라우저 저장소에 로그인 정보가 남아 있는지 확인합니다.
 *   • localStorage: "로그인 유지"(remember ON)일 때 탭/새창에서도 유지
 *   • sessionStorage: 현재 탭에서만 유지
 */
function hasStoredUser(): boolean {
  try {
    const key = "auth_user";
    // local 또는 session 어느 한쪽에만 있어도 "로그인 상태로 인정"
    return !!(localStorage.getItem(key) ?? sessionStorage.getItem(key));
  } catch {
    // (안전장치) SSR 등 특수 환경에서 storage 접근 실패 시 비로그인으로 판단
    return false;
  }
}

/**
 * ProtectedRoute 컴포넌트
 * - 보호가 필요한 경로를 이 컴포넌트로 감싸면, 비로그인 접근 시 차단하고 리다이렉트합니다.
 * - 사용법 (두 가지 모두 지원)
 *   1) 래퍼 방식
 *      <ProtectedRoute>
 *        <PrivatePage />
 *      </ProtectedRoute>
 *   2) 중첩 라우트 방식
 *      <Route element={<ProtectedRoute />}>
 *        <Route path="/취향기록" element={<TasteList />} />
 *      </Route>
 */
export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  // 1) 전역 상태의 로그인 여부
  const isLoggedIn = useAuth((s) => s.isLoggedIn);
  // 2) 현재 주소 정보(원래 가려던 경로를 next로 담기 위해 필요)
  const location = useLocation();

  // 최종 로그인 판단: 전역 상태 or 저장소 중 하나라도 true면 로그인
  const authed = isLoggedIn || hasStoredUser();

  // 비로그인인 경우 → 로그인 전 랜딩으로 이동시키되, 돌아올 주소(next)를 같이 전달
  if (!authed) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/before-login?next=${next}`} replace />;
  }

  // 로그인 상태라면:
  // - children이 있으면 그대로 렌더
  // - 없으면 <Outlet/>을 렌더해서 중첩 라우트 내부의 실제 페이지를 보여줍니다.
  return <>{children ?? <Outlet />}</>;
}