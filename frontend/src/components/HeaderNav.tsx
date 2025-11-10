import { useEffect, useState } from "react";
import SignupModal from "@/components/SignupModal";
import { Link } from "react-router-dom";

/**
 * 헤더 내비게이션 컴포넌트
 * - 중앙에 메인 메뉴가 위치함
 * - 우측에는 로그인/회원가입 또는 로그아웃 표시
 * - SignupModal과 상태를 연동하여 로그인 상태를 표기
 */

type HeaderNavProps = {
  lockNav?: boolean;
  lockLogo?: boolean;
  onOpenAuth?: (mode: "login" | "signup") => void;
  /** 비로그인 상태에서 헤더 우측 버튼 표시 방식 */
  authButtons?: "full" | "loginOnly" | "none"; // 기본값은 full
};

export default function HeaderNav({ lockNav = false, lockLogo = false, onOpenAuth, authButtons = "full" }: HeaderNavProps) {
  const STORAGE_KEY = "auth_user";

  // 모달 열림/모드 상태
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // 로그인 사용자 상태
  const [user, setUser] = useState<{ email: string; [k: string]: any } | null>(null);

  // remember(ON) → localStorage, OFF → sessionStorage
  useEffect(() => {
    try {
      const rawLocal = localStorage.getItem(STORAGE_KEY);
      const rawSession = sessionStorage.getItem(STORAGE_KEY);
      const raw = rawLocal ?? rawSession;
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  // 전역 이벤트 수신 (모달/다른 컴포넌트에서 브로드캐스트)
  useEffect(() => {
    const handleLogin = (e: Event) => {
      const detail = (e as CustomEvent).detail as { email: string; [k: string]: any };
      if (detail && typeof detail.email === "string") setUser(detail);
    };
    const handleLogout = () => setUser(null);

    window.addEventListener("auth:login", handleLogin);
    window.addEventListener("auth:logout", handleLogout);
    return () => {
      window.removeEventListener("auth:login", handleLogin);
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, []);

  // 탭 간 동기화 (다른 탭에서 로그인/로그아웃 시 반영)
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== STORAGE_KEY) return;
      try {
        if (ev.newValue) setUser(JSON.parse(ev.newValue));
        else setUser(null);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } catch {}
    window.dispatchEvent(new CustomEvent("auth:logout"));
  };

  const openLogin = () => {
    if (onOpenAuth) return onOpenAuth("login");
    setAuthMode("login");
    setOpen(true);
  };

  const openSignup = () => {
    if (onOpenAuth) return onOpenAuth("signup");
    setAuthMode("signup");
    setOpen(true);
  };

  // 중앙 네비 아이템
  const NavItem = ({
    children,
    to = "#",
    className = "",
  }: {
    children: React.ReactNode;
    to?: string;
    className?: string;
  }) => {
    if (lockNav) {
      return (
        <button
          type="button"
          onClick={() => onOpenAuth?.("login")}
          aria-disabled
          title="로그인 후 이용 가능합니다"
          className={`relative px-2 py-0.5 text-[13px] md:text-sm text-stone-400 cursor-not-allowed ${className}`}
        >
          {children}
        </button>
      );
    }
    return (
      <Link
        to={to}
        className={`relative px-2 py-0.5 text-[13px] md:text-sm text-stone-700/90 hover:text-stone-900 transition ${className}`}
      >
        {children}
        <span className="pointer-events-none absolute -bottom-1 left-2 right-2 h-[2px] scale-x-0 bg-stone-800/70 origin-left transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
      </Link>
    );
  };

  return (
    <>
      {/* 헤더 바 */}
      <header className="sticky top-0 z-30 mb-6 md:mb-8">
        <nav
          className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-stone-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        >
          <div className="mx-auto max-w-6xl px-5 h-14 md:h-16 flex items-center gap-4">
            {/* 좌측 로고 */}
            {lockLogo ? (
              <span className="flex items-center gap-2 min-w-0 select-none cursor-not-allowed" title="로그인 후 이용 가능합니다">
                <span className="text-[15px] md:text-[16px] font-semibold tracking-tight text-stone-900">취향도감</span>
              </span>
            ) : (
              <Link to="/" className="flex items-center gap-2 min-w-0">
                <span className="text-[15px] md:text-[16px] font-semibold tracking-tight text-stone-900">취향도감</span>
              </Link>
            )}

            {/* 중앙 네비 */}
            <div className={`hidden md:flex flex-1 justify-center ${lockNav ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-8">
                <div className="group"><NavItem to="/취향기록">취향기록</NavItem></div>
                <div className="group"><NavItem to="#">탐험가연맹</NavItem></div>
                <div className="group"><NavItem to="#">취향합치기</NavItem></div>
                <div className="group"><NavItem to="#">랜덤탐험미션</NavItem></div>
              </div>
            </div>

            {/* 우측 로그인/로그아웃 영역 */}
            <div className="ml-auto flex items-center gap-3">
              {user ? (
                <>
                  <span className="hidden md:inline text-sm text-stone-600 truncate max-w-[160px]" title={user.email}>
                    {user.email} 님
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-300 text-stone-700 hover:bg-stone-100 transition"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  {authButtons === "none" ? null : authButtons === "loginOnly" ? (
                    <button
                      onClick={openLogin}
                      className="inline-flex items-center gap-1 text-sm px-3.5 py-1.5 rounded-md bg-amber-800 text-amber-50 hover:bg-amber-900 active:scale-[0.99] shadow-[0_6px_14px_rgba(90,50,0,0.18)] ring-1 ring-amber-900/30 transition"
                    >
                      로그인
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={openSignup}
                        className="hidden md:inline-flex items-center text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-300 text-stone-700 hover:bg-stone-100 transition"
                      >
                        회원가입
                      </button>
                      <button
                        onClick={openLogin}
                        className="inline-flex items-center gap-1 text-sm px-3.5 py-1.5 rounded-md bg-amber-800 text-amber-50 hover:bg-amber-900 active:scale-[0.99] shadow-[0_6px_14px_rgba(90,50,0,0.18)] ring-1 ring-amber-900/30 transition"
                      >
                        로그인
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* 통합 인증 모달 */}
      {!onOpenAuth && (
        <SignupModal
          open={open}
          initialMode={authMode}
          onClose={() => setOpen(false)}
          onSwitchMode={(m: "login" | "signup") => setAuthMode(m)}
          onSuccess={(u) => {
            setUser(u);
            setOpen(false);
            // 저장은 모달에서 이미 처리됨 (remember에 따라 local/session)
          }}
        />
      )}
    </>
  );
}