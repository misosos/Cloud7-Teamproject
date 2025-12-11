// backend/src/routes/recommendations.routes.ts

/// <reference path="../types/session.d.ts" />

import { Router, type Request, type Response } from "express";
import authRequired, { type AuthedRequest } from "../middlewares/authRequired";
import prisma from "../lib/prisma";

const router = Router();

// ─────────────────────────────────────────────────────────────
// 카카오 로컬 API 기본 설정
// ─────────────────────────────────────────────────────────────
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || "";
const KAKAO_LOCAL_BASE =
  "https://dapi.kakao.com/v2/local/search/category.json";

const FUN_CATEGORY_GROUPS = ["CT1", "AT4", "CE7", "FD6"] as const;
type FunCategoryGroup = (typeof FUN_CATEGORY_GROUPS)[number];

// 우리 서비스 카테고리
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

// 연맹 "근처" 판정 반경 (미터)
const GUILD_NEARBY_RADIUS_M = 150;

// ─────────────────────────────────────────────────────────────
// 거리 계산 (하버사인)
// ─────────────────────────────────────────────────────────────
function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─────────────────────────────────────────────────────────────
// Kakao 타입 & 매핑
// ─────────────────────────────────────────────────────────────
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
  distance?: string;
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

async function fetchNearbyFunPlaces(
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

  const dedup = new Map<string, PlaceDTO>();
  all.forEach((p) => dedup.set(p.id, p));
  return Array.from(dedup.values());
}

// ─────────────────────────────────────────────────────────────
// 취향 weight 계산 (개인 / 길드)
// ─────────────────────────────────────────────────────────────
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
  return { weights, hasTasteData: hasAnyWeight };
}

/** 길드원 여러 명의 stay 를 합산한 카테고리 weight */
async function getGuildCategoryWeights(
  userIds: number[],
): Promise<Record<TrackedCategory, number>> {
  const grouped = await prisma.stay.groupBy({
    by: ["mappedCategory"],
    where: {
      userId: { in: userIds },
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

  if (total === 0) return weights;

  TRACKED_CATEGORIES.forEach((cat) => {
    const row = grouped.find((g) => g.mappedCategory === cat);
    const count = row?._count._all ?? 0;
    weights[cat] = count / total;
  });

  return weights;
}

// ─────────────────────────────────────────────────────────────
// 근처에 같이 있는 길드원 탐색
// ─────────────────────────────────────────────────────────────
async function findNearbyGuildContext(userId: number) {
  // 내 LiveLocation
  const meLive = await prisma.liveLocation.findUnique({
    where: { userId },
  });

  if (!meLive || meLive.lat == null || meLive.lng == null) {
    return { hasNearbyGuildmate: false, nearbyUserIds: [] as number[], guildId: null as number | null, guildName: null as string | null };
  }

  // 내가 속한 길드들
  const myMemberships = await prisma.guildMembership.findMany({
    where: { userId },
    select: {
      guildId: true,
      guild: { select: { id: true, name: true } },
    },
  });

  if (myMemberships.length === 0) {
    return { hasNearbyGuildmate: false, nearbyUserIds: [] as number[], guildId: null, guildName: null };
  }

  const guildIds = myMemberships.map((m) => m.guildId);

  // 같은 길드 멤버들
  const otherMembers = await prisma.guildMembership.findMany({
    where: {
      guildId: { in: guildIds },
      userId: { not: userId },
    },
    select: {
      userId: true,
      guildId: true,
      guild: { select: { id: true, name: true } },
    },
  });

  if (otherMembers.length === 0) {
    return { hasNearbyGuildmate: false, nearbyUserIds: [] as number[], guildId: null, guildName: null };
  }

  const otherUserIds = Array.from(
    new Set(otherMembers.map((m) => m.userId)),
  );

  const lives = await prisma.liveLocation.findMany({
    where: { userId: { in: otherUserIds } },
  });

  const nearbyUserIds: number[] = [];
  let selectedGuildId: number | null = null;
  let selectedGuildName: string | null = null;

  for (const live of lives) {
    if (live.lat == null || live.lng == null) continue;
    const dist = distanceMeters(meLive.lat, meLive.lng, live.lat, live.lng);
    if (dist <= GUILD_NEARBY_RADIUS_M) {
      nearbyUserIds.push(live.userId);

      // 이 유저가 속한 길드(들) 중, 내 길드와 겹치는 것 하나 선택
      const sharedMembership = otherMembers.find(
        (m) => m.userId === live.userId,
      );
      if (sharedMembership && !selectedGuildId) {
        selectedGuildId = sharedMembership.guild.id;
        selectedGuildName = sharedMembership.guild.name;
      }
    }
  }

  if (nearbyUserIds.length === 0) {
    return { hasNearbyGuildmate: false, nearbyUserIds: [] as number[], guildId: null, guildName: null };
  }

  return {
    hasNearbyGuildmate: true,
    nearbyUserIds,
    guildId: selectedGuildId,
    guildName: selectedGuildName,
  };
}

// ─────────────────────────────────────────────────────────────
// POST /api/recommendations/rebuild   (버전 A와 동일)
// ─────────────────────────────────────────────────────────────
router.post(
  "/rebuild",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const { currentUser } = req as AuthedRequest;
      const userId = currentUser?.id;

      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
        });
      }

      const { lat, lng, radius } = req.body || {};
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const radiusNum = radius ? Number(radius) : 3000;

      if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "lat / lng 가 올바르지 않습니다.",
        });
      }

      const { weights, hasTasteData } = await getUserCategoryWeights(userId);

      if (!hasTasteData) {
        const equal = 1 / TRACKED_CATEGORIES.length;
        TRACKED_CATEGORIES.forEach((cat) => {
          weights[cat] = equal;
        });
      }

      const places = await fetchNearbyFunPlaces(latNum, lngNum, radiusNum);

      if (places.length === 0) {
        await prisma.recommendation.deleteMany({ where: { userId } });
        return res.json({
          ok: true,
          hasTasteData,
          count: 0,
        });
      }

      await prisma.recommendation.deleteMany({
        where: { userId },
      });

      await prisma.recommendation.createMany({
        data: places.map((p) => {
          const cat = p.mappedCategory;
          const w = cat ? weights[cat] ?? 0 : 0;

          return {
            userId,
            stayId: null,
            kakaoPlaceId: p.id,
            name: p.name,
            categoryName: p.categoryName,
            categoryGroupCode: p.categoryGroupCode,
            mappedCategory: cat ?? "기타",
            x: p.x,
            y: p.y,
            score: w,
          };
        }),
      });

      const count = await prisma.recommendation.count({ where: { userId } });

      return res.json({
        ok: true,
        hasTasteData,
        count,
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

// ─────────────────────────────────────────────────────────────
// GET /api/recommendations
// ─────────────────────────────────────────────────────────────
router.get(
  "/",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const { currentUser } = req as AuthedRequest;
      const userId = currentUser?.id;

      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
        });
      }

      const rows = await prisma.recommendation.findMany({
        where: { userId },
        orderBy: { score: "desc" },
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

// ─────────────────────────────────────────────────────────────
// GET /api/recommendations/unified
//  - PERSONAL / GUILD 모드 통합
//  - GUILD 모드일 때: 근처 연맹원 + 나의 Stay 를 합산한 weight 로
//    Recommendation 리스트를 "정렬만" 다시 해서 반환
// ─────────────────────────────────────────────────────────────
router.get(
  "/unified",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const { currentUser } = req as AuthedRequest;
      const userId = currentUser?.id;

      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
        });
      }

      // 1) 기본 추천들 전부 가져오기
      const recommendations = await prisma.recommendation.findMany({
        where: { userId },
      });

      if (recommendations.length === 0) {
        return res.json({
          ok: true,
          mode: "PERSONAL" as const,
          guildId: null,
          guildName: null,
          count: 0,
          pending: [],
          achieved: [],
        });
      }

      // 2) 근처에 함께 있는 길드원 탐색
      const {
        hasNearbyGuildmate,
        nearbyUserIds,
        guildId,
        guildName,
      } = await findNearbyGuildContext(userId);

      // 3) 방문 여부 기준으로 pending/achieved 분리
      const kakaoPlaceIds = Array.from(
        new Set(recommendations.map((r) => r.kakaoPlaceId)),
      );

      const stays = await prisma.stay.findMany({
        where: {
          userId,
          kakaoPlaceId: { in: kakaoPlaceIds },
        },
        select: { kakaoPlaceId: true },
      });

      const visitedSet = new Set(stays.map((s) => s.kakaoPlaceId));

      let pending = recommendations.filter(
        (r) => !visitedSet.has(r.kakaoPlaceId),
      );
      const achieved = recommendations.filter((r) =>
        visitedSet.has(r.kakaoPlaceId),
      );

      // 4) PERSONAL vs GUILD 모드별 정렬 weight 결정
      let mode: "PERSONAL" | "GUILD" = "PERSONAL";

      if (hasNearbyGuildmate && nearbyUserIds.length > 0) {
        mode = "GUILD";
        const guildWeights = await getGuildCategoryWeights([
          userId,
          ...nearbyUserIds,
        ]);

        // 길드 weight 기준으로 정렬 (mappedCategory 없으면 0점)
        pending = pending
          .map((r) => {
            const cat = r.mappedCategory as TrackedCategory | null;
            const w = cat ? guildWeights[cat] ?? 0 : 0;
            return { ...r, __scoreForRender: w };
          })
          .sort((a, b) => b.__scoreForRender - a.__scoreForRender)
          .map(({ __scoreForRender, ...rest }) => rest); // 내부 필드는 응답에서 제거
      } else {
        mode = "PERSONAL";

        // PERSONAL 모드에서는 DB에 저장된 score 기준으로 정렬
        pending = pending.sort((a, b) => b.score - a.score);
      }

      return res.json({
        ok: true,
        mode,
        guildId: mode === "GUILD" ? guildId : null,
        guildName: mode === "GUILD" ? guildName : null,
        count: pending.length,
        pending,
        achieved,
      });
    } catch (err) {
      console.error("❌ GET /api/recommendations/unified 에러:", err);
      return res.status(500).json({
        ok: false,
        error: "SERVER_ERROR",
      });
    }
  },
);

export default router;
