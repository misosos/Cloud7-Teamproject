/*
  SignupModal (통합 인증 모달)
  - 로직 동일
  - Warm Oak 팔레트 적용
  - FA 아이콘 유지
*/

import { useEffect, useMemo, useRef, useState } from "react";
import * as authService from "@/api/authService";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightToBracket,
  faUserPlus,
  faEnvelope,
  faKey,
  faEye,
  faEyeSlash,
  faTriangleExclamation,
  faXmark,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

type Props = {
  open: boolean;
  onClose: () => void;
  initialMode: "login" | "signup";
  onSuccess?: (user: { email: string; [k: string]: any }) => void;
  authenticate?: (args: {
    mode: "login" | "signup";
    email: string;
    password: string;
  }) => Promise<{ email: string; [k: string]: any }>;
  onSwitchMode?: (mode: "login" | "signup") => void;
};

// Warm Oak
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const DANGER = "#B42318";

export default function SignupModal({
  open,
  onClose,
  initialMode,
  onSuccess,
  authenticate,
  onSwitchMode,
}: Props) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [remember, setRemember] = useState(true);

  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const [capsOn, setCapsOn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);

  const isSignup = mode === "signup";
  const title = isSignup ? "회원가입" : "로그인";
  const cta = isSignup ? "계정 생성" : "로그인";

  const isEmailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const isPasswordValid = useMemo(() => password.trim().length >= 6, [password]);
  const isConfirmValid = useMemo(
    () => (isSignup ? confirm.trim().length >= 6 && confirm === password : true),
    [isSignup, confirm, password],
  );
  const isFormValid = isEmailValid && isPasswordValid && isConfirmValid;

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
      setTimeout(() => emailRef.current?.focus(), 0);
    }
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onBackdropClick = () => {
    if (!loading) onClose();
  };

  if (!open) return null;

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
      const fn = svc?.login || svc?.signIn || svc?.signin;
      if (typeof fn !== "function") {
        throw new Error("로그인 함수(login/signIn)가 services/auth.ts에 없습니다.");
      }
      result = fn.length <= 1 ? await fn(creds) : await fn(email, password);
    } else {
      const fn = svc?.register || svc?.signUp || svc?.signup || svc?.registerUser;
      if (typeof fn !== "function") {
        throw new Error("회원가입 함수(register/signUp)가 services/auth.ts에 없습니다.");
      }
      result = fn.length <= 1 ? await fn(creds) : await fn(email, password);
    }

    const user = result?.user ?? result?.data?.user ?? result;
    if (!user || !user.email) {
      throw new Error("서버가 유효한 사용자 정보를 반환하지 않았습니다.");
    }
    return user;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

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

      const authFn = typeof authenticate === "function" ? authenticate : fallbackAuthenticate;
      const user = await authFn({ mode, email, password });

      onSuccess?.(user);
      window.dispatchEvent(new CustomEvent("auth:login", { detail: user }));

      try {
        const store = remember ? localStorage : sessionStorage;
        store.setItem("auth_user", JSON.stringify(user));
      } catch {}

      const noConsumer = typeof onSuccess !== "function";
      if (noConsumer) {
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

  const ModeIcon = isSignup ? faUserPlus : faArrowRightToBracket;

  const inputBase =
    "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition " +
    "shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]";

  return (
    <div aria-modal="true" role="dialog" aria-labelledby="auth-modal-title" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onBackdropClick} />

      <div
        className="relative z-10 w-[92vw] max-w-md overflow-hidden rounded-2xl backdrop-blur"
        style={{
          background: SURFACE,
          boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* gold line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ backgroundImage: `linear-gradient(90deg,transparent,${BRAND},transparent)` }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ backgroundImage: `linear-gradient(90deg,transparent,${BRAND},transparent)` }} />

        {/* light blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl" style={{ background: "rgba(201,169,97,0.18)" }} />
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full blur-3xl" style={{ background: "rgba(107,78,47,0.12)" }} />

        {/* header */}
        <div className="relative flex items-center justify-between px-5 py-4">
          <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px" style={{ backgroundImage: `linear-gradient(90deg,transparent,rgba(107,78,47,0.25),transparent)` }} />

          <h3 id="auth-modal-title" className="text-lg font-black tracking-tight flex items-center gap-2" style={{ color: TEXT }}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.40)", border: "1px solid rgba(107,78,47,0.15)" }}>
              <FontAwesomeIcon icon={ModeIcon} style={{ color: MUTED }} />
            </span>
            {title}
          </h3>

          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 transition outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              color: MUTED,
            }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* body */}
        <form className="relative px-5 pb-6 pt-5 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl px-3 py-2 text-xs font-medium flex items-start gap-2"
              style={{
                background: "rgba(180,35,24,0.10)",
                color: DANGER,
                border: "1px solid rgba(180,35,24,0.20)",
              }}
            >
              <FontAwesomeIcon icon={faTriangleExclamation} className="mt-[1px]" />
              <span>{error}</span>
            </div>
          )}

          {/* email */}
          <label className="block">
            <span className="block text-sm mb-1.5 font-bold flex items-center gap-2" style={{ color: MUTED }}>
              <FontAwesomeIcon icon={faEnvelope} />
              이메일
            </span>
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              className={inputBase}
              style={{
                background: "rgba(255,255,255,0.55)",
                color: TEXT,
                border: "1px solid rgba(107,78,47,0.18)",
              }}
            />
          </label>

          {/* password */}
          <label className="block">
            <span className="block text-sm mb-1.5 font-bold flex items-center gap-2" style={{ color: MUTED }}>
              <FontAwesomeIcon icon={faKey} />
              비밀번호
            </span>

            <div className="relative">
              <input
                ref={passwordRef}
                type={showPw ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) =>
                  setCapsOn(
                    (e as React.KeyboardEvent<HTMLInputElement>).getModifierState?.("CapsLock") || false,
                  )
                }
                aria-invalid={!isPasswordValid}
                className={inputBase}
                disabled={loading}
                style={{
                  background: "rgba(255,255,255,0.55)",
                  color: TEXT,
                  border:
                    !isPasswordValid && password.length > 0
                      ? "1px solid rgba(180,35,24,0.30)"
                      : "1px solid rgba(107,78,47,0.18)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                className="absolute inset-y-0 right-2 my-auto h-9 w-9 rounded-xl transition"
                style={{ color: MUTED }}
              >
                <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} />
              </button>
            </div>

            <small className="block mt-1.5 text-xs" style={{ color: "rgba(107,78,47,0.80)" }}>
              {isSignup ? "6자 이상, 회원가입 시 비밀번호 확인이 필요합니다." : "6자 이상 입력해 주세요."}
            </small>

            {capsOn && (
              <div className="mt-1 text-xs font-medium flex items-center gap-2" style={{ color: MUTED }}>
                <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: BRAND }} />
                Caps Lock이 켜져 있습니다.
              </div>
            )}
          </label>

          {/* confirm */}
          {isSignup && (
            <label className="block">
              <span className="block text-sm mb-1.5 font-bold flex items-center gap-2" style={{ color: MUTED }}>
                <FontAwesomeIcon icon={faKey} />
                비밀번호 확인
              </span>

              <div className="relative">
                <input
                  ref={confirmRef}
                  type={showPwConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={!isConfirmValid}
                  className={inputBase}
                  disabled={loading}
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    color: TEXT,
                    border:
                      !isConfirmValid && confirm.length > 0
                        ? "1px solid rgba(180,35,24,0.30)"
                        : "1px solid rgba(107,78,47,0.18)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwConfirm((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPwConfirm ? "비밀번호 확인 숨기기" : "비밀번호 확인 표시"}
                  className="absolute inset-y-0 right-2 my-auto h-9 w-9 rounded-xl transition"
                  style={{ color: MUTED }}
                >
                  <FontAwesomeIcon icon={showPwConfirm ? faEyeSlash : faEye} />
                </button>
              </div>
            </label>
          )}

          <div className="pt-2 flex flex-col gap-4">
            {!isSignup && (
              <label className="inline-flex items-center gap-2 text-sm select-none font-medium" style={{ color: MUTED }}>
                <input
                  type="checkbox"
                  className="rounded"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                />
                로그인 유지
              </label>
            )}

            {/* submit */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="
                w-full py-3 rounded-xl
                text-white text-sm font-black tracking-wide
                inline-flex items-center justify-center gap-2
                transition
                disabled:opacity-50 disabled:cursor-not-allowed
                outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              "
              style={{
                background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                border: "1px solid rgba(201,169,97,0.28)",
                boxShadow: "0 10px 26px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  처리 중...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={ModeIcon} />
                  {cta}
                </>
              )}
            </button>

            {/* divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px" style={{ backgroundImage: `linear-gradient(90deg,transparent,rgba(107,78,47,0.25),transparent)` }} />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 font-medium" style={{ background: SURFACE, color: "rgba(107,78,47,0.80)" }}>
                  또는
                </span>
              </div>
            </div>

            {/* Kakao (브랜드 컬러 유지) */}
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/kakao";
              }}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#FEE500] text-[#000000] text-sm font-bold tracking-wide hover:bg-[#FDD800] transition shadow-[0_10px_22px_rgba(0,0,0,0.12)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 0C4.02944 0 0 3.13401 0 7C0 9.38756 1.55732 11.4691 3.93478 12.6354L2.93217 16.5627C2.84739 16.9069 3.2353 17.1744 3.52577 16.9644L8.14068 13.8679C8.42298 13.8893 8.70959 13.9 9 13.9C13.9706 13.9 18 10.766 18 6.9C18 3.13401 13.9706 0 9 0Z"
                  fill="#000000"
                />
              </svg>
              카카오로 {isSignup ? "시작하기" : "로그인"}
            </button>

            {/* switch */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  const next = isSignup ? "login" : "signup";
                  setMode(next);
                  setError(null);
                  onSwitchMode?.(next);
                }}
                disabled={loading}
                className="text-sm font-semibold transition disabled:opacity-50 underline underline-offset-4"
                style={{ color: MUTED, textDecorationColor: "rgba(201,169,97,0.55)" }}
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