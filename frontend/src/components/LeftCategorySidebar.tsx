/**
 * 좌측 카테고리 사이드바 (기획/디자인 동료용 설명)
 * ─────────────────────────────────────────────────────────
 * 목적: "취향기록" 화면에서 사용자가 보고 싶은 카테고리를 고르는 영역입니다.
 *       선택된 카테고리는 전역 상태로 공유되어, 같은 페이지의 목록/그리드가 그 값에 맞춰 필터링됩니다.
 *
 * 화면 구조 요약
 *  - 모바일(~lg 미만): 상단에 4x2 그리드(8칸) 버튼으로 카테고리를 고릅니다.
 *  - 데스크톱(lg 이상): 화면 왼쪽에 세로형 사이드바 버튼 리스트가 고정(sticky)되어 보입니다.
 *
 * 데이터 소스
 *  - allCategories: 모바일 그리드에 표시할 전체 카테고리 목록
 *  - leftCategories: 데스크톱 사이드바에 표시할 대표(요약) 카테고리 목록
 *
 * 상태 공유 (중요)
 *  - useCategory(Zustand 전역 스토어)를 통해
 *    • current: 현재 선택된 카테고리 값
 *    • setCurrent: 카테고리 변경 함수
 *    를 모든 관련 컴포넌트가 함께 사용합니다.
 *
 * 동작 방식
 *  - 사용자가 버튼을 누르면 setCurrent가 호출되어 current 값이 바뀝니다.
 *  - 이 값 변화를 보고, 같은 페이지의 다른 영역(예: 콘텐츠 목록)이 자동으로 갱신됩니다.
 *
 * 접근성(스크린리더 등)
 *  - 모바일 그리드 버튼에는 현재 선택됨을 aria-current="page"로 표시합니다.
 *  - 폴더 아이콘 이미지는 장식용이라 alt=""(빈 문자열)로 설정합니다.
 */

// 폴더 아이콘 이미지 (장식용)
import FolderImg from "@/assets/ui/folder.png";
// 전역 스토어: 현재 카테고리 값과 변경 함수를 제공합니다.
import useCategory from "@/store/useCategory";
// 화면에 뿌릴 카테고리 목록(모바일 전체/데스크톱 요약)
import { leftCategories, allCategories } from "@/data/mock";

/**
 * SidebarButton: 카테고리 버튼 하나를 그리는 작은 컴포넌트
 * - label: 사용자에게 보여줄 카테고리명 (텍스트)
 * - active: 현재 선택된 상태인지 여부 (선택 시 색상/효과가 달라집니다)
 * - onClick: 버튼을 눌렀을 때 실행할 동작(보통 setCurrent)
 */
function SidebarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <>
      {/*
        버튼 스타일 가이드
        - 전체 너비를 사용하고, 아이콘-텍스트를 세로로 배치합니다.
        - active(선택됨)일 때는 진한 색으로 강조, 아닐 때는 hover 시만 색이 진해집니다.
      */}
      <button
        onClick={onClick}
        className={`w-full flex flex-col items-center gap-1.5 py-2 transition ${
          active ? "text-amber-900" : "text-stone-600 hover:text-stone-800"
        }`}
      >
        {/*
          폴더 아이콘 (장식용)
          - 선택(active)일 때: 살짝 더 밝고, 부드러운 빛 번짐 효과(드롭섀도) 적용
          - 비선택일 때: 약간 투명
        */}
        <img
          src={FolderImg}
          alt="" // 장식용 이미지이므로 스크린리더에서 읽지 않게 빈 문자열 사용
          className={`w-11 transition ${
            active
              ? "brightness-110 drop-shadow-[0_0_6px_rgba(255,200,0,0.45)]"
              : "opacity-85"
          }`}
        />
        {/* 카테고리 텍스트 (작고 촘촘한 글줄 간격) */}
        <span className="text-[11px] leading-4 whitespace-nowrap">{label}</span>
      </button>
    </>
  );
}

/**
 * LeftCategorySidebar: 좌측 카테고리 사이드바의 메인 컴포넌트
 * - current: 현재 선택된 카테고리 값
 * - setCurrent: 사용자가 선택을 바꿀 때 호출하는 함수
 */
export default function LeftCategorySidebar() {
  const current = useCategory((s) => s.current);
  const setCurrent = useCategory((s) => s.setCurrent);

  return (
    <>
      {/*
        [모바일 레이아웃]
        - lg 미만에서만 보입니다. (lg 이상에서는 데스크톱 사이드바가 보임)
        - 4열 그리드로 최대 8개(2행) 버튼을 배치합니다.
        - 현재 선택된 카테고리는 배경/윤곽선/그림자 등으로 강조합니다.
      */}
      <div className="lg:hidden mx-auto max-w-screen-sm px-4 pt-3 pb-2">
        <div className="grid grid-cols-4 gap-2">
          {allCategories.map((l) => (
            <button
              key={l}
              onClick={() => setCurrent(l)}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition ring-1
                ${
                  current === l
                    ? "bg-amber-200/80 text-amber-900 ring-amber-400 shadow-sm"
                    : "bg-stone-200/70 text-stone-700 ring-stone-300 hover:bg-stone-300"
                }`}
              aria-current={current === l ? "page" : undefined}
            >
              {/* 아이콘은 모바일에서는 조금 더 작게 표시합니다. */}
              <img
                src={FolderImg}
                alt=""
                className={`w-6 h-6 ${current === l ? "brightness-110" : "opacity-85"}`}
              />
              {/* 카테고리명 텍스트 */}
              <span className="text-[11px] leading-4 text-center">{l}</span>
            </button>
          ))}
        </div>
      </div>

      {/*
        [데스크톱 레이아웃]
        - lg 이상에서 보이는 좌측 사이드바입니다.
        - sticky: 사용자가 스크롤해도 지정한 위치(top-24)에 고정되어 따라옵니다.
        - 뒤쪽에 얇은 배경 패널을 깔아 카드처럼 보이게 합니다.
      */}
      <aside className="hidden lg:block col-span-2">
        {/* 스크롤해도 특정 위치에 고정되는 sticky 레이아웃 */}
        <div className="sticky top-24 z-[1]">
          {/* 사이드바의 배경 패널 (얇고 둥근 모서리 스타일) */}
          <div className="relative ml-0 w-[132px]">
            <div
              className="
                absolute -z-10 top-5 bottom-3 left-0 right-0
                rounded-2xl
                bg-[rgba(232,224,208,0.78)]
                ring-1 ring-stone-300/60
                shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_22px_rgba(80,50,0,0.12)]
                backdrop-blur-[1px]
              "
            />
            {/*
              카테고리 리스트 렌더링
              - leftCategories: 데스크톱에서 주로 쓰는 대표 카테고리 목록만 보여줍니다.
              - 각 항목은 SidebarButton으로 렌더링하며, 현재 선택 상태(active)를 전달합니다.
            */}
            <div className="flex flex-col gap-2 px-3 py-6">
              {leftCategories.map((l) => (
                <SidebarButton
                  key={l}
                  label={l}
                  active={current === l}
                  onClick={() => setCurrent(l)}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}