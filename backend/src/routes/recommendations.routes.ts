// backend/src/routes/recommendations.routes.ts

/// <reference path="../types/session.d.ts" />

import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import authRequired from "../middlewares/authRequired";

const router = Router();
const prisma = new PrismaClient();

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || "";
const KAKAO_LOCAL_BASE =
  "https://dapi.kakao.com/v2/local/search/category.json";

// Kakao 그룹코드 (문화시설, 관광명소, 카페, 식당)
const FUN_CATEGORY_GROUPS = ["CT1", "AT4", "CE7", "FD6"] as const;
type FunCategoryGroup = (typeof FUN_CATEGORY_GROUPS)[number];

// 우리가 추적하는 취향 카테고리 7개
const TRACKED_CATEGORIES = [
  "영화",
  "공연",
  "전시",
  "문화시설",
  "관광명소",
  "카페",
  "식당",
] as const;
type TrackedCategory = (typeof TRACKED_CATEGORIES)[number];

interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  x: string;
  y: string;
  phone: string;
  road_address_name: string;
  address_name: string;
  distance?: string; // sort=distance일 때 내려오는 값
}

interface KakaoPlaceResponse {
  documents: KakaoPlaceDocument[];
}

interface PlaceDTO {
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

interface RecommendedPlace {
  id: string;
  name: string;
  categoryName: string; // kakao category_name
  categoryGroupCode: string;
  mappedCategory: TrackedCategory;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  score: number; // 취향 weight 기반 점수
}

interface RecommendedResult {
  hasTasteData: boolean;
  places: RecommendedPlace[];
}

/** Kakao category → 우리 서비스 취향 카테고리 매핑 */
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
    if (
      name.includes("전시") ||
      name.includes("미술") ||
      name.includes("갤러리")
    )
      return "전시";
    return "문화시설";
  }
  if (group === "AT4") return "관광명소";
  if (group === "CE7") return "카페";
  if (group === "FD6") return "식당";

  return null;
}

/** Kakao 응답 → 내부 DTO로 변환 */
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

/** Stay 기반 유저 취향 weight (0~1) 계산 */
async function getUserCategoryWeights(
  userId: number,
): Promise<{
  weights: Record<TrackedCategory, number>;
  hasTasteData: boolean;
}> {
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
    return { weights, hasTasteData: false };
  }

  TRACKED_CATEGORIES.forEach((cat) => {
    const row = grouped.find((g) => g.mappedCategory === cat);
    const count = row?._count._all ?? 0;
    weights[cat] = count / total;
  });

  const hasAnyWeight = TRACKED_CATEGORIES.some((cat) => weights[cat] > 0);

  return {
    weights,
    hasTasteData: hasAnyWeight,
  };
}

/** 특정 좌표 주변(반경 radiusMeters) 놀거리 장소 조회 */
async function fetchNearbyFunPlaces(
  lat: number,
  lng: number,
  radiusMeters = 3000, // ✅ 기본 3000m
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
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[Recommend] Kakao API error", resp.status, text);
      continue;
    }

    const json = (await resp.json()) as KakaoPlaceResponse;
    json.documents.map(toPlaceDTO).forEach((p) => all.push(p));
  }

  // kakaoPlaceId 기준 중복 제거
  const dedup = new Map<string, PlaceDTO>();
  all.forEach((p) => dedup.set(p.id, p));
  return Array.from(dedup.values());
}

/**
 * 유저 stay 기반 취향 + 현재 위치(lat,lng)를 이용해
 * 반경 radius 내 추천 장소를 돌려주는 내부 함수
 *
 * - 머문 장소가 "하나도 없으면" → 7개 카테고리 모두 균등 가중치(1/7)
 * - 하나라도 카테고리가 생기면 → 그 비율만큼 가중치 부여하고,
 *   weight가 0인 카테고리는 결과에서 제외
 */
async function getPlacesRecommendedByTaste(
  userId: number,
  lat: number,
  lng: number,
  radius = 3000,
): Promise<RecommendedResult> {
  const { weights, hasTasteData } = await getUserCategoryWeights(userId);

  // 취향 데이터가 아예 없으면 → 7개 카테고리에 균등 weight
  if (!hasTasteData) {
    const equal = 1 / TRACKED_CATEGORIES.length;
    TRACKED_CATEGORIES.forEach((cat) => {
      weights[cat] = equal;
    });
  }

  const nearby = await fetchNearbyFunPlaces(lat, lng, radius);

  const scored: RecommendedPlace[] = nearby
    .map((p) => {
      if (!p.mappedCategory) return null;

      const w = weights[p.mappedCategory] ?? 0;
      if (w <= 0) return null; // ✅ 0% 카테고리는 제외

      return {
        id: p.id,
        name: p.name,
        categoryName: p.categoryName,
        categoryGroupCode: p.categoryGroupCode,
        mappedCategory: p.mappedCategory,
        address: p.address,
        roadAddress: p.roadAddress,
        lat: p.y,
        lng: p.x,
        distanceMeters: p.distanceMeters ?? 0,
        score: w, // 심플하게 카테고리 weight를 점수로 사용
      };
    })
    .filter((x): x is RecommendedPlace => x !== null);

  // 점수 순 정렬
  scored.sort((a, b) => b.score - a.score);

  return {
    hasTasteData,
    places: scored,
  };
}

/**
 * ✅ POST /api/recommendations/rebuild
 * body: { lat: number, lng: number, radius?: number }
 *
 * - 현재 위치 기준(반경 3000m, 또는 body.radius)으로 취향 기반 추천 장소를 계산
 * - 그 결과를 recommendations 테이블에 저장
 *   (기존 유저 추천은 싹 지우고, 새로 insert)
 */
router.post(
  "/rebuild",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const currentUser = req.currentUser!;
      const userId = Number(currentUser.id);
      if (Number.isNaN(userId)) {
        return res.status(500).json({
          ok: false,
          error: "INVALID_SESSION_USER_ID",
        });
      }

      const { lat, lng, radius } = req.body || {};
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const radiusNum = radius ? Number(radius) : 3000; // 기본 3000m

      if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "lat / lng 가 올바르지 않습니다.",
        });
      }

      // 1) 추천 계산
      const { hasTasteData, places } = await getPlacesRecommendedByTaste(
        userId,
        latNum,
        lngNum,
        radiusNum,
      );

      // 2) 기존 추천 삭제 (이 유저의 것만)
      await prisma.recommendation.deleteMany({
        where: { userId },
      });

      if (places.length === 0) {
        return res.json({
          ok: true,
          hasTasteData,
          count: 0,
        });
      }

      // 3) 새 추천 insert
      //    👉 여기서 Recommendation 모델 필드에 맞게 매핑해야 함
      await prisma.recommendation.createMany({
        data: places.map((p) => ({
          userId,
          kakaoPlaceId: p.id,
          name: p.name,
          categoryName: p.categoryName,
          categoryGroupCode: p.categoryGroupCode,
          mappedCategory: p.mappedCategory,
          x: p.lng,
          y: p.lat,
          score: p.score,
          // distanceMeters: p.distanceMeters,  // 🔸 만약 Prisma 모델에 있으면 추가
          // stayId: null,                     // 🔸 stay와 연결 안 할 거면 null or 생략
        })),
      });

      return res.json({
        ok: true,
        hasTasteData,
        count: places.length,
      });
    } catch (err) {
      console.error("❌ POST /api/recommendations/rebuild 에러:", err);
      return res.status(500).json({
        ok: false,
        error: "SERVER_ERROR",
      });
    }
  },
);

/**
 * ✅ GET /api/recommendations
 * - 현재 로그인 유저의 Recommendation 목록 조회
 */
router.get(
  "/",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const currentUser = req.currentUser!;
      const userId = Number(currentUser.id);

      if (Number.isNaN(userId)) {
        return res.status(500).json({
          ok: false,
          error: "INVALID_SESSION_USER_ID",
        });
      }

      const rows = await prisma.recommendation.findMany({
        where: { userId },
        orderBy: { score: "desc" }, // 점수 높은 순
      });

      return res.json({
        ok: true,
        count: rows.length,
        recommendations: rows,
      });
    } catch (err) {
      console.error("❌ GET /api/recommendations 에러:", err);
      return res.status(500).json({
        ok: false,
        error: "SERVER_ERROR",
      });
    }
  },
);


export default router;
