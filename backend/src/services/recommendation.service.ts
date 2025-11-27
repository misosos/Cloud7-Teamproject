// backend/src/services/recommendation.service.ts

import { getTasteRecordInsightsByUser } from "./tasteRecord.service";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || "";

export interface RecommendedPlace {
  id: string;
  name: string;
  category: string; // 우리 서비스 기준 카테고리 (예: 카페, 영화, 전시 등)
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  score: number; // 거리 + 취향 비율 기반 점수
}

// Kakao Local 카테고리 코드 매핑
// (필요하면 나중에 더 추가 가능)
const CATEGORY_PREFERENCE_MAP: Record<string, string[]> = {
  카페: ["CE7"], // 카페
  음식: ["FD6"], // 음식점
  영화: ["CT1"], // 문화시설(영화관 포함)
  전시: ["CT1"], // 문화시설
  여행: ["AD5", "AT4"], // 숙박, 관광명소
  DEFAULT: ["CT1", "FD6", "CE7"],
};

// 우리 쪽 "취향 카테고리" 문자열을 정규화
function normalizeCategory(raw: string): string {
  const name = (raw || "").toLowerCase();

  if (name.includes("카페") || name.includes("커피") || name.includes("디저트")) {
    return "카페";
  }

  if (name.includes("음식") || name.includes("맛집") || name.includes("밥") || name.includes("식당")) {
    return "음식";
  }

  if (name.includes("영화") || name.includes("시네마") || name.includes("극장")) {
    return "영화";
  }

  if (
    name.includes("전시") ||
    name.includes("미술관") ||
    name.includes("갤러리") ||
    name.includes("뮤지엄")
  ) {
    return "전시";
  }

  if (name.includes("여행") || name.includes("관광") || name.includes("명소")) {
    return "여행";
  }

  return "DEFAULT";
}

/**
 * 유저의 취향 기록(카테고리 분석 결과)을 바탕으로
 * 현재 위치 주변(기본 3km) "취향 저격 장소"를 추천해주는 서비스 함수
 */
export async function getPlacesRecommendedByTaste(
  userId: number,
  lat: number,
  lng: number,
  radius = 3000 // 기본 3km
): Promise<RecommendedPlace[]> {
  if (!KAKAO_REST_API_KEY) {
    console.error("[Recommend] KAKAO_REST_API_KEY not set");
    return [];
  }

  // 1) 유저 취향 인사이트 조회
  const insights: any = await getTasteRecordInsightsByUser(userId).catch(
    (err) => {
      console.error("[Recommend] getTasteRecordInsightsByUser error", err);
      return null;
    }
  );

  const categoryStats: any[] = insights?.categoryStats ?? [];
  const totalCount: number = insights?.totalCount ?? 0;

  if (!Array.isArray(categoryStats) || categoryStats.length === 0 || totalCount === 0) {
    // 취향 데이터가 거의 없으면 추천 불가
    return [];
  }

  // 2) 카테고리별 사용량 기준으로 상위 카테고리 선택 (예: TOP 3)
  const sortedCategories = [...categoryStats].sort(
    (a, b) => (b.count ?? 0) - (a.count ?? 0)
  );
  const topCategories = sortedCategories.slice(0, 3);

  const allCandidates: RecommendedPlace[] = [];

  // 3) 상위 카테고리들 각각에 대해 Kakao Local API 호출
  for (const cat of topCategories) {
    const normalized = normalizeCategory(cat.category);
    const kakaoCodes =
      CATEGORY_PREFERENCE_MAP[normalized] ??
      CATEGORY_PREFERENCE_MAP["DEFAULT"];

    for (const cg of kakaoCodes) {
      const url = new URL(
        "https://dapi.kakao.com/v2/local/search/category.json"
      );
      url.searchParams.set("category_group_code", cg);
      url.searchParams.set("x", String(lng)); // 경도
      url.searchParams.set("y", String(lat)); // 위도
      url.searchParams.set("radius", String(Math.min(radius, 20000))); // 최대 20km
      url.searchParams.set("sort", "distance");

      let json: any;
      try {
        const resp = await fetch(url.toString(), {
          headers: {
            Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error(
            "[Recommend] Kakao API error",
            resp.status,
            text
          );
          continue;
        }

        json = await resp.json();
      } catch (err) {
        console.error("[Recommend] Kakao fetch error", err);
        continue;
      }

      const places: any[] = json?.documents ?? [];

      for (const p of places) {
        // Kakao distance는 문자열("123")로 오는 경우가 많음
        const rawDistance: any = (p as any).distance;
        const distance =
          typeof rawDistance === "number"
            ? rawDistance
            : Number(rawDistance ?? 0);

        // 거리 기반 점수 (0~1, 가까울수록 1에 가까움)
        const distanceScore = 1 - Math.min(distance / radius, 1);

        // 취향 비율 (해당 카테고리 기록 비중)
        const catCount = cat.count ?? 0;
        const tasteRatio =
          totalCount > 0 ? catCount / totalCount : cat.ratio ?? 0;

        // 최종 점수: 취향 60% + 거리 40%
        const score = distanceScore * 0.4 + tasteRatio * 0.6;

        allCandidates.push({
          id: p.id,
          name: p.place_name,
          category: normalized,
          address: p.road_address_name || p.address_name,
          lat: Number(p.y),
          lng: Number(p.x),
          distanceMeters: distance,
          score,
        });
      }
    }
  }

  // 4) 후보가 전혀 없으면 한 번 정도 반경을 늘려서 재시도 (3km → 6km)
  if (allCandidates.length === 0 && radius < 6000) {
    console.log(
      "[Recommend] no candidates found, retry with larger radius",
      { radius, topCategories }
    );
    return getPlacesRecommendedByTaste(userId, lat, lng, 6000);
  }

  // 5) 중복 장소(이름+주소 기준) 제거 & 점수 기준 정렬
  const uniqueMap = new Map<string, RecommendedPlace>();
  for (const c of allCandidates) {
    const key = `${c.name}-${c.address}`;
    const existing = uniqueMap.get(key);
    if (!existing || c.score > existing.score) {
      uniqueMap.set(key, c);
    }
  }

  const deduped = Array.from(uniqueMap.values());
  deduped.sort((a, b) => b.score - a.score);

  // 상위 20개만 반환
  return deduped.slice(0, 20);
}