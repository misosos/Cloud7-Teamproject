import type { OfficialDexItem } from "@/types/type"; // 아이템(업적) 데이터의 타입 정보
import plaqueAchieved from "@/assets/ui/achievement-complete.png";   // 업적 달성 시 보여줄 이미지
import plaqueLocked from "@/assets/ui/achievement-incomplete.png";   // 업적 미달성 시 보여줄 이미지

export default function WoodPlaque({ item }: { item: OfficialDexItem }) {
  // 업적 달성 여부에 따라 보여줄 이미지를 선택합니다.
  const imgSrc = item.achieved ? plaqueAchieved : plaqueLocked;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[160px] md:w-[180px] aspect-[3/4]">
        <img
          src={imgSrc}
          alt={item.achieved ? "업적 달성" : "업적 미달성"}
          className="absolute inset-0 w-full h-full object-contain p-2 drop-shadow-sm select-none pointer-events-none texture-tone "
        />
      </div>
      <div className="mt-3 text-center text-[14px] md:text-[15px] font-medium text-stone-800 leading-tight">
        • {item.title}
      </div>
    </div>
  );
}