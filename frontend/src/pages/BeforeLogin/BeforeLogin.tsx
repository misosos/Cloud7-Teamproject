/**
 * BeforeLogin (로그인 전 메인 화면)
 * - 로직 유지
 * - Warm Oak 팔레트 적용
 * - 이모지 제거 → FontAwesome(solid)
 */

import { useState, useEffect, useRef } from "react";
import HeaderNav from "@/components/HeaderNav";
import SignupModal from "@/components/SignupModal";
import { useNavigate } from "react-router-dom";
import { useAuth, useAuthGate } from "@/store/authStore";
import { AnimatePresence, motion } from "framer-motion";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookmark,
  faCompass,
  faShield,
  faFlag,
  faRightToBracket,
  faScroll,
} from "@fortawesome/free-solid-svg-icons";

const AFTER_LOGIN_PATH = "/dashboard";

// Warm Oak
const BG = "#F7F0E6";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const BRAND3 = "#4A3420";

export default function BeforeLogin() {
  const navigate = useNavigate();

  const { checking, isLoggedIn } = useAuthGate();
  const bootstrap = useAuth((s) => s.bootstrap);
  const setLoggedIn = useAuth((s) => s.setLoggedIn);

  const [open, setOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<"login" | "signup">("login");
  const handledAuthSuccess = useRef(false);

  const openAuth = (mode: "login" | "signup") => {
    setInitialMode(mode);
    setOpen(true);
  };

  useEffect(() => {
    if (checking) return;
    if (!isLoggedIn) return;
    navigate(AFTER_LOGIN_PATH, { replace: true });
  }, [checking, isLoggedIn, navigate]);

  const handleAuthSuccess = async (user: any) => {
    if (handledAuthSuccess.current) return;
    handledAuthSuccess.current = true;

    try {
      setLoggedIn(user as any);
    } catch (e) {
      console.error("setLoggedIn 호출 중 오류:", e);
    }

    try {
      await bootstrap();
    } catch (e) {
      console.error("로그인 후 bootstrap 중 오류:", e);
    }

    setOpen(false);
    navigate(AFTER_LOGIN_PATH, { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <div
            className="mx-auto h-10 w-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: MUTED, borderTopColor: "transparent" }}
          />
          <p className="mt-4 text-sm font-semibold" style={{ color: MUTED }}>
            로그인 상태를 확인하는 중...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ color: TEXT }}>
      {/* Warm Oak 배경 */}
      <div
        className="
          absolute inset-0
          bg-[repeating-linear-gradient(90deg,rgba(107,78,47,0.06)_0px,rgba(107,78,47,0.06)_18px,rgba(255,255,255,0.02)_18px,rgba(255,255,255,0.02)_36px)]
        "
        style={{ backgroundColor: BG }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,169,97,0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(107,78,47,0.18),transparent_55%)]" />
      <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.12)]" />

      <div className="relative">
        <HeaderNav lockNav lockLogo onOpenAuth={openAuth} authButtons="none" />

        <main className="mx-auto max-w-6xl px-5 pt-12 md:pt-16 pb-14">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="grid gap-8 md:grid-cols-[1.15fr_0.85fr] items-center"
          >
            {/* 좌: 히어로 */}
            <div className="relative">
              <div
                className="absolute -top-4 left-0 h-px w-40 bg-gradient-to-r from-transparent to-transparent"
                style={{ backgroundImage: `linear-gradient(90deg,transparent,${BRAND},transparent)` }}
              />
              <div
                className="absolute -bottom-4 right-0 h-px w-40 bg-gradient-to-r from-transparent to-transparent"
                style={{ backgroundImage: `linear-gradient(90deg,transparent,${MUTED},transparent)` }}
              />

              <div
                className="rounded-2xl backdrop-blur p-7 md:p-10 relative overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, rgba(255,255,255,0.62), rgba(255,255,255,0.28))`,
                  border: `1px solid rgba(201,169,97,0.35)`,
                  boxShadow: "0 18px 60px rgba(0,0,0,0.14)",
                }}
              >
                <div className="absolute inset-0 opacity-55 bg-[radial-gradient(circle_at_20%_0%,rgba(201,169,97,0.26),transparent_55%)]" />
                <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_at_90%_30%,rgba(107,78,47,0.18),transparent_58%)]" />

                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.45, ease: "easeOut" }}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
                    style={{
                      background: "rgba(255,255,255,0.40)",
                      border: "1px solid rgba(107,78,47,0.25)",
                      color: MUTED,
                    }}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: BRAND }} />
                    취향을 기록하고, 공유하고, 더 똑똑하게 추천받기
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.5, ease: "easeOut" }}
                    className="mt-4 text-3xl md:text-4xl font-black tracking-tight"
                    style={{ color: TEXT }}
                  >
                    취향도감
                    <span className="block mt-2 text-base md:text-lg font-semibold" style={{ color: MUTED }}>
                      당신의 취향을 정리해두는 공간
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                    className="mt-5 text-sm md:text-base leading-relaxed"
                    style={{ color: "rgba(43,29,18,0.82)" }}
                  >
                    로그인 후 대시보드에서 기록을 모아보고, 추천을 받고, 커뮤니티 활동까지 한 번에.
                    <br className="hidden md:block" />
                    시작하려면 아래에서 로그인/회원가입을 진행하세요.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.5, ease: "easeOut" }}
                    className="mt-7 grid gap-3 sm:grid-cols-3"
                  >
                    {[
                      { icon: faBookmark, title: "기록", desc: "나만의 취향 아카이브" },
                      { icon: faCompass, title: "추천", desc: "데이터 기반 추천" },
                      { icon: faShield, title: "길드", desc: "같이 즐기는 미션" },
                    ].map((x) => (
                      <div
                        key={x.title}
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: "rgba(255,255,255,0.40)",
                          border: "1px solid rgba(107,78,47,0.20)",
                        }}
                      >
                        <p className="text-xs font-black flex items-center gap-2" style={{ color: MUTED }}>
                          <FontAwesomeIcon icon={x.icon} style={{ color: MUTED }} />
                          {x.title}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "rgba(43,29,18,0.72)" }}>
                          {x.desc}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* 우: CTA */}
            <motion.aside
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.55, ease: "easeOut" }}
              className="rounded-2xl backdrop-blur p-7 md:p-8 relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(107,78,47,0.22)",
                boxShadow: "0 16px 50px rgba(0,0,0,0.12)",
              }}
            >
              <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(201,169,97,0.22),transparent_55%)]" />
              <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_90%_70%,rgba(107,78,47,0.16),transparent_58%)]" />

              <div className="relative">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  className="text-3xl"
                  style={{ color: MUTED }}
                  aria-hidden
                >
                  <FontAwesomeIcon icon={faFlag} />
                </motion.div>

                <h2 className="mt-3 text-lg font-black" style={{ color: TEXT }}>
                  지금 바로 시작하기
                </h2>
                <p className="mt-2 text-sm" style={{ color: "rgba(43,29,18,0.75)" }}>
                  로그인/회원가입 성공 시 자동으로 대시보드로 이동합니다.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <motion.button
                    type="button"
                    onClick={() => openAuth("login")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="
                      w-full px-6 py-3 rounded-xl
                      text-white text-sm font-black tracking-wide
                      inline-flex items-center justify-center gap-2
                      outline-none focus:outline-none
                      focus-visible:ring-2 focus-visible:ring-offset-2
                    "
                    style={{
                      background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                      border: "1px solid rgba(201,169,97,0.28)",
                      boxShadow: "0 10px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
                    }}
                    aria-label="로그인하기"
                  >
                    <FontAwesomeIcon icon={faRightToBracket} />
                    로그인
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => openAuth("signup")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="
                      w-full px-6 py-3 rounded-xl
                      text-sm font-black tracking-wide
                      inline-flex items-center justify-center gap-2
                      outline-none focus:outline-none
                      focus-visible:ring-2 focus-visible:ring-offset-2
                    "
                    style={{
                      background: `linear-gradient(180deg, ${BRAND3}, ${TEXT})`,
                      color: BG,
                      border: "1px solid rgba(107,78,47,0.35)",
                      boxShadow: "0 10px 26px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.10)",
                    }}
                    aria-label="회원가입하기"
                  >
                    <FontAwesomeIcon icon={faScroll} />
                    회원가입
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          </motion.section>
        </main>

        <footer className="mt-10 py-10 text-center relative">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-px"
            style={{ backgroundImage: `linear-gradient(90deg,transparent,${BRAND},transparent)` }}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-xs font-semibold"
            style={{ color: BRAND2 }}
          >
            © {new Date().getFullYear()} 취향도감. All rights reserved.
          </motion.p>
        </footer>

        <AnimatePresence>
          {open && (
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}