// 이 파일은 *백엔드 / DB 연동 전* 화면 개발을 위해 사용하는 임시 목업 데이터입니다.
// - API가 만들어지기 전까지 UI가 정상적으로 보이는지 확인하는 용도
// - 실 서비스에서는 API 응답으로 대체됨

import type { OfficialDexItem} from "@/types/type";

// ─────────────────────────────────────────────────────────
// 📝 취향 기록 리스트(Mock Data)
// - TasteRecordItem 타입을 기반으로 작성됨
// - category 기준으로 정렬/필터링하여 UI에 표시됨
// - createdAt 은 최신 정렬용 timestamp 값 (ms 단위)
// ─────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────
// 🏆 공식도감 업적 데이터(Mock)
// - 탐험가연맹 기능에서 사용: 업적/진행도 표시(선택)
// - achieved: true/false 로 완료 여부 표현
// ─────────────────────────────────────────────────────────
export const officialDexLatest: OfficialDexItem[] = [
  { id: "ach-001", title: "원두 취향 등록", achieved: true },
  { id: "ach-002", title: "첫 기록 남기기", achieved: true },
  { id: "ach-003", title: "티 라벨 수집 시작", achieved: true },
  { id: "ach-004", title: "향 노트 3종 작성", achieved: false },
  { id: "ach-005", title: "원산지 지도 열람", achieved: true },
  { id: "ach-006", title: "디캔팅 실험 기록", achieved: false },
  { id: "ach-007", title: "페어링 조합 등록", achieved: true },
  { id: "ach-008", title: "좋아요 10개 달성", achieved: false },
];

// ─────────────────────────────────────────────────────────
// 📁 카테고리 목록(Mock)
// - 좌측/우측 사이드바, 모바일 카테고리 그리드 등에서 사용
// - allCategories: 화면 전역에서 공통으로 참조하는 전체 카테고리 집합
// ─────────────────────────────────────────────────────────
export const leftCategories = ["영화", "음악", "도서", "여행"] as const;
export const rightCategories = ["음식", "사진", "운동", "카페"] as const;
export const allCategories = [...leftCategories, ...rightCategories] as const;

// ─────────────────────────────────────────────────────────
// ⚙️ UI 옵션(카테고리/태그)
// - 작성 모달(TasteRecordModal) 등 여러 화면에서 공용으로 사용합니다.
// - 카테고리는 위의 allCategories를 그대로 재사용하여 **단일 소스**를 유지합니다.
// - 태그는 임시 더미 셋으로, 실제 서비스 연동 시 API 응답으로 대체 예정입니다.
// ─────────────────────────────────────────────────────────
/** 작성 모달에 넘길 카테고리 옵션 (공용) */
export const categoryOptions = allCategories; // readonly string[]

/** 작성 모달에 넘길 태그 옵션 (임시 더미) */
export const tagOptions = [
  "#주말",
  "#친구",
  "#혼자",
  "#가성비",
  "#재방문",
  "#신작",
  "#핫플",
  "#클래식",
] as const;