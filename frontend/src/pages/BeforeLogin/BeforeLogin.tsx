/**
 * BeforeLogin (로그인 전 메인 화면)
 * ─────────────────────────────────────────────────────────
 * 목적: 아직 로그인하지 않은 사용자가 처음 보게 되는 랜딩 화면입니다.
 *       - 상단 헤더에서는 서비스 진입(메뉴/로고)을 잠그고, 로그인/회원가입 버튼만 허용합니다.
 *       - 로그인/회원가입(모달) 성공 시, 원래 가려던 페이지(next)나 홈("/")로 이동시킵니다.
 *
 * 이 파일을 보면 좋은 사람
 *  - 기획/디자인/QA: 로그인 전 화면의 **흐름**(잠금/모달/리다이렉트)을 이해할 때
 *
 * 핵심 동작 요약
 *  1) URL에 `?next=/원래경로`가 있을 수 있습니다. (보호 페이지에서 튕겨온 경우)
 *  2) 이미 로그인 상태라면 즉시 next(또는 홈)로 이동합니다.
 *  3) 모달에서 로그인/회원가입이 성공하면 next(또는 홈)로 이동합니다.
 */

import { useState, useEffect, useRef } from "react";
import Hero from "@/sections/Hero";                    // 상단 대표 배너(풀-블리드로 보이는 시각 요소)
import HeaderNav from "@/components/HeaderNav";        // 상단 네비게이션 (여기서는 잠금 모드로 사용)
import SignupModal from "@/components/SignupModal";    // 로그인/회원가입 통합 모달
import { useLocation, useNavigate } from "react-router-dom"; // URL 쿼리와 페이지 이동을 위한 라우터 훅
import { useAuth } from "@/store/auth";
import apiClient from "@/services/apiClient";

/**
 * 안전한 next 경로 계산
 * - 외부 URL(open redirect) 방지: 반드시 "/"로 시작하고 "//"나 "http"로 시작하지 않도록 제한
 * - 디코딩 오류 등 예외 발생 시 "/"로 대체
 */
function resolveNext(search: string): string {
  const params = new URLSearchParams(search);
  const raw = params.get("next") || "/";
  try {
    const decoded = decodeURIComponent(raw);
    // 내부 경로만 허용 (예: "/dashboard", "/settings")
    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }
  } catch {
    // ignore
  }
  return "/";
}

/**
 * 로그인 전 메인 화면 컴포넌트
 * - 상단 헤더는 잠금(lockNav/lockLogo) 상태로 렌더됩니다.
 * - 중앙에는 히어로 섹션과 로그인/회원가입 CTA 버튼을 보여줍니다.
 * - 모달(SignupModal)에서 실제 인증을 수행합니다.
 */
export default function BeforeLogin() {
  // 현재 주소/쿼리 파싱, 페이지 이동 도구
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = useAuth((s) => s.isLoggedIn);

  // 인증 모달 열림 상태 (true=열림, false=닫힘)
  const [open, setOpen] = useState(false);
  // 모달 최초 모드: "login" 또는 "signup" (버튼으로 무엇을 눌렀는지 반영)
  const [initialMode, setInitialMode] = useState<"login" | "signup">("login");

  const handledAuthSuccess = useRef(false); // React 18/StrictMode 중복 호출 방지 (idempotent 가드)

  // 로그인/회원가입 버튼 클릭 시 모달 열기
  const openAuth = (mode: "login" | "signup") => {
    setInitialMode(mode);
    setOpen(true);
  };

  /**
   * [중요] 자동 이동(useEffect)
   * - URL의 `?next=` 값을 읽어, 로그인 상태에서 어디로 갈지 결정합니다.
   * - 이미 로그인 상태라면 즉시 이동, 아니라면 로그인 성공 이벤트를 기다렸다가 이동합니다.
   */
  useEffect(() => {
    const dest = resolveNext(location.search);

    if (isLoggedIn) {
      navigate(dest, { replace: true });
      return;
    }

    // (보조) 커스텀 로그인 이벤트를 듣고 이동 — 모달/헤더에서 브로드캐스트할 때 사용
    const onLogin = () => navigate(dest, { replace: true });
    window.addEventListener("auth:login", onLogin);
    return () => window.removeEventListener("auth:login", onLogin);
  }, [isLoggedIn, location.search, navigate]);

  return (
    <div className="min-h-screen text-stone-800">
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
        <div className="mt-10 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="px-5 py-2.5 rounded-md bg-amber-800 text-white text-sm shadow hover:bg-amber-900 transition"
            aria-label="로그인하기"
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => openAuth("signup")}
            className="px-5 py-2.5 rounded-md ring-1 ring-stone-300 text-stone-700 hover:bg-stone-100 text-sm transition"
            aria-label="회원가입하기"
          >
            회원가입
          </button>
        </div>
      </main>

      {/* 풋터(간단 저작권 표기) */}
      <footer className="mt-16 py-10 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} 취향도감. All rights reserved.
      </footer>

      {/**
       * 통합 인증 모달(SignupModal)
       * - `initialMode`로 로그인/회원가입 탭 중 무엇을 먼저 보여줄지 결정합니다.
       * - onSuccess: 인증 성공 시 next(또는 홈)로 이동합니다.
       */}
      <SignupModal
        open={open}
        initialMode={initialMode}
        onClose={() => setOpen(false)}
        onSwitchMode={(m: "login" | "signup") => setInitialMode(m)}
        onSuccess={async (user) => {
          // React 18 StrictMode나 중복 트리거에 대비: 성공 처리 한 번만 수행
          if (handledAuthSuccess.current) return;
          handledAuthSuccess.current = true;
          /**
           * 1) 서버 세션 쿠키 기반으로 /auth/me를 호출해 사용자 정보를 동기화
           *    - apiClient가 AxiosResponse<T> 또는 T 자체를 반환하는 두 케이스를 모두 지원
           * 2) 스토어의 User 타입(name/email: string 필수)에 맞춰 안전하게 기본값 채움
           * 3) 실패 시 모달이 넘긴 user로 폴백
           */
          type MeUser = { id?: string; email?: string; name?: string };
          type MeResponse = { user: MeUser } | MeUser;

          try {
            const res = await apiClient.get<MeResponse>("/auth/me");
            // AxiosResponse 또는 data 직접 반환 케이스 모두 처리
            const payload: any = (res as any)?.data ?? res;
            const rawMe: any = payload?.user ?? payload;

            // 스토어 User 타입에 맞게 안전 사용자 구성 (name/email은 string 보장)
            const safeUser = rawMe
              ? {
                  id: typeof rawMe.id === "string"
                    ? rawMe.id
                    : (typeof rawMe.email === "string" ? rawMe.email : "unknown"),
                  email: typeof rawMe.email === "string" ? rawMe.email : "",
                  name:
                    typeof rawMe.name === "string"
                      ? rawMe.name
                      : (typeof rawMe.email === "string" ? rawMe.email.split("@")[0] : "User"),
                }
              : null;

            if (safeUser) {
              // 세션 쿠키 기반이라 토큰은 보통 사용하지 않음
              useAuth.getState().login?.({ user: safeUser, token: undefined });
            } else {
              // 폴백: 모달에서 전달된 user 사용 (string 보장)
              const rawEmail = (user as any)?.email;
              const email = typeof rawEmail === "string" ? rawEmail : "user@example.com";
              const name = (user as any)?.name ?? email.split("@")[0];
              const id = (user as any)?.id ?? email;
              useAuth.getState().login?.({
                user: { id: String(id), name: String(name), email: String(email) },
                token: "LOCAL_FAKE_TOKEN",
              });
            }
          } catch {
            // 네트워크/서버 오류 시에도 폴백 적용 (string 보장)
            const rawEmail = (user as any)?.email;
            const email = typeof rawEmail === "string" ? rawEmail : "user@example.com";
            const name = (user as any)?.name ?? email.split("@")[0];
            const id = (user as any)?.id ?? email;
            useAuth.getState().login?.({
              user: { id: String(id), name: String(name), email: String(email) },
              token: "LOCAL_FAKE_TOKEN",
            });
          }

          // 3) 이동: 안전하게 산출한 next로 이동
          const dest = resolveNext(location.search);
          navigate(dest, { replace: true });
        }}
      />
    </div>
  );
}