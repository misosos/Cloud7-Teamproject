// src/api/recommendations.ts
import { httpGet, httpPost } from "./apiClient";

export interface RecommendationRow {
  id: number;
  kakaoPlaceId: string;
  name: string;
  categoryName?: string | null;
  categoryGroupCode?: string | null;
  mappedCategory?: string | null;
  x: number;
  y: number;
  score: number;
  roadAddress?: string | null;
  address?: string | null;
  phone?: string | null;
  distanceMeters?: number | null;
}

export interface RebuildRecommendationsResponse {
  ok: boolean;
  hasTasteData: boolean;
  count: number;
  mode?: "PERSONAL" | "GUILD";
  guildId?: number | null;
  guildName?: string | null;
  nearbyGuildMemberCount?: number;
}

/** 현재 좌표 기준으로 추천 재계산 */
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

export interface UnifiedRecommendationsResponse {
  ok: boolean;
  mode: "PERSONAL" | "GUILD";
  guildId: number | null;
  guildName: string | null;
  nearbyGuildMemberCount: number;
  count: number;
  pending: RecommendationRow[];
  achieved: (RecommendationRow & {
    stay?: { endTime?: string | null } | null;
  })[];
}

/** 통합 추천 조회 (개인/연맹 + 달성 도감) */
export const fetchUnifiedRecommendations = () => {
  return httpGet<UnifiedRecommendationsResponse>("/recommendations/unified");
};
