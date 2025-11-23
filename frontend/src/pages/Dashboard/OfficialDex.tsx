// src/sections/OfficialDex.tsx
import SectionTitle from "@/components/SectionTitle";
import { officialDexLatest } from "@/data/mock";
import WoodPlaque from "@/components/Achievement";

/**
 * OfficialDex (공식 도감 업적 섹션)
 * ─────────────────────────────────────────────────────────
 * 목적: 서비스에서 제공하는 "공식 업적"(도감 항목)을 작은 액자 카드 형태로 모아 보여줍니다.
 *      사용자는 여기서 최근/대표 업적들을 한눈에 확인할 수 있습니다.
 *
 * ▸ 화면 구성
 *   1) 섹션 제목(SectionTitle) — "공식도감 업적"
 *   2) 업적 카드 그리드 — WoodPlaque 카드 여러 개를 격자로 배치
 *
 * ▸ 데이터 소스
 *   - officialDexLatest: 더미(mock) 데이터에서 최신/대표 업적 목록을 가져옵니다.
 *     · 각 항목은 WoodPlaque가 사용하는 필드(예: achieved, title 등)를 포함합니다.
 *
 * ▸ 표시 개수
 *   - 현재는 앞에서부터 8개만 보여주도록 slice(0, 8) 처리했습니다.
 *     · 더 많이/적게 보이게 하려면 slice 범위를 조정하세요. (예: slice(0, 12))
 *
 * ▸ 반응형(그리드)
 *   - 모바일/태블릿: 2열(grid-cols-2)
 *   - 데스크톱(md 이상): 4열(md:grid-cols-4)
 *   - gap-x/gap-y: 카드들 사이의 가로/세로 간격을 뜻합니다.
 *
 * ▸ 용어
 *   - WoodPlaque: "액자" 모양의 업적 카드 컴포넌트 (달성/미달성에 따라 다른 이미지를 보여줌)
 */
export default function OfficialDex() {
  return (
    // 섹션 전체 래퍼: 아래쪽 여백을 넉넉하게 두어 다음 섹션과 구분합니다.
    <section className="mb-20">
      {/* 1) 섹션 제목 — 디자인/문구는 SectionTitle 컴포넌트에서 조정 가능 */}
      <SectionTitle>공식도감 업적</SectionTitle>

      {/*
        2) 업적 카드 그리드
        - mt-6: 제목과 그리드 사이 상단 여백
        - grid grid-cols-2: 기본 2열 그리드 (모바일/태블릿)
        - md:grid-cols-4: 데스크톱에서 4열로 확장
        - gap-x-10 gap-y-10: 카드 사이의 가로/세로 간격
      */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-10">
        {/*
          officialDexLatest에서 앞쪽 8개만 노출
          - 데이터 개수에 따라 더 적게/많게 보여주고 싶으면 slice 범위를 조절하세요.
        */}
        {officialDexLatest.slice(0, 8).map((it) => (
          // WoodPlaque: 업적 하나를 "액자 카드"로 표현하는 컴포넌트
          //  - key: 리스트 렌더링 최적화를 위한 고유값(각 업적의 id)
          //  - item: 해당 업적 데이터(달성 여부, 제목 등)
          <WoodPlaque key={it.id} item={it} />
        ))}
      </div>
    </section>
  );
}