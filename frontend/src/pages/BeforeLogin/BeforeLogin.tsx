/**
 * BeforeLogin (로그인 전 메인 화면)
 * ─────────────────────────────────────────────────────────
 * 목적: 아직 로그인하지 않은 사용자가 처음 보게 되는 랜딩 화면입니다.
 *       - 상단 헤더에서는 서비스 진입(메뉴/로고)을 잠그고, 로그인/회원가입 버튼만 허용합니다.
 *       - 로그인/회원가입(모달) 성공 시, 항상 대시보드("/dashboard")로 이동시킵니다.
 *
 * 이 파일을 보면 좋은 사람
 *  - 기획/디자인/QA: 로그인 전 화면의 **흐름**(잠금/모달/리다이렉트)을 이해할 때
 *
 * 핵심 동작 요약
 *  1) 아직 로그인/세션 확인 중(checking === true)이면 로딩 화면만 보여준다.
 *  2) 이미 로그인 상태라면 이 페이지에 올 일이 없으므로 즉시 "/dashboard"로 보낸다.
 *  3) 모달에서 로그인/회원가입이 성공하면 "/dashboard"로 이동한다.
 */

import { useState, useEffect, useRef } from "react";
import Hero from "@/components/Hero"; // 상단 대표 배너(풀-블리드로 보이는 시각 요소)
import HeaderNav from "@/components/HeaderNav"; // 상단 네비게이션 (여기서는 잠금 모드로 사용)
import SignupModal from "@/components/SignupModal"; // 로그인/회원가입 통합 모달
import { useNavigate } from "react-router-dom"; // 페이지 이동을 위한 라우터 훅
import { useAuth, useAuthGate } from "@/store/authStore"; // ✅ 전역 인증 스토어 + 게이트 훅

// 로그인 성공 후 이동할 경로 (지금은 항상 대시보드로 고정)
const AFTER_LOGIN_PATH = "/dashboard";

/**
 * 로그인 전 메인 화면 컴포넌트
 * - 상단 헤더는 잠금(lockNav/lockLogo) 상태로 렌더됩니다.
 * - 중앙에는 히어로 섹션과 로그인/회원가입 CTA 버튼을 보여줍니다.
 * - 모달(SignupModal)에서 실제 인증을 수행합니다.
 */
export default function BeforeLogin() {
  const navigate = useNavigate();

  // ✅ 다른 곳(HomeGate/ProtectedRoute)과 동일한 기준으로 로그인 상태 파악
  //  - checking: 아직 서버에 /auth/me 등을 날려서 로그인/세션 체크 중인지 여부
  //  - isLoggedIn: 최종적으로 로그인된 상태인지 여부
  const { checking, isLoggedIn } = useAuthGate();

  // 전역 auth 스토어 액션들
  const bootstrap = useAuth((s) => s.bootstrap);
  const setLoggedIn = useAuth((s) => s.setLoggedIn);

  // 인증 모달 열림 상태 (true=열림, false=닫힘)
  const [open, setOpen] = useState(false);
  // 모달 최초 모드: "login" 또는 "signup" (버튼으로 무엇을 눌렀는지 반영)
  const [initialMode, setInitialMode] = useState<"login" | "signup">("login");

  // React 18/StrictMode 등에서 onSuccess가 중복 호출되는 것을 방지하는 가드
  const handledAuthSuccess = useRef(false);

  // 로그인/회원가입 버튼 클릭 시 모달 열기
  const openAuth = (mode: "login" | "signup") => {
    setInitialMode(mode);
    setOpen(true);
  };

  /**
   * [중요] 자동 이동(useEffect)
   * - 로그인/세션 체크가 끝난 뒤(checking === false)에만 isLoggedIn을 신뢰합니다.
   * - 이미 로그인 상태라면 즉시 "/dashboard"로 이동합니다.
   *   (예: 새로고침 후 /before-login으로 온 경우)
   */
  useEffect(() => {
    // 아직 로그인/세션 체크 중이면 아무 것도 하지 않음
    if (checking) return;

    // 미로그인 상태라면 이 페이지를 그대로 보여줌
    if (!isLoggedIn) return;

    // 이미 로그인 상태에서 /before-login 진입 시 → 자동으로 대시보드로 보냄
    navigate(AFTER_LOGIN_PATH, { replace: true });
  }, [checking, isLoggedIn, navigate]);

  /**
   * 모달 안에서 로그인/회원가입이 성공했을 때 호출되는 콜백
   * - 1) 세션 쿠키 기반으로 /auth/me 호출 → 전역 auth 스토어 동기화
   * - 2) "/dashboard"로 페이지 이동
   */
  const handleAuthSuccess = async (user: any) => {
    // React 18 StrictMode나 중복 트리거에 대비: 성공 처리 한 번만 수행
    if (handledAuthSuccess.current) return;
    handledAuthSuccess.current = true;

    // 1차로, 서버 응답에서 받은 사용자 정보로 전역 auth 상태를 즉시 갱신
    //    → isLoggedIn 이 바로 true가 되어 ProtectedRoute가 즉시 대시보드를 허용합니다.
    try {
      setLoggedIn(user as any);
    } catch (e) {
      console.error("setLoggedIn 호출 중 오류:", e);
    }

    try {
      // ✅ 로그인 직후에는 강제로 세션 재동기화
      await bootstrap();
    } catch (e) {
      // 서버/네트워크 오류가 있어도 다음 화면으로 이동하면
      // 보호 라우터(ProtectedRoute)가 최종 isLoggedIn 여부에 따라 적절히 처리함
      console.error("로그인 후 bootstrap 중 오류:", e);
    }

    // 모달 닫고
    setOpen(false);

    // 무조건 "/dashboard"로 이동
    navigate(AFTER_LOGIN_PATH, { replace: true });
  };

  // ✅ 아직 로그인/세션 상태를 확인하는 중이라면,
  //    로그인 전/후 화면을 번갈아 깜빡이지 않도록 간단한 로딩 화면만 보여줍니다.
  if (checking) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <p className="text-sm text-[#6b4e2f] font-medium">로그인 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8f1] text-stone-800">
      {/**
       * 상단 네비게이션(잠금 모드)
       * - 로그인 전에는 서비스 내비게이션을 사용할 수 없도록 잠급니다.
       *   · lockNav  : 상단 메뉴 클릭 비활성화
       *   · lockLogo : 로고 클릭 시 홈/대시보드 진입 차단
       *   · onOpenAuth: 헤더의 로그인/회원가입 버튼 클릭 시 모달 열기
       *   · authButtons="none": 헤더 오른쪽 인증 버튼 영역을 숨김 (아래 CTA만 보이도록)
       */}
      <HeaderNav lockNav lockLogo onOpenAuth={openAuth} authButtons="none" />

      {/** 본문 컨테이너: 헤더와 간격, 좌우 패딩, 최대 폭 제어 */}
      <main className="mx-auto max-w-6xl px-5 pt-12 md:pt-16 pb-14">
        {/* 히어로 섹션(브랜드/메시지/이미지 등) */}
        <Hero />

        {/* 중앙 CTA: 로그인 / 회원가입 버튼 */}
        <div className="mt-10 flex justify-center gap-5">
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="px-8 py-3 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-sm font-black tracking-wide hover:from-[#9b7f57] hover:to-[#7b5e3f] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
            aria-label="로그인하기"
          >
            ⚔️ 로그인
          </button>
          <button
            type="button"
            onClick={() => openAuth("signup")}
            className="px-8 py-3 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] text-sm font-black tracking-wide hover:from-[#5a4430] hover:to-[#4a3828] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
            aria-label="회원가입하기"
          >
            📜 회원가입
          </button>
        </div>
      </main>

      {/* 풋터(간단 저작권 표기) */}
      <footer className="mt-16 py-10 text-center relative">
        {/* 장식 라인 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-[#c9a961] to-transparent" />
        <p className="text-xs text-[#8b6f47] font-medium">
          © {new Date().getFullYear()} 취향도감. All rights reserved.
        </p>
      </footer>

      {/**
       * 통합 인증 모달(SignupModal)
       * - `initialMode`로 로그인/회원가입 탭 중 무엇을 먼저 보여줄지 결정합니다.
       * - onSuccess: 인증 성공 시 "/dashboard"로 이동합니다.
       */}
      <SignupModal
        open={open}
        initialMode={initialMode}
        onClose={() => {
          setOpen(false);
          handledAuthSuccess.current = false;
        }}
        onSwitchMode={(m: "login" | "signup") => setInitialMode(m)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}