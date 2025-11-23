// 이 페이지는 로그인 후 사용자가 접근하는 대시보드 화면으로,
// 다양한 카테고리와 콘텐츠를 한 눈에 모아보는 역할을 함

/**
 * Dashboard (로그인 후 메인 화면)
 * ─────────────────────────────────────────────────────────
 * 목적: 사용자가 로그인한 뒤 가장 먼저 보는 "요약 화면"입니다.
 *       히어로(대표 배너), 모바일 전용 카테고리 그리드, 중앙 콘텐츠(갤러리/도감),
 *       그리고 데스크톱 전용 좌/우 카테고리 사이드바로 구성되어 있습니다.
 *
 * ▸ 누가 보면 좋은가요?
 *   - 기획/디자인/QA 동료: 페이지가 어떤 블록으로 나뉘고,
 *     각 블록이 언제(모바일/데스크톱) 보이는지 한눈에 이해할 수 있습니다.
 *
 * ▸ 화면 구성(위에서 아래로)
 *   1) HeaderNav: 상단 고정 네비게이션(로그인 상태/메뉴/CTA)
 *   2) Hero: 상단 대표 섹션(배너)
 *   3) MobileCategoryGrid: 모바일에서만 보이는 4x2 카테고리 선택 그리드
 *   4) Main(12컬럼 그리드):
 *      - 좌측 사이드바(데스크톱 전용)
 *      - 중앙 콘텐츠(RecordGallery → OfficialDex → PersonalDex 순)
 *      - 우측 사이드바(데스크톱 전용)
 *   5) Footer: 저작권 표기
 *
 * ▸ 반응형 요약
 *   - 모바일/태블릿(< lg): 좌/우 사이드바 숨김, MobileCategoryGrid 노출
 *   - 데스크톱(≥ lg)     : 좌/우 사이드바 노출, MobileCategoryGrid는 내부에서 숨김
 *
 * ▸ 용어
 *   - 풀-블리드(Full-bleed): 좌우 패딩 없이 화면 전체 폭을 가득 채워 보이는 레이아웃
 *     (아래 Hero 섹션에서 w-screen + 음수 마진으로 구현)
 */

// NOTE: This page assumes routing is already protected by <ProtectedRoute>. No local auth-redirect.

// 상단 네비게이션과 페이지를 구성하는 하위 블록(섹션/컴포넌트)들
import HeaderNav from "@/components/HeaderNav";
import LeftCategorySidebar from "@/components/LeftCategorySidebar";
import RightCategorySidebar from "@/components/RightCategorySidebar";
import Hero from "@/sections/Hero";
import RecordGallery from "@/sections/RecordGallery";
import MobileCategoryGrid from "@/components/MobileCategoryGrid";

export default function Dashboard() {
  return (
    <div
      className={
        // 전체 페이지 설정
        // - min-h-screen : 화면 높이만큼 최소 높이 확보(푸터가 화면 중간에 붙지 않도록)
        // - text-stone-800 : 본문 기본 글자색(짙은 회색)
        // - pb-[72px] : 모바일에서 하단 고정 탭바가 있을 경우, 콘텐츠가 가려지지 않게 여백 확보
        //   · md:pb-0 : 태블릿/데스크톱에서는 일반 여백으로 복귀
        "min-h-screen text-stone-800 pb-[72px] md:pb-0"
      }
    >
      {/**
       * 1) 헤더 네비게이션
       *  - 로그인 후 화면이므로 CTA/메뉴를 모두 노출하도록 명시(authButtons="full")
       *  - 헤더 자체에서 로그인 상태(이메일/로그아웃 버튼 표시)도 처리합니다.
       */}
      <HeaderNav authButtons="full" />

      {/**
       * 2) 히어로(대표 배너)
       *  - 풀-블리드로 화면 전체 폭을 사용합니다.
       *    · w-screen : 화면 전체 너비
       *    · left-1/2 + -ml-[50vw] : 현재 컨테이너의 중앙을 기준으로 왼쪽으로 화면의 절반만큼 당겨서
       *      좌측 끝을 화면의 좌측 끝과 맞춥니다. 오른쪽도 같은 방식(-mr-[50vw]).
       *  - 위/아래 여백은 반응형으로 조금씩 증가합니다.
       */}
      <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-6 md:mt-8 mb-8 md:mb-12 lg:mb-16">
        <Hero />
      </section>

      {/**
       * 3) 모바일 전용 카테고리 그리드
       *  - 히어로 바로 아래에 배치하며, 중앙 최대 폭을 제한(max-w-[1160px])하고 좌우 패딩을 둡니다.
       *  - 실제로는 MobileCategoryGrid 컴포넌트 내부에서 lg 이상일 때는 숨김 처리됩니다.
       */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-6 mt-4 md:mt-6 lg:mt-8">
        <MobileCategoryGrid />
      </section>

      {/**
       * 4) 본문 12컬럼 레이아웃
       *  - 좌/우 사이드바(데스크톱 전용) + 중앙 콘텐츠로 구성합니다.
       *  - gap은 화면이 커질수록 조금씩 넓어집니다(sm → xl).
       */}
      <main className="mx-auto max-w-[1160px] px-4 sm:px-6 grid grid-cols-12 gap-6 sm:gap-8 xl:gap-12 mt-10 md:mt-12">
        {/**
         * 4-1) 왼쪽 사이드바 (데스크톱 전용)
         *  - hidden lg:block : 모바일/태블릿에서는 숨기고, 데스크톱에서만 표시
         *  - col-span-2      : 12컬럼 중 2칸을 차지
         *  - xl/2xl translate : 아주 넓은 화면에서 살짝 시각적 균형을 맞추기 위한 미세 이동
         *  - mt-24 : 히어로 아래 충분한 간격을 두고 시작
         */}
        <div className="hidden lg:block col-span-2 xl:-translate-x-4 2xl:-translate-x-6 mt-24">
          <LeftCategorySidebar />
        </div>

        {/**
         * 4-2) 중앙 콘텐츠
         *  - 모바일/태블릿에서는 12칸 전체(col-span-12), 데스크톱에서는 8칸(col-span-8)을 사용합니다.
         *  - 내부 섹션 간 간격(space-y-*)은 화면이 커질수록 넓어지도록 설정했습니다.
         *  - 표시 순서: 기록 갤러리 → 공식 도감(OfficialDex) → 개인 도감(PersonalDex)
         */}
        <div className="col-span-12 lg:col-span-8 space-y-16 md:space-y-20 xl:space-y-28">
          <RecordGallery />
        </div>

        {/**
         * 4-3) 오른쪽 사이드바 (데스크톱 전용)
         *  - 왼쪽과 대칭 구조. col-span-2로 2칸을 차지하고, 넓은 화면에서 살짝 오른쪽으로 이동
         *  - mt-24 : 히어로 아래 충분한 간격을 두고 시작
         */}
        <div className="hidden lg:block col-span-2 xl:translate-x-4 2xl:translate-x-6 mt-24">
          <RightCategorySidebar />
        </div>
      </main>

      {/**
       * 5) 푸터(하단 정보)
       *  - 현재 연도를 자동으로 표시합니다. (new Date().getFullYear())
       *  - 작은 글씨로 중앙 정렬
       */}
      <footer className="mt-20 py-10 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} 취향도감. All rights reserved.
      </footer>
    </div>
  );
}