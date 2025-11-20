export type OfficialDexItem = {
  id: string;            // 고유 식별자. 예: "achv_202"
  title: string;         // 업적 제목. 예: "주말 연속 3회 기록"
  achieved?: boolean;    // (선택) 달성 여부(true/false). 값이 없으면 미달성으로 간주 가능
};

// ─────────────────────────────────────────────────────────
// PersonalChallenge: "개인 도감"의 진행도(Progress) 항목 데이터 구조
//  - 화면 예: PersonalDex 섹션(막대그래프로 % 진행 표시)
//  - progress는 0~1 사이 숫자 → 화면에서는 ×100 후 반올림하여 %로 표기합니다.
export type PersonalChallenge = {
  id: string;            // 고유 식별자. 예: "pc_01"
  title: string;         // 챌린지 이름. 예: "올해 12권 읽기"
  progress: number;      // 진행 비율(0~1). 예: 0.42 → 42%
};


export type TasteRecordItem = {
  id: string;
  title: string;
  desc?: string;
  content?: string;
  category: string;
  tags?: string[];
  thumb?: string | null;
  createdAt: string | number | null;
};

export type TasteRecordListResponse = {
  ok: boolean;
  data: TasteRecordItem[];
};