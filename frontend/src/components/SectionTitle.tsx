// React의 PropsWithChildren 타입을 사용하여 자식 요소를 포함하는 컴포넌트의 props 타입을 정의합니다.
import type { PropsWithChildren } from "react";

/**
 * SectionTitle (섹션 제목 컴포넌트)
 * ─────────────────────────────────────────────────────────
 * 목적: 화면의 특정 구역(섹션)에 제목과 얇은 구분선을 함께 보여줍니다.
 *       리스트/그리드/카드 묶음 등 위에 붙는 소제목 용도로 사용합니다.
 *
 * ▸ 언제 쓰나요?
 *   <SectionTitle>최근 기록</SectionTitle>
 *   <SectionTitle>탐험가 연맹</SectionTitle>
 *
 * ▸ props 설명
 *   - children: 제목으로 표시할 텍스트(또는 아이콘+텍스트 등 간단한 요소)
 *
 * ▸ 디자인을 바꾸고 싶을 때(디자이너/기획자 참고)
 *   - 글자 크기: className의 `text-lg` (예: 더 크게 하려면 `text-xl`)
 *   - 굵    기: `font-semibold` (보통= `font-medium`, 더 굵게= `font-bold`)
 *   - 자 간 간 격: `tracking-tight` (기본= 제거, 더 넓게= `tracking-wide`)
 *   - 글자 색상: `text-stone-800` (더 연하게= `text-stone-600` 등)
 *   - 구 분 선: 아래 `span`의 `h-px`(두께 1px), `bg-stone-300/80`(선 색/투명도), `mt-2`(제목과 선 사이 간격)
 *
 * ▸ 접근성(간단히)
 *   - 시맨틱 태그 `h2`를 사용합니다. 페이지의 최상위 제목은 보통 `h1`이므로,
 *     이 컴포넌트는 보통 하위 섹션 제목 용도로 사용하세요.
 */
export default function SectionTitle({ children }: PropsWithChildren) {
  return (
    <>
      {/**
       * [제목 + 구분선 묶음]
       * - 아래 className에 들어있는 유틸리티 클래스 의미:
       *   · text-lg        : 기본 텍스트보다 조금 큰 제목 크기
       *   · font-semibold  : 굵게(세미볼드)
       *   · tracking-tight : 글자 간격을 약간 좁게
       *   · text-stone-800 : 진한 회색(거의 검정에 가까운 톤)
       */}
      <h2 className="text-lg font-semibold tracking-tight text-stone-800">
        {/** children: 컴포넌트를 감쌀 때 안쪽에 적은 텍스트/요소가 여기 표시됩니다. */}
        {children}
        {/**
         * 아래 `span`은 얇은 가로선(구분선) 역할을 합니다.
         * - block  : 줄 바꿈되어 한 줄 전체를 차지
         * - h-px   : 높이 1px → 얇은 선
         * - w-full : 가용 너비 전체
         * - bg-stone-300/80 : 밝은 회색 선(불투명도 80%)
         * - mt-2   : 제목과 선 사이에 간격(위쪽 여백) 0.5rem
         */}
        <span className="block h-px w-full bg-stone-300/80 mt-2" />
      </h2>
    </>
  );
}