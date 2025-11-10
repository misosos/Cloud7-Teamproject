// src/sections/PersonalDex.tsx
import SectionTitle from "@/components/SectionTitle";
import { personalChallenges } from "@/data/mock";
import medal from "@/assets/ui/medal-small.png";

/**
 * PersonalDex (개인도감 섹션)
 * ─────────────────────────────────────────────────────────
 * 목적: 사용자가 스스로 진행 중인 개인 챌린지/과제의 "진척도"를 막대(Progress Bar)로 보여줍니다.
 *      각 항목은 제목과 함께 현재 달성 비율(%)을 시각화합니다.
 *
 * ▸ 화면 구성
 *   1) 섹션 제목(SectionTitle) — "개인도감"
 *   2) 개인 챌린지 목록 — 각 항목에 메달 아이콘 + 제목 + 진행 바 + 퍼센트 텍스트
 *
 * ▸ 데이터 소스
 *   - personalChallenges: 더미(mock) 데이터. 항목 구조 예)
 *       { id: string, title: string, progress: number(0~1) }
 *     · progress는 0~1 사이의 값이므로, 화면에서는 ×100 후 반올림해서 %로 표기합니다.
 *
 * ▸ 디자이너/기획자 가이드
 *   - 진행 바(색/높이/모서리)는 아래 Tailwind 클래스에서 조정합니다.
 *     · 바 배경: `h-3 w-full bg-stone-200 rounded-full`
 *     · 채움(진행도): `h-full bg-amber-500 transition-all`
 *   - 퍼센트 텍스트 문구/색상은 마지막 `div`의 클래스/텍스트를 변경하세요.
 *   - 메달 아이콘은 장식용입니다. (접근성 개선 시 alt 속성/aria-hidden 처리 논의 가능)
 *
 * ▸ 접근성/표현 메모
 *   - 진행 바는 색만으로 정보를 전달하므로, 퍼센트 텍스트(숫자)를 함께 표기해 대비 이슈를 보완합니다.
 */
export default function PersonalDex() {
  return (
    // 섹션 여백: 위쪽은 넉넉히 띄우고(mt-28), 아래쪽도 다음 섹션과 간격 확보(mb-44)
    <section className="mt-28 mb-44">
      {/* 섹션 제목: 공용 컴포넌트 사용(스타일/선 포함) */}
      <SectionTitle>개인도감</SectionTitle>

      {/* 항목 리스트: 위아래 간격을 일정하게(space-y-10) 배치 */}
      <div className="mt-12 space-y-10">
        {personalChallenges.map((p) => {
          // progress(0~1)를 %로 변환하여 소수점 반올림
          const percent = Math.round(p.progress * 100);

          return (
            <div key={p.id}>
              {/* 제목 영역: 메달 아이콘 + 제목 텍스트 */}
              <div className="mb-3 flex items-center gap-3 text-base text-stone-800">
                {/* 메달 아이콘(장식용): 시각적 포인트. 접근성 개선 시 alt/aria 속성 추가 검토 */}
                <img src={medal} className="h-5" />
                <span>{p.title}</span>
              </div>

              {/* 진행 바(Progress Bar) */}
              <div className="h-3 w-full bg-stone-200 rounded-full overflow-hidden">
                {/* 채워지는 부분: width를 percent%로 설정하여 진행도를 시각화 */}
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* 숫자 표기: 색상은 부드러운 회색, 크기는 작게 */}
              <div className="mt-2 text-xs text-stone-500">{percent}% 달성</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}