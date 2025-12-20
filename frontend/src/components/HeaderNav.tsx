import { useState, useEffect } from "react";
import SignupModal from "@/components/SignupModal";
import NotificationBell from "@/components/NotificationBell";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/authStore";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // 프로필 이미지 라이트박스 모달
  const [showProfileLightbox, setShowProfileLightbox] = useState(false);

  // ----- 전역 Auth 스토어 연동 -----
  const user = useAuth((s: any) => s.session?.user ?? s.user ?? null);
  const bootstrap = useAuth((s: any) => s.bootstrap);
  const logout = useAuth((s: any) => s.logout);
  const logoutServer = useAuth((s: any) => s.logoutServer) as
    | undefined
    | (() => Promise<void>);

  const handleLogout = async () => {
    try {
      if (typeof logoutServer === "function") {
        await logoutServer();
      } else {
        await Promise.resolve(logout());
      }
      await bootstrap().catch(() => {});
    } catch (e) {
      console.warn("logout error:", e);
    } finally {
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
          className={`relative px-2 py-0.5 text-[13px] md:text-sm text-[#6B4E2F]/45 cursor-not-allowed ${className}`}
        >
          {children}
        </button>
      );
    }
    return (
      <Link
        to={to}
        className={`relative px-2 py-0.5 text-[13px] md:text-sm text-[#2B1D12]/85 hover:text-[#2B1D12] transition ${className}`}
      >
        {children}
        <span className="pointer-events-none absolute -bottom-1 left-2 right-2 h-[2px] scale-x-0 bg-[#C9A961]/70 origin-left transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
      </Link>
    );
  };

  // 로그인 성공 시, 로그인 전 화면에 머물러 있으면 대시보드로 자동 이동
  useEffect(() => {
    if (!user) return;
    if (location.pathname === "/" || location.pathname.startsWith("/before-login")) {
      navigate("/dashboard", { replace: true });
    }
    setMobileNavOpen(false);
  }, [user, location.pathname, navigate]);

  // 로그아웃(세션 만료 포함) 후 보호 페이지에 남아있는 케이스 방지
  useEffect(() => {
    if (user) return;
    const needAuth = ["/dashboard", "/취향기록"];
    if (needAuth.some((p) => location.pathname.startsWith(p))) {
      setMobileNavOpen(false);
      navigate("/before-login", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return (
    <>
      {/* 헤더 바 */}
      <header className="sticky top-0 z-30 mb-6 md:mb-8">
        <nav
          className="relative
            bg-[linear-gradient(180deg,rgba(247,240,230,0.92)_0%,rgba(255,255,255,0.55)_55%,rgba(247,240,230,0.82)_100%),repeating-linear-gradient(90deg,rgba(107,78,47,0.06)_0,rgba(107,78,47,0.06)_2px,transparent_2px,transparent_12px)]
            backdrop-blur supports-[backdrop-filter]:bg-[linear-gradient(180deg,rgba(247,240,230,0.78)_0%,rgba(255,255,255,0.48)_55%,rgba(247,240,230,0.68)_100%)]
            border-b border-[#C9A961]/30
            shadow-[0_10px_28px_rgba(74,52,32,0.10)]
            animate-[fadeDown_.45s_ease-out]"
        >
          {/* 상단 골드 하이라이트 라인 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A961]/60 to-transparent" />
          {/* 하단 딥우드 라인 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#4A3420]/20 to-transparent" />

          <div className="mx-auto max-w-6xl px-5 h-14 md:h-16 flex items-center gap-3">
            {/* 좌측 로고 */}
            {lockLogo ? (
              <span
                className="flex items-center gap-2 min-w-0 select-none cursor-not-allowed"
                title="로그인 후 이용 가능합니다"
              >
                <span
                  className="text-[15px] md:text-[16px] font-extrabold tracking-tight
                    text-transparent bg-clip-text
                    bg-[linear-gradient(180deg,#2B1D12_0%,#6B4E2F_60%,#8B6F47_100%)]"
                >
                  취향도감
                </span>
              </span>
            ) : (
              <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 min-w-0">
                <span
                  className="text-[15px] md:text-[16px] font-extrabold tracking-tight
                    text-transparent bg-clip-text
                    bg-[linear-gradient(180deg,#2B1D12_0%,#6B4E2F_60%,#8B6F47_100%)]"
                >
                  취향도감
                </span>
              </Link>
            )}

            {/* 중앙 네비 (데스크톱) */}
            <div className={`hidden md:flex flex-1 justify-center ${lockNav ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-30 md:gap-14 lg:gap-16">
                <div className="group">
                  <NavItem to="/취향기록">취향기록</NavItem>
                </div>
                <div className="group">
                  <NavItem to="/guild">탐험가연맹</NavItem>
                </div>
              </div>
            </div>

            {/* 우측 로그인/로그아웃 영역 + 모바일 메뉴 버튼 */}
            <div className="ml-auto flex items-center gap-2 md:gap-3">
              {user ? (
                <>
                  <NotificationBell />

                  {/* 프로필 이미지 */}
                  {user?.profileImage ? (
                    <button
                      type="button"
                      onClick={() => setShowProfileLightbox(true)}
                      className="hidden md:block w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#C9A961]/35 hover:ring-[#C9A961]/70 transition-all cursor-pointer"
                      title="프로필 이미지 크게 보기"
                    >
                      <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="hidden md:flex w-8 h-8 rounded-full bg-[rgba(255,255,255,0.55)] items-center justify-center text-[#6B4E2F] text-sm font-bold ring-2 ring-[#C9A961]/25">
                      {(user?.name || user?.email || "U")[0].toUpperCase()}
                    </div>
                  )}

                  {/* 닉네임(이름) 우선 표시, 없으면 이메일 */}
                  <span
                    className="hidden md:inline text-sm text-[#2B1D12]/70 truncate max-w-[120px] font-semibold"
                    title={user?.email ?? ""}
                  >
                    {(user?.name || user?.email || "사용자") + " 님"}
                  </span>

                  <button
                    onClick={handleLogout}
                    className="hidden md:inline-flex items-center text-sm px-3 py-1.5 rounded-md
                      ring-1 ring-[#C9A961]/30 text-[#2B1D12]/85
                      hover:bg-[rgba(255,255,255,0.55)] transition"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  {authButtons === "none" ? null : authButtons === "loginOnly" ? (
                    <button
                      onClick={openLogin}
                      className="hidden md:inline-flex items-center gap-1 text-sm px-3.5 py-1.5 rounded-md
                        bg-gradient-to-b from-[#8B6F47] to-[#6B4E2F]
                        text-[#fff7ed] hover:from-[#9b7f57] hover:to-[#7b5e3f]
                        active:scale-[0.99]
                        shadow-[0_10px_22px_rgba(74,52,32,0.18),inset_0_1px_0_rgba(255,255,255,0.20)]
                        ring-1 ring-[#C9A961]/25 transition"
                    >
                      로그인
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={openSignup}
                        className="hidden md:inline-flex items-center text-sm px-3 py-1.5 rounded-md
                          ring-1 ring-[#C9A961]/30 text-[#2B1D12]/85
                          hover:bg-[rgba(255,255,255,0.55)] transition"
                      >
                        회원가입
                      </button>
                      <button
                        onClick={openLogin}
                        className="hidden md:inline-flex items-center gap-1 text-sm px-3.5 py-1.5 rounded-md
                          bg-gradient-to-b from-[#8B6F47] to-[#6B4E2F]
                          text-[#fff7ed] hover:from-[#9b7f57] hover:to-[#7b5e3f]
                          active:scale-[0.99]
                          shadow-[0_10px_22px_rgba(74,52,32,0.18),inset_0_1px_0_rgba(255,255,255,0.20)]
                          ring-1 ring-[#C9A961]/25 transition"
                      >
                        로그인
                      </button>
                    </>
                  )}
                </>
              )}

              {/* 모바일 전용 로그인/로그아웃 버튼 */}
              {user ? (
                <>
                  {user?.profileImage ? (
                    <button
                      type="button"
                      onClick={() => setShowProfileLightbox(true)}
                      className="md:hidden w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#C9A961]/35 hover:ring-[#C9A961]/70 transition-all"
                      title="프로필 이미지 크게 보기"
                    >
                      <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="md:hidden w-7 h-7 rounded-full bg-[rgba(255,255,255,0.55)] flex items-center justify-center text-[#6B4E2F] text-xs font-bold ring-2 ring-[#C9A961]/25">
                      {(user?.name || user?.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="md:hidden inline-flex items-center text-xs px-2.5 py-1.5 rounded-md
                      ring-1 ring-[#C9A961]/30 text-[#2B1D12]/85
                      hover:bg-[rgba(255,255,255,0.55)] transition"
                  >
                    로그아웃
                  </button>
                </>
              ) : authButtons !== "none" ? (
                <button
                  onClick={openLogin}
                  className="md:hidden inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md
                    bg-gradient-to-b from-[#8B6F47] to-[#6B4E2F]
                    text-[#fff7ed] hover:from-[#9b7f57] hover:to-[#7b5e3f]
                    active:scale-[0.99]
                    shadow-[0_10px_18px_rgba(74,52,32,0.18),inset_0_1px_0_rgba(255,255,255,0.18)]
                    ring-1 ring-[#C9A961]/25 transition"
                >
                  로그인
                </button>
              ) : null}

              {/* 모바일 메뉴 토글 버튼 */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md
                  border border-[#C9A961]/30 bg-[rgba(255,255,255,0.45)] text-[#2B1D12]
                  shadow-[0_8px_18px_rgba(74,52,32,0.10)] active:scale-[0.97] transition"
                aria-label="메뉴 열기"
                onClick={() => setMobileNavOpen((prev) => !prev)}
              >
                <span className="sr-only">메뉴 열기</span>
                <span className="flex flex-col gap-0.5">
                  <span
                    className={`block w-4 h-[2px] rounded bg-[#2B1D12] transition-transform ${
                      mobileNavOpen ? "translate-y-[3px] rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`block w-4 h-[2px] rounded bg-[#2B1D12] transition-opacity ${
                      mobileNavOpen ? "opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`block w-4 h-[2px] rounded bg-[#2B1D12] transition-transform ${
                      mobileNavOpen ? "-translate-y-[3px] -rotate-45" : ""
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          {/* 모바일 네비게이션 (슬라이드다운) */}
          <div
            className={`md:hidden border-t border-[#C9A961]/25
              bg-[linear-gradient(180deg,rgba(247,240,230,0.95)_0%,rgba(255,255,255,0.55)_100%)]
              backdrop-blur-sm overflow-hidden transition-[max-height,opacity] duration-200 ${
                mobileNavOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
          >
            <div className="mx-auto max-w-6xl px-5 py-2 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  if (lockNav) onOpenAuth?.("login");
                  else navigate("/취향기록");
                }}
                className={`flex items-center justify-between px-2 py-2 rounded-md text-[13px] font-semibold ${
                  lockNav
                    ? "text-[#6B4E2F]/45 cursor-not-allowed"
                    : "text-[#2B1D12] hover:bg-[rgba(255,255,255,0.55)] active:bg-[rgba(201,169,97,0.18)]"
                }`}
              >
                <span>취향기록</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  if (lockNav) onOpenAuth?.("login");
                  else navigate("/guild");
                }}
                className={`flex items-center justify-between px-2 py-2 rounded-md text-[13px] font-semibold ${
                  lockNav
                    ? "text-[#6B4E2F]/45 cursor-not-allowed"
                    : "text-[#2B1D12] hover:bg-[rgba(255,255,255,0.55)] active:bg-[rgba(201,169,97,0.18)]"
                }`}
              >
                <span>탐험가연맹</span>
              </button>
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
              await bootstrap();
            } catch {}
            setOpen(false);
            navigate("/dashboard", { replace: true });
          }}
        />
      )}

      {/* 프로필 이미지 라이트박스 모달 */}
      {showProfileLightbox && user?.profileImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowProfileLightbox(false)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowProfileLightbox(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1 transition"
            >
              닫기
            </button>

            <div className="rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20">
              <img
                src={user.profileImage}
                alt={`${user.name || user.email}님의 프로필`}
                className="max-w-[80vw] max-h-[80vh] object-contain"
              />
            </div>

            <div className="mt-4 text-center">
              <p className="text-white font-bold text-lg">{user.name || user.email}</p>
              {user.name && user.email && <p className="text-white/60 text-sm mt-1">{user.email}</p>}

              {user.provider === "kakao" && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-[#FEE500] text-[#000000] text-xs font-bold">
                  <svg width="12" height="12" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M9 0C4.02944 0 0 3.13401 0 7C0 9.38756 1.55732 11.4691 3.93478 12.6354L2.93217 16.5627C2.84739 16.9069 3.2353 17.1744 3.52577 16.9644L8.14068 13.8679C8.42298 13.8893 8.70959 13.9 9 13.9C13.9706 13.9 18 10.766 18 6.9C18 3.13401 13.9706 0 9 0Z"
                      fill="#000000"
                    />
                  </svg>
                  카카오 계정
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}