import FolderImg from "@/assets/ui/folder.png";
import { leftCategories, rightCategories } from "@/data/mock";
import useCategory from "@/store/useCategory";

/**
 * MobileCategoryGrid (모바일 전용 카테고리 그리드)
 * ─────────────────────────────────────────────────────────
 * 목적: 모바일 화면에서 사용자가 보고 싶은 "카테고리"를 고르는 UI입니다.
 *
 * 동작 개요
 *  - 버튼을 탭하면 전역 상태의 카테고리 값(current)이 변경됩니다.
 *  - 같은 페이지의 리스트/그리드 컴포넌트는 이 값을 보고 자동으로 필터링됩니다.
 *
 * 데이터 소스
 *  - leftCategories: 상단 4칸에 배치할 카테고리 목록
 *  - rightCategories: 하단 4칸에 배치할 카테고리 목록
 *    → 합쳐서 4x2 형태(총 8개)로 보이도록 구성했습니다.
 *
 * 반응형 기준
 *  - 이 컴포넌트는 "모바일 전용"입니다. (Tailwind: lg 이상에서 숨김)
 *    데스크톱에서는 LeftCategorySidebar가 대신 노출됩니다.
 */
export default function MobileCategoryGrid() {
  // 전역 카테고리 상태의 "변경 함수"만 가져옵니다.
  // ※ 버튼을 누르면 setCurrent(label)로 현재 카테고리를 바꾸게 됩니다.
  const setCurrent = useCategory((s) => s.setCurrent);

  /**
   * CategoryButton: 단일 카테고리 버튼
   * - label: 버튼에 표시할 카테고리명
   * - onClick: 탭 시 전역 카테고리(current)를 해당 label로 바꿈
   *
   * 접근성
   * - 아이콘은 장식용이므로 alt=""로 설정(스크린리더가 읽지 않도록)
   */
  const CategoryButton = ({ label }: { label: string }) => (
    <button
      onClick={() => setCurrent(label)}
      className="flex flex-col items-center gap-0.5"
    >
      {/* 폴더 아이콘 (장식용 이미지) */}
      <img src={FolderImg} alt="" className="w-11" />
      {/* 카테고리명 텍스트 */}
      <span className="text-[11px] leading-tight text-stone-700">{label}</span>
    </button>
  );

  return (
    // lg 이상(데스크톱 크기)에서는 숨기고, 모바일/태블릿에서만 노출합니다.
    <section className="lg:hidden mt-4 mb-8">
      {/* 중앙 최대 폭을 제한하고 좌우 여백을 줘서 가독성을 높입니다. */}
      <div className="mx-auto max-w-screen-sm px-4">
        {/* 얇은 구분선: 위/아래 영역을 시각적으로 나눠줍니다. */}
        <div className="mt-2 h-px bg-stone-300/70" />

        {/* 안내문구: 사용자가 무엇을 해야 하는지 한 줄로 전달합니다. */}
        <p className="mt-6 text-center text-stone-400 text-sm">기록을 보려면 카테고리를 클릭하세요</p>

        {/* 상단 4개: 4열 그리드(각 칸 중앙정렬), 간격은 gap-1.5 */}
        <ul className="mt-6 grid grid-cols-4 place-items-center gap-1.5">
          {leftCategories.map((c) => (
            <li key={c}>
              <CategoryButton label={c} />
            </li>
          ))}
        </ul>

        {/* 하단 4개: 동일한 4열 그리드로 배치합니다. */}
        <ul className="mt-5 grid grid-cols-4 place-items-center gap-1.5">
          {rightCategories.map((c) => (
            <li key={c}>
              <CategoryButton label={c} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}