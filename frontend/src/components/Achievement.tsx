/**
 * WoodPlaque (우드 액자) 컴포넌트
 * ─────────────────────────────────────────────────────────
 * 목적: “업적(도감 항목)”을 액자 스타일로 보여주는 작은 카드 UI입니다.
 *      (완료/미완료에 따라 다른 이미지를 보여줍니다)
 *
 * ▸ 이 컴포넌트가 받는 데이터(Props)
 *   - item: OfficialDexItem 타입의 객체
 *     • item.achieved (boolean) : 업적 달성 여부 (true=달성, false=미달성)
 *     • item.title    (string)  : 업적 이름/제목 (카드 하단 캡션으로 표시)
 *   ※ 실제로 이 컴포넌트에서 사용하는 필드는 위 2개이며,
 *     OfficialDexItem 내부에 다른 정보가 있어도 여기서는 사용하지 않습니다.
 *
 * ▸ 이미지 교체/브랜드 작업 시
 *   - 아래 import 된 두 이미지 파일만 교체하면 됩니다.
 *     (achievement-complete.png = 달성, achievement-incomplete.png = 미달성)
 *
 * ▸ 레이아웃 요약
 *   - 3:4 비율의 세로형 액자 영역을 만들고, 그 안에 이미지를 맞춰 넣습니다.
 *   - 하단에는 업적 제목(캡션)을 중앙 정렬로 표시합니다.
 */

import type { OfficialDexItem } from "@/types/type"; // 아이템(업적) 데이터의 타입 정보
import plaqueAchieved from "@/assets/ui/achievement-complete.png";   // 업적 달성 시 보여줄 이미지
import plaqueLocked from "@/assets/ui/achievement-incomplete.png";   // 업적 미달성 시 보여줄 이미지

// WoodPlaque: 상단 설명 참고
export default function WoodPlaque({ item }: { item: OfficialDexItem }) {
  // 업적 달성 여부에 따라 보여줄 이미지를 선택합니다.
  const imgSrc = item.achieved ? plaqueAchieved : plaqueLocked;

  return (
    // 전체 카드(세로 정렬, 가운데 정렬)
    <div className="flex flex-col items-center">
      {/*
        [액자 이미지 표시 영역]
        - 고정 비율(aspect-ratio) 3:4로 세로형 액자 느낌을 유지합니다.
        - width는 화면 크기에 따라 160px(모바일) / 180px(데스크탑)로 표시합니다.
        - 내부에 들어갈 이미지는 아래 <img> 태그에서 object-contain으로 비율 유지합니다.
      */}
      <div className="relative w-[160px] md:w-[180px] aspect-[3/4]">
        {/*
          실제 액자 이미지(달성/미달성)
          - alt: 화면 읽기 도구(스크린리더) 사용자에게 상황을 설명합니다.
          - object-contain: 이미지가 잘리지 않도록 액자 영역 안에 맞춤
          - drop-shadow-sm: 얕은 그림자로 약간 입체감
          - select-none / pointer-events-none: 사용자가 이미지 선택/클릭 못 하게 함 (장식용 요소)
          - texture-tone: (프로젝트 공통 클래스) 질감/톤 효과가 필요할 때 사용
        */}
        <img
          src={imgSrc}
          alt={item.achieved ? "업적 달성" : "업적 미달성"}
          className="absolute inset-0 w-full h-full object-contain p-2 drop-shadow-sm select-none pointer-events-none texture-tone "
        />
      </div>

      {/*
        [캡션(제목) 영역]
        - 업적의 제목을 보여줍니다. (가독성을 위해 약간 크게, 중앙 정렬)
        - 앞의 점(•)은 목록/뱃지 느낌을 주기 위한 장식입니다.
      */}
      <div className="mt-3 text-center text-[14px] md:text-[15px] font-medium text-stone-800 leading-tight">
        • {item.title}
      </div>
    </div>
  );
}