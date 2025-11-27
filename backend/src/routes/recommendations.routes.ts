/// <reference path="../types/session.d.ts" />
// src/routes/recommendations.routes.ts

import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import authRequired from "../middlewares/authRequired";
import axios from "axios";

const router = Router();
const prisma = new PrismaClient();

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_LOCAL_BASE =
  "https://dapi.kakao.com/v2/local/search/category.json";

// places.routes.ts / stays.routes.ts에서 쓰던 것들 재사용
const FUN_CATEGORY_GROUPS = ["CT1", "AT4", "CE7", "FD6"] as const;
type FunCategoryGroup = (typeof FUN_CATEGORY_GROUPS)[number];

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
}

// stays.routes.ts에서 쓰던 거랑 동일한 매핑
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
  };
}

/** 하버사인 거리 (m) – 나중에 점수에 섞고 싶으면 사용 가능 */
function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * ✅ 1단계: 유저 취향 대시보드(카테고리별 ratio) 계산
 *  - /api/taste/dashboard 로직을 내부 함수로 다시 구현
 */
async function getUserCategoryWeights(
  userId: number,
): Promise<Record<TrackedCategory, number>> {
  const grouped = await prisma.stay.groupBy({
    by: ["mappedCategory"],
    where: {
      userId,
      mappedCategory: { not: null },
    },
    _count: {
      _all: true,
    },
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

  if (total === 0) return weights;

  TRACKED_CATEGORIES.forEach((cat) => {
    const row = grouped.find((g) => g.mappedCategory === cat);
    const count = row?._count._all ?? 0;
    weights[cat] = count / total; // ratio 0~1
  });

  return weights;
}

/**
 * ✅ 2단계: 특정 좌표 주변(반경 2000m)의 놀거리 장소들 가져오기
 */
async function fetchNearbyFunPlaces(
  lat: number,
  lng: number,
  radiusMeters = 2000,
): Promise<PlaceDTO[]> {
  if (!KAKAO_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY is not set");
  }

  const x = String(lng);
  const y = String(lat);
  const radius = String(radiusMeters);

  const all: PlaceDTO[] = [];

  for (const group of FUN_CATEGORY_GROUPS) {
    const res = await axios.get<KakaoPlaceResponse>(KAKAO_LOCAL_BASE, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`,
      },
      params: {
        category_group_code: group,
        x,
        y,
        radius,
        sort: "distance",
        size: 15,
      },
    });

    res.data.documents.map(toPlaceDTO).forEach((p) => all.push(p));
  }

  // kakaoPlaceId 기준 중복 제거
  const dedup = new Map<string, PlaceDTO>();
  all.forEach((p) => {
    dedup.set(p.id, p);
  });

  return Array.from(dedup.values());
}

/**
 * ✅ POST /api/recommendations/rebuild
 *  - 현재 로그인한 유저의 취향 대시보드 기반으로
 *  - 모든 Stay 주변(반경 2000m)의 장소를 스캔
 *  - 카테고리 weight를 가중치로 score 계산
 *  - Recommendation 테이블에 저장
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

      // 1) 유저 취향 weight (0~1) 계산
      const weights = await getUserCategoryWeights(userId);

      // 취향 데이터 자체가 없는 경우 → 추천 만들 의미가 없음
      const hasAnyWeight = TRACKED_CATEGORIES.some((cat) => weights[cat] > 0);
      if (!hasAnyWeight) {
        return res.json({
          ok: true,
          message: "NO_TASTE_DATA",
          recommendations: [],
        });
      }

      // 2) 유저의 Stay 목록 (너무 많으면 최근 N개로 제한)
      const stays = await prisma.stay.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20, // 최근 20개 머문 장소만
      });

      // 3) 각 stay 주변 후보 장소 수집
      type RecCandidate = {
        userId: number;
        stayId: number | null;
        kakaoPlaceId: string;
        name: string;
        categoryName: string | null;
        categoryGroupCode: string | null;
        mappedCategory: TrackedCategory;
        x: number;
        y: number;
        score: number;
      };

      const candidateMap = new Map<string, RecCandidate>(); // key: userId + kakaoPlaceId

      for (const stay of stays) {
        const lat = Number(stay.lat);
        const lng = Number(stay.lng);

        const nearby = await fetchNearbyFunPlaces(lat, lng, 2000);

        for (const place of nearby) {
          if (!place.mappedCategory) continue;

          const w = weights[place.mappedCategory] ?? 0;
          if (w <= 0) continue; // 유저가 전혀 가지 않는 카테고리는 스킵

          // 간단한 점수: 그냥 카테고리 weight만 사용
          // (원하면 distanceMeters로 거리 감쇠까지 섞을 수 있음)
          const score = w;

          const key = `${userId}:${place.id}`;
          const prev = candidateMap.get(key);

          if (!prev || prev.score < score) {
            candidateMap.set(key, {
              userId,
              stayId: stay.id,
              kakaoPlaceId: place.id,
              name: place.name,
              categoryName: place.categoryName,
              categoryGroupCode: place.categoryGroupCode,
              mappedCategory: place.mappedCategory,
              x: place.x,
              y: place.y,
              score,
            });
          }
        }
      }

      const candidates = Array.from(candidateMap.values());

      // score 순으로 정렬해서, 너무 많으면 상위 N개만
      candidates.sort((a, b) => b.score - a.score);
      const topCandidates = candidates.slice(0, 100); // 최대 100개 정도만 저장

      // 4) 기존 추천 삭제 후 새로 저장
      await prisma.recommendation.deleteMany({
        where: { userId },
      });

      if (topCandidates.length > 0) {
        await prisma.recommendation.createMany({
          data: topCandidates.map((c) => ({
            userId: c.userId,
            stayId: c.stayId,
            kakaoPlaceId: c.kakaoPlaceId,
            name: c.name,
            categoryName: c.categoryName,
            categoryGroupCode: c.categoryGroupCode,
            mappedCategory: c.mappedCategory,
            x: c.x,
            y: c.y,
            score: c.score,
          })),
        });
      }

      return res.json({
        ok: true,
        count: topCandidates.length,
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

export default router;
