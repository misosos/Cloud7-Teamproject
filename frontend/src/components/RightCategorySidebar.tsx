/**
 * 우측 카테고리 사이드바 (기획/디자인/QA 동료용 설명)
 * ─────────────────────────────────────────────────────────
 * 목적: "취향기록" 화면의 오른쪽 영역에서, 사용자가 보고 싶은 카테고리를 고르는 UI입니다.
 *       선택한 카테고리는 전역 상태로 공유되어 콘텐츠 목록/그리드가 자동으로 필터링됩니다.
 *
 * 화면 구조 요약
 *  - 데스크톱(lg 이상): 이 컴포넌트가 오른쪽(col-span-2)에 세로 버튼 리스트로 고정(sticky) 노출
 *  - 모바일(~lg 미만): 모바일 전용 그리드가 따로 있습니다.
 *    ※ 모바일 그리드는 LeftCategorySidebar/MobileCategoryGrid에서 렌더링하며, 중복 방지를 위해 여기서는 렌더하지 않습니다.
 *
 * 데이터 소스
 *  - rightCategories: 우측 사이드바에서 보여줄 카테고리 목록 (요약/대표 셋)
 *
 * 상태 공유(중요)
 *  - useCategory(Zustand 전역 스토어)
 *    • current    : 현재 선택된 카테고리 값
 *    • setCurrent : 카테고리 변경 함수
 *  - 버튼을 누르면 setCurrent가 호출되어 current 값이 바뀌고, 같은 페이지의 다른 영역이 자동 갱신됩니다.
 *
 * 접근성/이미지 처리
 *  - 폴더 아이콘 이미지는 장식용이므로 alt=""(빈 문자열)로 설정하여 스크린리더가 읽지 않도록 합니다.
 *
 * 스타일 가이드(요약)
 *  - 선택(active)된 항목은 텍스트 색상/밝기/드롭 섀도우로 강조합니다.
 *  - sticky top-24: 스크롤해도 상단에서 24px 아래 위치에 고정됩니다.
 */

import FolderImg from "@/assets/ui/folder.png"; // 폴더(카테고리) 아이콘 이미지
import useCategory from "@/store/useCategory"; // 전역 카테고리 상태(현재값/변경함수)
import { rightCategories } from "@/data/mock"; // 우측 사이드바에 노출할 카테고리 목록

/**
 * SidebarButton: 카테고리 버튼 하나를 그리는 소형 컴포넌트
 * - label : 사용자에게 보여줄 카테고리 이름
 * - active: 현재 선택된 상태인지 여부 (선택 시 스타일 강조)
 * - onClick: 버튼 클릭 시 실행할 동작(보통 setCurrent(label))
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
      {/* 선택된 카테고리는 강조 색상, 나머지는 hover 시 색 변화 */}
      <button
        onClick={onClick}
        className={`w-full flex flex-col items-center gap-1.5 py-2 transition ${
          active ? "text-amber-900" : "text-stone-600 hover:text-stone-800"
        }`}
      >
        {/*
          폴더 아이콘 (장식용)
          - active일 때: 살짝 더 밝게, 은은한 빛 번짐 효과(드롭 섀도우) 적용
          - 비활성: 약간 투명
          - alt="" : 장식 목적이므로 스크린리더에서 읽지 않도록 빈 문자열
        */}
        <img
          src={FolderImg}
          alt=""
          className={`w-11 transition ${
            active
              ? "brightness-110 drop-shadow-[0_0_6px_rgba(255,200,0,0.45)]"
              : "opacity-85"
          }`}
        />
        {/* 카테고리 텍스트: 한 줄로 짧게, 글줄 간격을 타이트하게 */}
        <span className="text-[11px] leading-4 whitespace-nowrap">{label}</span>
      </button>
    </>
  );
}

/**
 * RightCategorySidebar: 우측 카테고리 사이드바 메인 컴포넌트
 * - current    : 현재 선택된 카테고리 (전역 상태)
 * - setCurrent : 카테고리 변경 함수(버튼 클릭 시 호출)
 */
export default function RightCategorySidebar() {
  const current = useCategory((s) => s.current);
  const setCurrent = useCategory((s) => s.setCurrent);

  return (
    // 데스크톱(lg 이상)에서만 보이는 사이드바. 그리드에서 오른쪽 2칸(col-span-2)을 차지합니다.
    <aside className="hidden lg:block col-span-2">
      {/* sticky: 스크롤해도 상단에서 24px 아래(top-24) 위치에 고정 */}
      <div className="sticky top-24 z-[1]">
        {/* 얇은 배경 패널: 살짝 들어간 카드 느낌(둥근 모서리 + 내부/외부 그림자) */}
        <div className="relative mr-0 w-[132px]">
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

          {/* 카테고리 버튼 리스트 렌더링 */}
          <div className="flex flex-col gap-2 px-3 py-6">
            {rightCategories.map((l) => (
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
  );
}