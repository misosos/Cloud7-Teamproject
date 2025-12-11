// src/api/recommendations.ts

import { httpGet, httpPost } from "./apiClient";

// ... 위에는 지금 써온 apiClient, httpGet/httpPost 그대로 두고

// ───────────────────────────────
// 추천 도메인 타입/헬퍼
// ───────────────────────────────

export interface RecommendationRow {
  id: number;
  kakaoPlaceId: string;
  name: string;
  categoryName?: string | null;
  categoryGroupCode?: string | null;
  mappedCategory?: string | null; // '영화' | '공연' | ...
  x: number;
  y: number;
  score: number;
  roadAddress?: string | null;
  address?: string | null;
  phone?: string | null;
  distanceMeters?: number | null; // 있으면 사용, 없으면 표시 안 함
}

export interface RebuildRecommendationsResponse {
  ok: boolean;
  hasTasteData: boolean; // Stay 기반 취향이 있는지 여부
  count: number;
}

/**
 * 현재 좌표 기준으로 추천을 다시 계산해서 Recommendation 테이블에 저장
 * - 백엔드: POST /api/recommendations/rebuild
 */
export const rebuildRecommendations = (
  lat: number,
  lng: number,
  radius: number = 3000,
) => {
  return httpPost<RebuildRecommendationsResponse>("/recommendations/rebuild", {
    lat,
    lng,
    radius,
  });
};

/**
 * DB에 저장된 추천 목록 조회
 * - 백엔드: GET /api/recommendations
 */
export const fetchRecommendationsList = () => {
  return httpGet<{
    ok: boolean;
    count: number;
    recommendations: RecommendationRow[];
  }>("/recommendations");
};
