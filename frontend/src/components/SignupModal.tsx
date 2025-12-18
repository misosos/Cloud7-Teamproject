/*
  SignupModal (통합 인증 모달)
  ─────────────────────────────────────────────────────────
  목적: 하나의 모달 안에서 "로그인"과 "회원가입"을 모두 처리합니다.
  대상: 기획/디자인/QA 동료도 빠르게 이해할 수 있도록, 동작 흐름을 상세 주석으로 설명합니다.

  ▸ 이 모달이 하는 일 (요약)
    1) 화면 중앙에 뜨는 팝업에서 이메일/비밀번호를 입력받는다.
    2) 간단한 형식 검사를 통과하면(이메일 모양/비밀번호 길이 등) 인증을 시도한다.
    3) 성공 시: 상위에 사용자 정보를 전달하고(onSuccess), 로그인 이벤트를 전체 앱에 알린다.
       - "로그인 유지" 체크 시 localStorage, 아니면 sessionStorage에 사용자 정보를 저장한다.
       - 모달을 닫고, 라우터(상위 페이지)에서 이후 화면 전환을 처리한다.
    4) 실패 시: 에러 메시지를 모달 안에 보여준다.

  ▸ 왜 이렇게 구성했나?
    - 로그인/회원가입 UI와 기본 검증 로직을 "재사용 가능한 하나의 컴포넌트"로 묶어두면,
      여러 페이지에서 같은 방식으로 사용할 수 있어 유지보수가 쉽습니다.
    - 실제 서버 연동(API 호출)은 외부에서 주입(`authenticate`)하거나, 미주입 시 services/auth.ts로 자동 연결됩니다.

  ▸ props (외부에서 넘겨주는 값)
    - open:            모달 열림 여부(true/false)
    - onClose:         모달 닫기 콜백 함수
    - initialMode:     처음 열릴 때 모드("login" | "signup")
    - onSuccess?:      인증 성공 시 상위에 사용자 객체를 전달 (상태 보관/화면전환에 사용)
    - authenticate?:   실제 인증을 수행할 함수(선택). 주입되면 그것을 사용해서 로그인/회원가입을 처리
    - onSwitchMode?:   모달 내부에서 모드 전환 시 상위에 알려줌(선택)

  ▸ 상위 상태 연결 가이드
    - 이 모달에 `onSuccess`를 전달해, 상위(App/Header 등)에서 로그인 상태를 보관하세요.
    - 또한 전역 이벤트 `auth:login`을 `window.addEventListener('auth:login', ...)`로 수신할 수도 있습니다.
    - 새로고침 후에도 유지하려면 localStorage/sessionStorage의 `auth_user`를 읽어 초기화하세요.

  ▸ 접근성/사용성(UX) 처리
    - ESC로 닫기, 바깥(어두운 배경) 클릭 시 닫기, 모달 열릴 때 배경 스크롤 잠금
    - 첫 입력칸 자동 포커스, CapsLock 안내, 비밀번호 표시/숨김 토글
*/

import { useEffect, useMemo, useRef, useState } from "react";
import * as authService from "@/api/authService";

// 외부에서 받을 props의 타입 정의
type Props = {
  open: boolean;                 // 모달 열림 상태
  onClose: () => void;           // 모달 닫기 콜백
  initialMode: "login" | "signup"; // 처음 열릴 때 표시할 모드
  /** 로그인/회원가입 성공 시 상위 컴포넌트로 사용자 정보를 전달합니다. */
  onSuccess?: (user: { email: string; [k: string]: any }) => void;
  /**
   * (선택) 실제 인증을 처리할 함수. 제공하면 이 함수를 통해 로그인/회원가입을 수행합니다.
   * 실패 시 Error를 throw 해주세요.
   *  - mode: "login" | "signup"
   *  - email, password: 사용자가 입력한 값
   *  반환: { email, ... } 형태의 유저 객체
   */
  authenticate?: (args: {
    mode: "login" | "signup";
    email: string;
    password: string;
  }) => Promise<{ email: string; [k: string]: any }>;
  /** 모달 내부에서 모드 전환 시 상위 컴포넌트에 알림 (선택) */
  onSwitchMode?: (mode: "login" | "signup") => void;
};

export default function SignupModal({ open, onClose, initialMode, onSuccess, authenticate, onSwitchMode }: Props) {
  // ─────────────────────────────────────────────────────────
  // ① 모드 상태: 로그인/회원가입 전환(좌측 하단 링크로 전환)
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  // ② 폼 입력값 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(""); // 회원가입 모드에서만 필요

  // ③ 로그인 유지 여부(체크 시 localStorage, 아니면 sessionStorage 사용)
  const [remember, setRemember] = useState(true);

  // ④ 비밀번호 표시/숨김 토글
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  // ⑤ CapsLock 감지(대문자 경고)
  const [capsOn, setCapsOn] = useState(false);

  // ⑥ UX 상태: 로딩/에러 메시지
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⑦ 입력칸 포커스용 참조 (검증 실패 시 해당 칸으로 포커스 이동)
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);

  // 파생 상태(표시용 텍스트): 모드에 따라 제목/버튼 문구 결정
  const isSignup = mode === "signup";
  const title = isSignup ? "회원가입" : "로그인";
  const cta = isSignup ? "계정 생성" : "로그인";

  // ─────────────────────────────────────────────────────────
  // ⑧ 간단한 프론트 유효성 검사(형식만 체크)
  //    - 이메일: 대략적인 이메일 모양인지
  //    - 비밀번호: 6자 이상인지
  //    - 확인란: 회원가입일 때만 확인값이 길이/일치하는지
  const isEmailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const isPasswordValid = useMemo(() => password.trim().length >= 6, [password]);
  const isConfirmValid = useMemo(
    () => (isSignup ? confirm.trim().length >= 6 && confirm === password : true),
    [isSignup, confirm, password]
  );
  const isFormValid = isEmailValid && isPasswordValid && isConfirmValid;

  // ─────────────────────────────────────────────────────────
  // ⑨ 모달이 열릴 때: 모드/입력값/상태 초기화 + 첫 입력칸 포커스
  useEffect(() => {
    setMode(initialMode);
    if (open) {
      setEmail("");
      setPassword("");
      setConfirm("");
      setError(null);
      setRemember(true);
      setShowPw(false);
      setShowPwConfirm(false);
      setCapsOn(false);
      // 약간 늦춰서 포커스(렌더 완료 후)
      setTimeout(() => emailRef.current?.focus(), 0);
    }
  }, [initialMode, open]);

  // ⑩ 모달 열려있는 동안: 배경 스크롤 잠금 + ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // 배경 스크롤 잠금

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(); // ESC로 닫기
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original; // 복구
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // ⑪ 바깥(어두운 배경) 클릭 시 닫기 — 단, 로딩 중에는 오동작 방지로 막음
  const onBackdropClick = () => {
    if (!loading) onClose();
  };

  // 모달이 닫혀 있으면 아무것도 렌더하지 않음
  if (!open) return null;

  // 서버 인증 기본 연결(fallback): props.authenticate가 없으면 services/auth 사용
  // 기존 fallbackAuthenticate 전부 지우고 아래로 교체
const fallbackAuthenticate = async ({
  mode,
  email,
  password,
}: {
  mode: "login" | "signup";
  email: string;
  password: string;
}): Promise<{ email: string; [k: string]: any }> => {
  const creds = { email, password };
  const svc: any = authService as any;

  let result: any;

  if (mode === "login") {
    const fn =
      svc?.login ||
      svc?.signIn ||
      svc?.signin;

    if (typeof fn !== "function") {
      throw new Error("로그인 함수(login/signIn)가 services/auth.ts에 없습니다.");
    }
    // 지원: fn({email,password}) 또는 fn(email, password)
    result = fn.length <= 1 ? await fn(creds) : await fn(email, password);
  } else {
    const fn =
      svc?.register ||
      svc?.signUp ||
      svc?.signup ||
      svc?.registerUser;

    if (typeof fn !== "function") {
      throw new Error("회원가입 함수(register/signUp)가 services/auth.ts에 없습니다.");
    }
    // 지원: fn({email,password}) 또는 fn(email, password)
    result = fn.length <= 1 ? await fn(creds) : await fn(email, password);
  }

  // 다양한 응답 포맷 지원: { user }, { data: { user } }, 또는 바로 user
  const user = result?.user ?? result?.data?.user ?? result;
  if (!user || !user.email) {
    throw new Error("서버가 유효한 사용자 정보를 반환하지 않았습니다.");
  }
  return user;
};

  // ─────────────────────────────────────────────────────────
  // ⑫ 제출 처리: 실제 인증 시도(주입된 authenticate 사용, 없으면 TODO)
  //     - 전 단계에서 간단한 형식 검사 실패 시, 해당 입력칸에 포커스 이동
  //     - 성공: 상위 onSuccess 호출 + 전역 이벤트 브로드캐스트 + 저장(remember) + 모달 닫기
  //     - 실패: 에러 메시지 표시
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    // (1) 형식 검사 실패 시 사용자에게 안내하고 해당 칸으로 포커스 이동
    if (!isEmailValid) {
      setError("올바른 이메일을 입력해 주세요.");
      emailRef.current?.focus();
      return;
    }
    if (!isPasswordValid) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      passwordRef.current?.focus();
      return;
    }
    if (isSignup && !isConfirmValid) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      confirmRef.current?.focus();
      return;
    }

    try {
      setLoading(true);

      // (2) 실제 인증 함수: props.authenticate 우선 사용, 없으면 fallbackAuthenticate로 서버 API 호출
      const authFn =
        typeof authenticate === "function" ? authenticate : fallbackAuthenticate;

      // (3) 서버에 로그인/회원가입을 요청 (실패 시 에러 throw)
      const user = await authFn({ mode, email, password });

      // (4) 상위에 유저 정보 전달 → 상위에서 상태 보관/화면 전환에 사용
      onSuccess?.(user);

      // (5) 전역 이벤트 브로드캐스트: 헤더/다른 컴포넌트가 로그인 변화를 즉시 반영 가능
      window.dispatchEvent(new CustomEvent("auth:login", { detail: user }));

      // (6) 세션 저장: 로그인 유지(remember) 체크에 따라 저장 위치 결정
      try {
        const store = remember ? localStorage : sessionStorage;
        store.setItem("auth_user", JSON.stringify(user));
      } catch {
        // 저장이 불가한 환경(사파리 시크릿 탭 등)은 조용히 무시
      }

      // (6.1) 상위 콜백(onSuccess) 미제공 시를 대비한 보수적 처리:
      // - 전역 이벤트만 의존하는 환경에서 리렌더가 안 되면 강제 새로고침/리다이렉트로 보호
      const noConsumer = typeof onSuccess !== "function";
      if (noConsumer) {
        // 라우터가 /dashboard를 쓸 때를 가정해 우선 이동 시도, 실패 시 전체 리로드
        setTimeout(() => {
          try {
            if (window?.location?.pathname === "/" || window?.location?.pathname === "/login") {
              window.location.assign("/dashboard");
            } else {
              window.location.reload();
            }
          } catch {
            window.location.reload();
          }
        }, 0);
      }

      // (7) 성공 시 모달 닫기 — 이후 이동은 상위 라우팅 로직에서 처리
      onClose();
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      let msg =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "이메일 또는 비밀번호가 올바르지 않습니다.";

      if (status === 401) msg = "이메일 또는 비밀번호가 올바르지 않습니다.";
      if (status === 409) msg = "이미 가입된 이메일입니다.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // ⑬ 실제 렌더링(화면 그리기)
  return (
    <div
      aria-modal="true"
      role="dialog" // 스크린리더에게 대화 상자임을 알림
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* 어두운 배경(모달 뒤 영역) — 클릭 시 닫힘 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onBackdropClick} />

      {/* 모달 카드 박스 - 중세 길드 테마 */}
      <div
        className="relative z-10 w-[90vw] max-w-md rounded-lg bg-gradient-to-b from-[#6b4e2f] to-[#5a3e25] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#8b6f47] overflow-hidden"
        onClick={(e) => e.stopPropagation()} // 카드 내부 클릭 시 닫힘 방지
      >
        {/* 금속 장식 테두리 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />

        {/* 헤더 영역: 제목 + 닫기 버튼 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#4a3420] relative">
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
          <h3 id="auth-modal-title" className="text-lg font-black text-[#f4d7aa] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            ⚔️ {title}
          </h3>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="rounded-lg p-2 text-[#d4a574] hover:bg-[#4a3420] hover:text-[#f4d7aa] transition-all"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* 본문: 입력 폼 */}
        <form className="px-5 py-5 space-y-4" onSubmit={handleSubmit}>
          {/* 에러 메시지 박스 (있는 경우에만 노출) */}
          {error && (
            <div role="alert" aria-live="polite" className="mb-1 rounded-lg bg-red-900/40 text-red-200 text-xs px-3 py-2 border border-red-700/50 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* 이메일 입력 */}
          <label className="block">
            <span className="block text-sm text-[#d4a574] mb-1.5 font-bold">📧 이메일</span>
            <input
              id="auth-email"
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border-2 border-[#4a3420] bg-[#3a2818] px-4 py-2.5 text-sm text-[#f4d7aa] placeholder-[#8b6f47] outline-none focus:ring-2 focus:ring-[#c9a961]/50 focus:border-[#8b6f47] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              disabled={loading}
            />
          </label>

          {/* 비밀번호 입력 + 표시/숨김 토글 + CapsLock 안내 */}
          <label className="block">
            <span className="block text-sm text-[#d4a574] mb-1.5 font-bold">🔑 비밀번호</span>
            <div className="relative">
              <input
                id="auth-password"
                ref={passwordRef}
                type={showPw ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsOn((e as React.KeyboardEvent<HTMLInputElement>).getModifierState?.("CapsLock") || false)}
                aria-invalid={!isPasswordValid}
                aria-describedby="password-help"
                className={`w-full rounded-lg border-2 bg-[#3a2818] px-4 py-2.5 text-sm text-[#f4d7aa] placeholder-[#8b6f47] outline-none focus:ring-2 focus:ring-[#c9a961]/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] ${
                  !isPasswordValid && password.length > 0 ? "border-red-700/70" : "border-[#4a3420] focus:border-[#8b6f47]"
                }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-3 my-auto text-xs text-[#8b6f47] hover:text-[#d4a574] font-medium transition-colors"
                tabIndex={-1}
              >
                {showPw ? "숨김" : "표시"}
              </button>
            </div>
            <small id="password-help" className="block mt-1.5 text-xs text-[#8b6f47]">
              {isSignup ? "6자 이상, 회원가입 시 비밀번호 확인이 필요합니다." : "6자 이상 입력해 주세요."}
            </small>
            {capsOn && (
              <div className="mt-1 text-xs text-[#c9a961] font-medium">⚠️ Caps Lock이 켜져 있습니다.</div>
            )}
          </label>

          {/* 회원가입 모드일 때만 비밀번호 확인 입력란 노출 */}
          {isSignup && (
            <label className="block">
              <span className="block text-sm text-[#d4a574] mb-1.5 font-bold">🔐 비밀번호 확인</span>
              <div className="relative">
                <input
                  id="auth-password-confirm"
                  ref={confirmRef}
                  type={showPwConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={!isConfirmValid}
                  className={`w-full rounded-lg border-2 bg-[#3a2818] px-4 py-2.5 text-sm text-[#f4d7aa] placeholder-[#8b6f47] outline-none focus:ring-2 focus:ring-[#c9a961]/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] ${
                    !isConfirmValid && confirm.length > 0 ? "border-red-700/70" : "border-[#4a3420] focus:border-[#8b6f47]"
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwConfirm((v) => !v)}
                  className="absolute inset-y-0 right-3 my-auto text-xs text-[#8b6f47] hover:text-[#d4a574] font-medium transition-colors"
                  tabIndex={-1}
                >
                  {showPwConfirm ? "숨김" : "표시"}
                </button>
              </div>
            </label>
          )}

          {/* 액션 영역: 로그인 유지(로그인 모드에서만) + 모드 전환 + 제출 */}
          <div className="pt-3 flex flex-col gap-4">
            {/* 로그인 모드일 때만 '로그인 유지' 체크박스 표시 */}
            {(!isSignup) && (
              <label className="inline-flex items-center gap-2 text-sm text-[#d4a574] select-none font-medium">
                <input
                  type="checkbox"
                  className="rounded border-[#4a3420] bg-[#3a2818] text-[#c9a961] focus:ring-[#c9a961]/50"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                />
                로그인 유지
              </label>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-sm font-black tracking-wide hover:from-[#9b7f57] hover:to-[#7b5e3f] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !isFormValid}
            >
              {loading ? "⏳ 처리 중..." : `⚔️ ${cta}`}
            </button>

            {/* 모드 전환(회원가입 ↔ 로그인) */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  const next = isSignup ? "login" : "signup";
                  setMode(next);
                  setError(null);
                  onSwitchMode?.(next);
                }}
                className="text-sm text-[#c9a961] hover:text-[#f4d7aa] disabled:opacity-50 font-medium transition-colors"
                disabled={loading}
              >
                {isSignup ? "이미 계정이 있으신가요? 로그인" : "아직 회원이 아니신가요? 회원가입"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}