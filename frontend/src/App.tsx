/**
 * App.tsx — 라우팅과 홈 분기(로그인 전/후)
 * ─────────────────────────────────────────────────────────
 * 목적
 *  - 이 파일은 앱의 "길 안내 지도"(Router)입니다. 주소(URL)에 따라 어떤 화면을 보여줄지 정합니다.
 *  - 특히 "/"(홈)에서 "로그인 했는가?" 여부를 확인해, 로그인 전/후 서로 다른 첫 화면을 보여줍니다.
 *
 * 누가 보면 좋은가요?
 *  - 기획/디자인/QA 동료: 로그인 전/후 사용자 흐름과 보호 라우팅(로그인 필요 페이지)을 이해할 때
 *  - 개발자: React Router의 기본 구조와 가드(ProtectedRoute) 패턴을 파악할 때
 *
 * 핵심 흐름 요약
 *  1) HomeGate: 홈("/")에 들어왔을 때, 로그인 상태에 따라
 *     - 로그인 O → Dashboard(로그인 후 메인)
 *     - 로그인 X → BeforeLogin(로그인 전 랜딩)
 *  2) 보호 라우트(ProtectedRoute): 로그인해야 들어갈 수 있는 페이지(취향기록/상세)를 감쌉니다.
 *  ※ 로그인 판별은 오직 전역 상태(useAuth.isLoggedIn)만 사용합니다.
 *
 * 용어
 *  - BrowserRouter: URL 변화를 감지해 해당하는 화면을 보여주는 라우터(브라우저 전용)
 *  - Routes/Route : 각 주소(path)와 그 주소에서 보여줄 컴포넌트(element)를 연결하는 설정
 *  - ProtectedRoute: 로그인이 필요할 때만 자식 라우트를 통과시키는 보호막(컴포넌트)
 */
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/AfterLogin/Dashboard"; // 로그인 후 메인 화면
import TasteList from "@/pages/TasteRecord/TasteList"; // 기록 목록(보호 라우트 내부)
import TasteDetail from "@/pages/TasteRecord/TasteDetail"; // 기록 상세(보호 라우트 내부)
import BeforeLogin from "@/pages/BeforeLogin/BeforeLogin"; // 로그인 전 랜딩 페이지
import ProtectedRoute from "@/components/ProtectedRoute"; // 로그인 필요 가드
import { useAuth } from "@/store/auth"; // 전역 인증 상태(Zustand)

/**
 * HomeGate
 * - "/"(홈)에서 로그인 상태를 확인해 적절한 첫 화면을 결정합니다.
 *   · 전역 상태 isLoggedIn이 true면 → <Dashboard />
 *   · false면 → <BeforeLogin /> (여기서 로그인/회원가입 모달을 띄울 수 있음)
 * - 최초 진입 시 /auth/me(세션 확인)를 한 번 호출해 스토어를 부팅(hydration)합니다.
 */
function HomeGate() {
  // ✅ Zustand는 "원시값(selector) 구독"이 안전합니다. 객체 리턴은 리렌더 루프를 유발할 수 있어요.
  const ready = useAuth((s) => s.ready);            // 부팅(/auth/me) 완료 플래그
  const isLoggedIn = useAuth((s) => s.isLoggedIn);  // 로그인 여부
  const bootstrap = useAuth((s) => s.bootstrap);    // 스토어 초기화 함수

  // 앱 첫 진입 시 세션 확인(한 번만). ready가 false일 때만 호출
  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  // 아직 부팅 하이드레이션(/auth/me) 중이면 간단한 로딩 표시
  if (!ready) return <div style={{ padding: 24 }}>앱을 준비 중입니다…</div>;

  // 준비 완료 후, 로그인 여부에 따라 첫 화면 결정
  return isLoggedIn ? <Dashboard /> : <BeforeLogin />;
}

function HomeGateKeyed() {
  // 로그인/로그아웃 전환 시 홈 루트 컴포넌트를 완전히 재마운트시켜 잔상/상태 누수를 방지
  // key는 로그인 상태만 의존(ready는 일시적 상태이므로 key로 사용하지 않음)
  const isLoggedIn = useAuth((s) => s.isLoggedIn);
  return <HomeGate key={isLoggedIn ? "in" : "out"} />;
}

/**
 * App (최상위 라우터)
 * - BrowserRouter로 라우팅을 활성화하고, 주소(path)별로 보여줄 화면을 선언합니다.
 * - 보호가 필요한 경로는 <ProtectedRoute> 안쪽에 둡니다.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/**
         * 홈("/"): 로그인 여부에 따라 분기
         *  - HomeGate 내부에서 Dashboard 또는 BeforeLogin 중 하나를 선택 렌더
         */}
        <Route path="/" element={<HomeGateKeyed />} />

        {/** 로그인 전 랜딩 페이지(직접 접근 시 주소로도 들어올 수 있음) */}
        <Route path="/before-login" element={<BeforeLogin />} />

        {/**
         * 보호 라우트: 아래 자식 경로들은 로그인 상태에서만 접근 가능
         *  - /취향기록        : 기록 목록(슬라이더/작성 모달 등)
         *  - /취향기록/:id    : 기록 상세(썸네일/설명/본문)
         *  - 비로그인 접근 시 ProtectedRoute가 /before-login?next=... 로 보내고,
         *    로그인 성공 후 원래 가려던 경로(next)로 복귀합니다.
         */}
        <Route element={<ProtectedRoute />}>
          <Route path="/취향기록" element={<TasteList />} />
          <Route path="/취향기록/:id" element={<TasteDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}