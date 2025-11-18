import { useState, useEffect } from "react";
import SignupModal from "@/components/SignupModal";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";

/**
 * 헤더 내비게이션 컴포넌트
 * - 중앙에 메인 메뉴가 위치함
 * - 우측에는 로그인/회원가입 또는 로그아웃 표시
 * - 전역 auth 스토어(useAuth)와 연동 (로컬스토리지 직접관리 제거)
 */

type HeaderNavProps = {
  lockNav?: boolean;
  lockLogo?: boolean;
  onOpenAuth?: (mode: "login" | "signup") => void;
  /** 비로그인 상태에서 헤더 우측 버튼 표시 방식 */
  authButtons?: "full" | "loginOnly" | "none"; // 기본값은 full
};

export default function HeaderNav({
  lockNav = false,
  lockLogo = false,
  onOpenAuth,
  authButtons = "full",
}: HeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // 인증 모달
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // ----- 전역 Auth 스토어 연동 -----
  // 세션 사용자 (session?.user | user 어느 쪽이든 대응)
  const user = useAuth((s: any) => s.session?.user ?? s.user ?? null);
  const bootstrap = useAuth((s: any) => s.bootstrap);
  const logout = useAuth((s: any) => s.logout);
  // 서버 세션까지 정리하는 액션이 있으면 우선 사용
  const logoutServer = useAuth((s: any) => s.logoutServer) as undefined | (() => Promise<void>);

  const handleLogout = async () => {
    try {
      if (typeof logoutServer === "function") {
        await logoutServer();
      } else {
        // fallback
        await Promise.resolve(logout());
      }
      // 서버/스토어 상태를 반드시 최신화해서 user=null 보장
      await bootstrap().catch(() => {});
    } catch (e) {
      console.warn("logout error:", e);
    } finally {
      // 보호 라우터가 세션을 감지해 리다이렉트하도록 보조적으로 이동
      navigate("/before-login", { replace: true });
    }
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
          aria-disabled={true}
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

  // 로그인 성공 시, 로그인 전 화면에 머물러 있으면 대시보드로 자동 이동
  // (헤더가 로그인 전 레이아웃에서도 렌더링될 때 대비)
  useEffect(() => {
    if (!user) return;
    if (location.pathname === "/" || location.pathname.startsWith("/before-login")) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // 로그아웃(세션 만료 포함) 후 보호 페이지에 남아있는 케이스 방지
  useEffect(() => {
    if (user) return;
    // 프로젝트 보호 경로들 필요 시 추가
    const needAuth = ["/dashboard", "/취향기록"];
    if (needAuth.some((p) => location.pathname.startsWith(p))) {
      navigate("/before-login", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return (
    <>
      {/* 헤더 바 */}
      <header className="sticky top-0 z-30 mb-6 md:mb-8">
        <nav className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-stone-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="mx-auto max-w-6xl px-5 h-14 md:h-16 flex items-center gap-4">
            {/* 좌측 로고 */}
            {lockLogo ? (
              <span
                className="flex items-center gap-2 min-w-0 select-none cursor-not-allowed"
                title="로그인 후 이용 가능합니다"
              >
                <span className="text-[15px] md:text-[16px] font-semibold tracking-tight text-stone-900">취향도감</span>
              </span>
            ) : (
              <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 min-w-0">
                <span className="text-[15px] md:text-[16px] font-semibold tracking-tight text-stone-900">취향도감</span>
              </Link>
            )}

            {/* 중앙 네비 */}
            <div className={`hidden md:flex flex-1 justify-center ${lockNav ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-8">
                <div className="group">
                  <NavItem to="/취향기록">취향기록</NavItem>
                </div>
                <div className="group">
                  <NavItem to="#">탐험가연맹</NavItem>
                </div>
                <div className="group">
                  <NavItem to="#">취향합치기</NavItem>
                </div>
                <div className="group">
                  <NavItem to="#">랜덤탐험미션</NavItem>
                </div>
              </div>
            </div>

            {/* 우측 로그인/로그아웃 영역 */}
            <div className="ml-auto flex items-center gap-3">
              {user ? (
                <>
                  <span
                    className="hidden md:inline text-sm text-stone-600 truncate max-w-[160px]"
                    title={user?.email ?? ""}
                  >
                    {(user?.email ?? "") + " 님"}
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

      {/* 통합 인증 모달 (부모에서 onOpenAuth 안 넘겨주면 자체 표출) */}
      {!onOpenAuth && (
        <SignupModal
          open={open}
          initialMode={authMode}
          onClose={() => setOpen(false)}
          onSwitchMode={(m: "login" | "signup") => setAuthMode(m)}
          onSuccess={async () => {
            try {
              // 1) 서버 세션(login/register) 수립 직후 스토어 최신화
              await bootstrap();
            } catch {}
            // 2) 모달 닫기
            setOpen(false);
            // 3) 로그인 완료 후 기본 랜딩으로 이동 (프로젝트에 맞게 경로 조정)
            navigate("/dashboard", { replace: true });
          }}
        />
      )}
    </>
  );
}