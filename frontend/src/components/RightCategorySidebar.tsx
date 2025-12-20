/**
 * 우측 카테고리 사이드바 (우드톤 테마 적용)
 * - 데스크톱(lg 이상): 우측 sticky 사이드바
 * - 모바일: 별도 컴포넌트에서 렌더링
 */

import FolderImg from "@/assets/ui/folder.png";
import useCategory from "@/store/useCategory";
import { rightCategories } from "@/data/mock";

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
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "group w-full rounded-2xl px-2.5 py-2.5",
        "flex flex-col items-center gap-1.5",
        "transition-all duration-200",
        "active:scale-[0.99]",
        "outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a961]/50 focus-visible:ring-offset-0",
        active
          ? [
              "bg-[linear-gradient(180deg,rgba(244,234,220,0.95)_0%,rgba(233,214,186,0.78)_100%)]",
              "text-[#3a2818]",
              "ring-1 ring-[#c9a961]/45",
              "shadow-[0_10px_22px_rgba(58,40,24,0.18),inset_0_1px_0_rgba(255,255,255,0.55)]",
            ].join(" ")
          : [
              "bg-[rgba(253,248,241,0.55)]",
              "text-[#5a3f28]/80",
              "ring-1 ring-[#d1b07a]/25",
              "hover:bg-[rgba(244,234,220,0.70)] hover:text-[#2f2012]",
              "hover:ring-[#c9a961]/35",
              "hover:shadow-[0_10px_22px_rgba(58,40,24,0.12),inset_0_1px_0_rgba(255,255,255,0.45)]",
            ].join(" "),
      ].join(" ")}
      title={label}
    >
      <div className="relative">
        {/* 선택 상태일 때 은은한 광원 */}
        <span
          className={[
            "pointer-events-none absolute inset-0 -z-10 rounded-full blur-[10px] transition-opacity duration-200",
            active ? "opacity-100 bg-[#c9a961]/35" : "opacity-0 group-hover:opacity-60 bg-[#d1b07a]/25",
          ].join(" ")}
        />
        <img
          src={FolderImg}
          alt=""
          className={[
            "w-10 transition duration-200",
            active
              ? "brightness-110 drop-shadow-[0_6px_12px_rgba(58,40,24,0.22)]"
              : "opacity-90 group-hover:opacity-100",
          ].join(" ")}
        />
      </div>

      <span className="text-[11px] leading-4 whitespace-nowrap font-semibold tracking-tight">
        {label}
      </span>

      {/* 하단 인디케이터 */}
      <span
        className={[
          "mt-0.5 h-[2px] w-8 rounded-full transition-all duration-200",
          active ? "bg-[#6b4e2f]/70" : "bg-transparent group-hover:bg-[#8b6f47]/35",
        ].join(" ")}
      />
    </button>
  );
}

export default function RightCategorySidebar() {
  const current = useCategory((s) => s.current);
  const setCurrent = useCategory((s) => s.setCurrent);

  return (
    <aside className="hidden lg:block col-span-2">
      <div className="sticky top-24 z-[1]">
        {/* ✅ 오른쪽 정렬 느낌을 살려 margin-left:auto */}
        <div className="relative ml-auto w-[150px]">
          {/* 배경 패널 (우드톤 + 결 텍스처) */}
          <div
            className="
              absolute -z-10 top-4 bottom-3 left-0 right-0
              rounded-3xl
              bg-[linear-gradient(180deg,rgba(253,248,241,0.92)_0%,rgba(244,234,220,0.74)_55%,rgba(239,224,207,0.64)_100%),repeating-linear-gradient(90deg,rgba(107,78,47,0.06)_0,rgba(107,78,47,0.06)_2px,transparent_2px,transparent_14px)]
              ring-1 ring-[#d1b07a]/28
              shadow-[0_18px_40px_rgba(58,40,24,0.12),inset_0_1px_0_rgba(255,255,255,0.6)]
              backdrop-blur-[1px]
            "
          />

          {/* 상단 금빛 라인 */}
          <div className="pointer-events-none absolute left-6 right-6 top-5 h-px bg-gradient-to-r from-transparent via-[#c9a961]/55 to-transparent" />

          {/* 카테고리 리스트 */}
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