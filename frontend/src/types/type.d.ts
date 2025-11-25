export type OfficialDexItem = {
  id: string;            // 고유 식별자. 예: "achv_202"
  title: string;         // 업적 제목. 예: "주말 연속 3회 기록"
  achieved?: boolean;    // (선택) 달성 여부(true/false). 값이 없으면 미달성으로 간주 가능
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