// src/services/recommendation.service.ts
import prisma from "../lib/prisma";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || "";
const KAKAO_LOCAL_BASE =
  "https://dapi.kakao.com/v2/local/search/category.json";

export const TRACKED_CATEGORIES = [
  "영화",
  "공연",
  "전시",
  "문화시설",
  "관광명소",
  "카페",
  "식당",
] as const;
export type TrackedCategory = (typeof TRACKED_CATEGORIES)[number];

type FunCategoryGroup = "CT1" | "AT4" | "CE7" | "FD6";

interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: FunCategoryGroup | string;
  x: string;
  y: string;
  phone: string;
  road_address_name: string;
  address_name: string;
  distance?: string;
}

interface KakaoPlaceResponse {
  documents: KakaoPlaceDocument[];
}

export interface PlaceDTO {
  id: string;
  name: string;
  categoryName: string;
  categoryGroupCode: string;
  mappedCategory: TrackedCategory | null;
  x: number;
  y: number;
  phone: string;
  roadAddress: string;
  address: string;
  distanceMeters: number;
}

export interface RecommendedPlace extends PlaceDTO {
  mappedCategory: TrackedCategory;
  score: number;
}

const FUN_CATEGORY_GROUPS: FunCategoryGroup[] = [
  "CT1",
  "AT4",
  "CE7",
  "FD6",
];

function mapCategory(doc: KakaoPlaceDocument): TrackedCategory | null {
  const group = doc.category_group_code;
  const name = doc.category_name ?? "";

  if (group === "CT1") {
    if (name.includes("영화")) return "영화";
    if (
      name.includes("공연") ||
      name.includes("아트홀") ||
      name.includes("뮤지컬") ||
      name.includes("라이브")
    )
      return "공연";
    if (name.includes("전시") || name.includes("미술") || name.includes("갤러리"))
      return "전시";
    return "문화시설";
  }
  if (group === "AT4") return "관광명소";
  if (group === "CE7") return "카페";
  if (group === "FD6") return "식당";
  return null;
}

function toPlaceDTO(doc: KakaoPlaceDocument): PlaceDTO {
  return {
    id: doc.id,
    name: doc.place_name,
    categoryName: doc.category_name,
    categoryGroupCode: doc.category_group_code,
    mappedCategory: mapCategory(doc),
    x: Number(doc.x),
    y: Number(doc.y),
    phone: doc.phone,
    roadAddress: doc.road_address_name,
    address: doc.address_name,
    distanceMeters: doc.distance ? Number(doc.distance) : 0,
  };
}

// Stay 기반 취향 weight 계산 (0~1)
export async function getUserCategoryWeights(userId: number) {
  const grouped = await prisma.stay.groupBy({
    by: ["mappedCategory"],
    where: {
      userId,
      mappedCategory: { not: null },
    },
    _count: { _all: true },
  });

  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

  const weights: Record<TrackedCategory, number> = {
    영화: 0,
    공연: 0,
    전시: 0,
    문화시설: 0,
    관광명소: 0,
    카페: 0,
    식당: 0,
  };

  if (total === 0) {
    // 방문기록이 하나도 없을 때 → 균등 분배
    const equal = 1 / TRACKED_CATEGORIES.length;
    TRACKED_CATEGORIES.forEach((c) => {
      weights[c] = equal;
    });
    return { weights, hasTasteData: false };
  }

  TRACKED_CATEGORIES.forEach((cat) => {
    const row = grouped.find((g) => g.mappedCategory === cat);
    const count = row?._count._all ?? 0;
    weights[cat] = count / total;
  });

  const hasAny = TRACKED_CATEGORIES.some((c) => weights[c] > 0);
  return { weights, hasTasteData: hasAny };
}

// 카카오에서 현재 위치 주변 놀거리 가져오기
export async function fetchNearbyFunPlaces(
  lat: number,
  lng: number,
  radiusMeters = 3000,
): Promise<PlaceDTO[]> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY is not set");
  }

  const x = String(lng);
  const y = String(lat);
  const radius = String(radiusMeters);

  const all: PlaceDTO[] = [];

  for (const group of FUN_CATEGORY_GROUPS) {
    const url = new URL(KAKAO_LOCAL_BASE);
    url.searchParams.set("category_group_code", group);
    url.searchParams.set("x", x);
    url.searchParams.set("y", y);
    url.searchParams.set("radius", radius);
    url.searchParams.set("sort", "distance");
    url.searchParams.set("size", "15");

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
    });

    if (!resp.ok) {
      console.error("[fetchNearbyFunPlaces] Kakao error:", resp.status);
      continue;
    }

    const json = (await resp.json()) as KakaoPlaceResponse;
    json.documents.map(toPlaceDTO).forEach((p) => all.push(p));
  }

  const dedup = new Map<string, PlaceDTO>();
  all.forEach((p) => dedup.set(p.id, p));
  return Array.from(dedup.values());
}

// 유저 취향 + 현재 위치 기준 추천 리스트
export async function getPlacesRecommendedByTaste(
  userId: number,
  lat: number,
  lng: number,
  radius = 3000,
): Promise<RecommendedPlace[]> {
  const { weights } = await getUserCategoryWeights(userId);
  const nearby = await fetchNearbyFunPlaces(lat, lng, radius);

  const scored: RecommendedPlace[] = nearby
    .map((p) => {
      if (!p.mappedCategory) return null;
      const w = weights[p.mappedCategory] ?? 0;
      if (w <= 0) return null;
      return {
        ...p,
        mappedCategory: p.mappedCategory,
        score: w,
      };
    })
    .filter((x): x is RecommendedPlace => x !== null);

  scored.sort((a, b) => b.score - a.score);
  return scored;
}
