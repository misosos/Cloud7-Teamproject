import type { OfficialDexItem } from "@/types/type";
import plaqueAchieved from "@/assets/ui/achievement-complete.png";
import plaqueLocked from "@/assets/ui/achievement-incomplete.png";

export default function Achievement({ item }: { item: OfficialDexItem }) {
  const imgSrc = item.achieved ? plaqueAchieved : plaqueLocked;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[160px] md:w-[180px] aspect-[3/4]">
        <img
          src={imgSrc}
          alt={item.achieved ? "업적 달성" : "업적 미달성"}
          className="absolute inset-0 w-full h-full object-contain p-2 drop-shadow-sm select-none pointer-events-none texture-tone"
        />
      </div>

      <div
        className="
          mt-3 text-center text-[14px] md:text-[15px] font-semibold leading-tight
          text-[#2B1D12]
        "
      >
        {item.title}
      </div>
    </div>
  );
}