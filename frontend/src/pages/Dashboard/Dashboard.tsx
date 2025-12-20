// 이 페이지는 로그인 후 사용자가 접근하는 대시보드 화면으로,
// 다양한 카테고리와 콘텐츠를 한 눈에 모아보는 역할을 함

/**
 * Dashboard (로그인 후 메인 화면)
 * - 로직/구조 유지
 * - Warm Oak 팔레트 적용
 * - ✅ CTA 버튼: 이모지 제거 + FontAwesome 아이콘 + 테마 스타일 적용
 * - (주의) TasteInsights 내부에서 섹션 타이틀 제거한 버전 기준
 */

import HeaderNav from "@/components/HeaderNav";
import LeftCategorySidebar from "@/components/LeftCategorySidebar";
import RightCategorySidebar from "@/components/RightCategorySidebar";
import RecordGallery from "@/pages/Dashboard/RecordGallery";
import MobileCategoryGrid from "@/components/MobileCategoryGrid";
import TasteInsights from "@/pages/Dashboard/TasteInsights";
import { Link } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";

// Warm Oak
const BG = "#F7F0E6";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND2 = "#8B6F47";

export default function Dashboard() {
  return (
    <div
      className="min-h-screen pb-[72px] md:pb-0 relative overflow-hidden"
      style={{ background: BG, color: TEXT }}
    >
      {/* (선택) 배경 결 은은하게. 싫으면 이 블록 3개 지워도 됨 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(107,78,47,0.05) 0px, rgba(107,78,47,0.05) 18px, rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 36px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(201,169,97,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_85%,rgba(107,78,47,0.14),transparent_55%)]" />

      <div className="relative">
        {/* 1) 헤더 */}
        <HeaderNav authButtons="full" />

        {/* 2) 인사이트 + CTA */}
        <section className="mx-auto max-w-[1160px] px-4 sm:px-6 mt-6 md:mt-8 mb-8 md:mb-12 lg:mb-16">
          {/* ✅ TasteInsights는 내부 타이틀이 없고, 첫 카드가 헤더 역할 */}
          <TasteInsights />

          <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/nearby"
              className="
                inline-flex items-center justify-center gap-2 rounded-xl
                px-4 py-2.5 text-sm font-black tracking-wide
                transition
                outline-none focus:outline-none
                focus-visible:ring-2 focus-visible:ring-offset-2
                active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)]
              "
              style={{
                background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                color: "#ffffff",
                border: `1px solid rgba(201,169,97,0.30)`,
                boxShadow:
                  "0 10px 24px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "linear-gradient(180deg, #9B7F57, #7B5E3F)";
                (e.currentTarget as HTMLElement).style.border =
                  "1px solid rgba(201,169,97,0.45)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = `linear-gradient(180deg, ${BRAND2}, ${MUTED})`;
                (e.currentTarget as HTMLElement).style.border =
                  "1px solid rgba(201,169,97,0.30)";
              }}
            >
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(201,169,97,0.28)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
                aria-hidden="true"
              >
                <FontAwesomeIcon icon={faLocationDot} />
              </span>

              <span>내 주변 놀거리 추천</span>
            </Link>
          </div>
        </section>

        {/* 3) 모바일 전용 카테고리 그리드 */}
        <section className="mx-auto max-w-[1160px] px-4 sm:px-6 mt-4 md:mt-6 lg:mt-8">
          <MobileCategoryGrid />
        </section>

        {/* 4) 본문 12컬럼 */}
        <main className="mx-auto max-w-[1160px] px-4 sm:px-6 grid grid-cols-12 gap-6 sm:gap-8 xl:gap-12 mt-10 md:mt-12">
          <div className="hidden lg:block col-span-2 xl:-translate-x-4 2xl:-translate-x-6 mt-24">
            <LeftCategorySidebar />
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-16 md:space-y-20 xl:space-y-28">
            <RecordGallery />
          </div>

          <div className="hidden lg:block col-span-2 xl:translate-x-4 2xl:translate-x-6 mt-24">
            <RightCategorySidebar />
          </div>
        </main>

        {/* 5) 푸터 */}
        <footer
          className="mt-20 py-10 text-center text-xs font-medium"
          style={{ color: BRAND2 }}
        >
          © {new Date().getFullYear()} 취향도감. All rights reserved.
        </footer>
      </div>
    </div>
  );
}