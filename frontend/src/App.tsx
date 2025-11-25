/**
 * App.tsx — 라우팅과 홈 분기(로그인 전/후)
 * ─────────────────────────────────────────────────────────
 * 목적
 *  - 이 파일은 앱의 "길 안내 지도"(Router)입니다. 주소(URL)에 따라 어떤 화면을 보여줄지 정합니다.
 *  - 특히 "/"(홈)에서는 항상 로그인 전 랜딩 화면을 보여주며, 로그인 성공 시 대시보드로 이동합니다.
 *
 * 누가 보면 좋은가요?
 *  - 기획/디자인/QA 동료: 로그인 전/후 사용자 흐름과 보호 라우팅(로그인 필요 페이지)을 이해할 때
 *  - 개발자: React Router의 기본 구조와 가드(ProtectedRoute) 패턴을 파악할 때
 *
 * 핵심 흐름 요약
 *  1) 홈("/")에서는 항상 BeforeLogin(로그인 전 랜딩) 화면을 보여주며, 로그인 성공 시 대시보드(/dashboard)로 이동한다.
 *  2) 보호 라우트(ProtectedRoute)는 /dashboard, /취향기록, /취향기록/:id와 같이 로그인 후에만 접근 가능한 페이지를 감싼다.
 *
 * 용어
 *  - BrowserRouter: URL 변화를 감지해 해당하는 화면을 보여주는 라우터(브라우저 전용)
 *  - Routes/Route : 각 주소(path)와 그 주소에서 보여줄 컴포넌트(element)를 연결하는 설정
 *  - ProtectedRoute: 로그인이 필요할 때만 자식 라우트를 통과시키는 보호막(컴포넌트)
 */
import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard/Dashboard"; // 로그인 후 메인 화면
import TasteList from "@/pages/TasteRecord/TasteList"; // 기록 목록(보호 라우트 내부)
import TasteDetail from "@/pages/TasteRecord/TasteDetail"; // 기록 상세(보호 라우트 내부)
import BeforeLogin from "@/pages/BeforeLogin/BeforeLogin"; // 로그인 전 랜딩 페이지
import ProtectedRoute from "@/routes/ProtectedRoute"; // 로그인 필요 가드

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught an error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24 }}>문제가 발생했어요. 새로고침하거나 다시 시도해 주세요.</div>;
    }
    return this.props.children;
  }
}

/**
 * App (최상위 라우터)
 * - BrowserRouter로 라우팅을 활성화하고, 주소(path)별로 보여줄 화면을 선언합니다.
 * - 보호가 필요한 경로는 <ProtectedRoute> 안쪽에 둡니다.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 24 }}>화면을 불러오고 있어요…</div>}>
          <Routes>
            {/*
              홈("/"): 항상 로그인 전 랜딩 페이지를 먼저 보여줍니다.
              - 실제 로그인 성공 시, 로그인 모달/로직에서 /dashboard로 이동하도록 처리합니다.
            */}
            <Route path="/" element={<BeforeLogin />} />

            {/**
             * 보호 라우트: 아래 자식 경로들은 로그인 상태에서만 접근 가능
             *  - /dashboard        : 로그인 후 메인 화면
             *  - /취향기록        : 기록 목록(슬라이더/작성 모달 등)
             *  - /취향기록/:id    : 기록 상세(썸네일/설명/본문)
             *  - 비로그인 접근 시 ProtectedRoute가 /before-login?next=... 로 보내고,
             *    로그인 성공 후 원래 가려던 경로(next)로 복귀합니다.
             */}
            <Route element={<ProtectedRoute />}>
              {/* 로그인 후 메인도 보호 라우트로 직접 접근 가능하도록 라우트 추가 */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/취향기록" element={<TasteList />} />
              <Route path="/취향기록/:id" element={<TasteDetail />} />
            </Route>

            {/** 존재하지 않는 경로는 홈으로 보냄(필요시 별도 NotFound 페이지로 교체 가능) */}
            <Route path="*" element={<BeforeLogin />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}