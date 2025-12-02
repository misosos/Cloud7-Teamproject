// src/routes/guild.routes.ts
import { Router, Request, Response } from "express";
import authRequired from "../middlewares/authRequired";
import prisma from "../lib/prisma";

const router = Router();

// 우리가 추적하는 취향 카테고리
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

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || "";
const KAKAO_LOCAL_BASE =
  "https://dapi.kakao.com/v2/local/search/category.json";

const FUN_CATEGORY_GROUPS = ["CT1", "AT4", "CE7", "FD6"] as const;
type FunCategoryGroup = (typeof FUN_CATEGORY_GROUPS)[number];

interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  x: string;
  y: string;
  road_address_name: string;
  address_name: string;
  distance?: string;
}
interface KakaoPlaceResponse {
  documents: KakaoPlaceDocument[];
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
    if (name.includes("전시") || name.includes("미술") || name.includes("갤러리"))
      return "전시";
    return "문화시설";
  }
  if (group === "AT4") return "관광명소";
  if (group === "CE7") return "카페";
  if (group === "FD6") return "식당";

  return null;
}

function toPlaceDTO(doc: KakaoPlaceDocument) {
  return {
    id: doc.id,
    name: doc.place_name,
    categoryName: doc.category_name,
    categoryGroupCode: doc.category_group_code,
    mappedCategory: mapCategory(doc),
    lat: Number(doc.y),
    lng: Number(doc.x),
    roadAddress: doc.road_address_name,
    address: doc.address_name,
    distanceMeters: doc.distance ? Number(doc.distance) : 0,
  };
}

// 두 좌표 사이 거리(m)
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; // m
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * ✅ GET /api/guilds/nearby-context
 * - 현재 유저와 같은 길드에 속한 멤버 중
 *   반경 500m 이내에 있는 멤버들 + 그 멤버들의 "공동 취향" 기반 추천 장소
 * query: radiusMembers?(기본 500), radiusPlaces?(기본 3000)
 */
router.get(
  "/nearby-context",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const userId = req.currentUser!.id;

      // 1) 내 현재 위치
      const meLocation = await prisma.liveLocation.findUnique({
        where: { userId },
      });

      if (!meLocation) {
        return res.status(400).json({
          ok: false,
          error: "NO_LOCATION",
          message: "현재 위치가 등록되어 있지 않습니다. /api/location/update 먼저 호출",
        });
      }

      const radiusMembers =
        typeof req.query.radiusMembers === "string"
          ? Number(req.query.radiusMembers)
          : 500;

      const radiusPlaces =
        typeof req.query.radiusPlaces === "string"
          ? Number(req.query.radiusPlaces)
          : 3000;

      // 2) 내가 속한 길드 찾기 (일단 첫번째 길드 기준)
      const myMemberships = await prisma.guildMembership.findMany({
        where: { userId, status: "APPROVED" },
        include: { guild: true },
      });

      if (myMemberships.length === 0) {
        return res.json({
          ok: true,
          guild: null,
          members: [],
          hasTasteData: false,
          places: [],
        });
      }

      const guild = myMemberships[0].guild;

      // 3) 같은 길드의 다른 멤버들
      const memberships = await prisma.guildMembership.findMany({
        where: {
          guildId: guild.id,
          status: "APPROVED",
        },
        include: { user: true },
      });

      const memberIds = memberships.map((m) => m.userId);

      // 4) 그 멤버들의 LiveLocation
      const locations = await prisma.liveLocation.findMany({
        where: {
          userId: { in: memberIds },
        },
        include: { user: true },
      });

      // 5) 반경 radiusMembers(m) 이내에 있는 멤버만 필터링
      const nearbyMembers = locations
        .map((loc) => {
          const dist = distanceMeters(
            meLocation.lat,
            meLocation.lng,
            loc.lat,
            loc.lng,
          );
          return {
            userId: loc.userId,
            name: loc.user.name ?? `유저#${loc.userId}`,
            lat: loc.lat,
            lng: loc.lng,
            distanceMeters: dist,
          };
        })
        .filter((m) => m.distanceMeters <= radiusMembers);

      if (nearbyMembers.length === 0) {
        return res.json({
          ok: true,
          guild: { id: guild.id, name: guild.name },
          members: [],
          hasTasteData: false,
          places: [],
        });
      }

      // 6) 연맹원들의 위치 중앙값(단순 평균) 계산
      const allLat = nearbyMembers.map((m) => m.lat);
      const allLng = nearbyMembers.map((m) => m.lng);
      const centerLat =
        allLat.reduce((s, v) => s + v, 0) / nearbyMembers.length;
      const centerLng =
        allLng.reduce((s, v) => s + v, 0) / nearbyMembers.length;

      // 7) 연맹원들의 Stay 기반 카테고리 weight (합산/공동 취향)
      const staysGrouped = await prisma.stay.groupBy({
        by: ["mappedCategory"],
        where: {
          userId: { in: nearbyMembers.map((m) => m.userId) },
          mappedCategory: { not: null },
        },
        _count: { _all: true },
      });

      const total = staysGrouped.reduce((s, g) => s + g._count._all, 0);

      const weights: Record<TrackedCategory, number> = {
        영화: 0,
        공연: 0,
        전시: 0,
        문화시설: 0,
        관광명소: 0,
        카페: 0,
        식당: 0,
      };

      let hasTasteData = total > 0;

      if (!hasTasteData) {
        // 아무도 머문 적 없음 → 7개 카테고리 균등 weight
        const equal = 1 / TRACKED_CATEGORIES.length;
        TRACKED_CATEGORIES.forEach((cat) => (weights[cat] = equal));
      } else {
        TRACKED_CATEGORIES.forEach((cat) => {
          const row = staysGrouped.find((g) => g.mappedCategory === cat);
          const count = row?._count._all ?? 0;
          weights[cat] = count / total;
        });
      }

      // 8) 중심점 기준 3000m 내 카카오 장소 긁어오기
      if (!KAKAO_REST_API_KEY) {
        console.warn("[Guild] KAKAO_REST_API_KEY not set");
      }

      const allPlaces: ReturnType<typeof toPlaceDTO>[] = [];

      for (const group of FUN_CATEGORY_GROUPS) {
        const url = new URL(KAKAO_LOCAL_BASE);
        url.searchParams.set("category_group_code", group);
        url.searchParams.set("x", String(centerLng));
        url.searchParams.set("y", String(centerLat));
        url.searchParams.set("radius", String(radiusPlaces));
        url.searchParams.set("sort", "distance");
        url.searchParams.set("size", "15");

        const resp = await fetch(url.toString(), {
          headers: {
            Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error("[Guild] kakao error", resp.status, text);
          continue;
        }

        const json = (await resp.json()) as KakaoPlaceResponse;
        json.documents.map(toPlaceDTO).forEach((p) => allPlaces.push(p));
      }

      // 중복 제거
      const dedup = new Map<string, ReturnType<typeof toPlaceDTO>>();
      allPlaces.forEach((p) => dedup.set(p.id, p));
      const uniquePlaces = Array.from(dedup.values());

      // 9) 연맹원 공동 취향 weight로 점수 계산 + 정렬
      const scored = uniquePlaces
        .map((p) => {
          if (!p.mappedCategory) return null;

          const w = weights[p.mappedCategory] ?? 0;
          return {
            ...p,
            score: w,
          };
        })
        .filter((p): p is ReturnType<typeof toPlaceDTO> & { score: number } => !!p)
        .sort((a, b) => b.score - a.score);

      return res.json({
        ok: true,
        guild: { id: guild.id, name: guild.name },
        center: { lat: centerLat, lng: centerLng },
        members: nearbyMembers,
        hasTasteData,
        places: scored,
      });
    } catch (err) {
      console.error("GET /api/guilds/nearby-context error:", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  },
);

export default router;
