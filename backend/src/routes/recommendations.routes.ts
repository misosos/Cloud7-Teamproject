// backend/src/routes/recommendations.routes.ts

/// <reference path="../types/session.d.ts" />

import { Router, type Request, type Response } from "express";
import authRequired from "../middlewares/authRequired";
import prisma from "../lib/prisma";

const router = Router();

/* ──────────────────────────────────────────────
 * 공통 상수 / 타입
 * ────────────────────────────────────────────── */

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || "";
const KAKAO_LOCAL_BASE =
  "https://dapi.kakao.com/v2/local/search/category.json";

// 7개 취향 카테고리
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

// Kakao 그룹코드 (문화시설, 관광명소, 카페, 식당만)
const FUN_CATEGORY_GROUPS = ["CT1", "AT4", "CE7", "FD6"] as const;
type FunCategoryGroup = (typeof FUN_CATEGORY_GROUPS)[number];

// 연맹원이 "같이 있다"고 판단할 반경 (m)
const GUILD_NEARBY_RADIUS_M = 50;

// Unified가 비어있을 때, 자동 rebuild를 한번 시도할지
const AUTO_REBUILD_ON_EMPTY = true;

/* ──────────────────────────────────────────────
 * Kakao 장소 타입/헬퍼
 * ────────────────────────────────────────────── */

interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  x: string; // 경도
  y: string; // 위도
  phone: string;
  road_address_name: string;
  address_name: string;
  distance?: string; // m, sort=distance 일 때
}

interface KakaoPlaceResponse {
  documents: KakaoPlaceDocument[];
}

export interface PlaceDTO {
  id: string;
  name: string;
  categoryName: string;
  categoryGroupCode: string;
  mappedCategory: TrackedCategory;
  x: number;
  y: number;
  phone: string;
  roadAddress: string;
  address: string;
  distanceMeters: number;
  score?: number;
}

// Kakao → 우리 카테고리 7개로 매핑
function mapCategory(doc: KakaoPlaceDocument): TrackedCategory {
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

  return "문화시설";
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

// 좌표 거리 계산 (m)
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
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 특정 좌표 주변(반경 radiusMeters) 4개 그룹 코드 기반 놀거리 조회
async function fetchNearbyFunPlaces(
  lat: number,
  lng: number,
  radiusMeters = 3000,
): Promise<PlaceDTO[]> {
  if (!KAKAO_REST_API_KEY) {
    // 여기서 throw하면 통째로 500으로 터져서 UX가 최악이라,
    // "빈 배열"로 처리하고 상위에서 메시지 내려주도록 한다.
    console.warn("[Recommend] KAKAO_REST_API_KEY is not set");
    return [];
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
      const text = await resp.text().catch(() => "");
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

/* ──────────────────────────────────────────────
 * Stay 기반 카테고리 weight 계산 (여러 유저 지원)
 * ────────────────────────────────────────────── */

async function getCategoryWeightsForUsers(
  userIds: number[],
): Promise<{
  weights: Record<TrackedCategory, number>;
  hasTasteData: boolean;
}> {
  const weights: Record<TrackedCategory, number> = {
    영화: 0,
    공연: 0,
    전시: 0,
    문화시설: 0,
    관광명소: 0,
    카페: 0,
    식당: 0,
  };

  if (userIds.length === 0) {
    return { weights, hasTasteData: false };
  }

  const grouped = await prisma.stay.groupBy({
    by: ["mappedCategory"],
    where: {
      userId: { in: userIds },
      mappedCategory: { not: null },
    },
    _count: { _all: true },
  });

  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
  if (total === 0) {
    return { weights, hasTasteData: false };
  }

  TRACKED_CATEGORIES.forEach((cat) => {
    const row = grouped.find((g) => g.mappedCategory === cat);
    const count = row?._count._all ?? 0;
    weights[cat] = count / total;
  });

  const hasAny = TRACKED_CATEGORIES.some((cat) => weights[cat] > 0);
  return { weights, hasTasteData: hasAny };
}

function applyEqualWeights(weights: Record<TrackedCategory, number>) {
  const equal = 1 / TRACKED_CATEGORIES.length;
  TRACKED_CATEGORIES.forEach((cat) => {
    weights[cat] = equal;
  });
}

/* ──────────────────────────────────────────────
 * LiveLocation + 길드 기반 연맹 컨텍스트 판정
 * ────────────────────────────────────────────── */

type RecommendationMode = "PERSONAL" | "GUILD";

interface GuildContext {
  mode: RecommendationMode;
  baseUserIds: number[]; // PERSONAL: [me], GUILD: [me + nearby guild members]
  guildId: number | null;
  guildName: string | null;
  nearbyGuildMemberCount: number;
}

async function detectGuildContext(
  userId: number,
  lat: number,
  lng: number,
): Promise<GuildContext> {
  const personal: GuildContext = {
    mode: "PERSONAL",
    baseUserIds: [userId],
    guildId: null,
    guildName: null,
    nearbyGuildMemberCount: 0,
  };

  // 내가 속한 길드들
  const myMemberships = await prisma.guildMembership.findMany({
    where: { userId, status: "APPROVED" },
    include: { guild: true },
  });
  if (myMemberships.length === 0) return personal;

  const guildIds = myMemberships.map((m) => m.guildId);

  // 같은 길드의 다른 멤버들
  const otherMemberships = await prisma.guildMembership.findMany({
    where: {
      guildId: { in: guildIds },
      status: "APPROVED",
      userId: { not: userId },
    },
    include: { guild: true },
  });
  if (otherMemberships.length === 0) return personal;

  const otherUserIds = Array.from(new Set(otherMemberships.map((m) => m.userId)));

  const lives = await prisma.liveLocation.findMany({
    where: { userId: { in: otherUserIds } },
  });
  if (lives.length === 0) return personal;

  type GuildNearbyInfo = { guildId: number; guildName: string; memberIds: number[] };
  const nearbyByGuild = new Map<number, GuildNearbyInfo>();

  for (const mem of otherMemberships) {
    const live = lives.find((l) => l.userId === mem.userId && l.lat != null && l.lng != null);
    if (!live) continue;

    const dist = distanceMeters(lat, lng, live.lat!, live.lng!);
    if (dist > GUILD_NEARBY_RADIUS_M) continue;

    const existing = nearbyByGuild.get(mem.guildId);
    if (existing) {
      if (!existing.memberIds.includes(mem.userId)) existing.memberIds.push(mem.userId);
    } else {
      nearbyByGuild.set(mem.guildId, {
        guildId: mem.guildId,
        guildName: mem.guild.name,
        memberIds: [mem.userId],
      });
    }
  }

  if (nearbyByGuild.size === 0) return personal;

  // 가장 많은 인원이 같이 있는 길드 하나 선택
  let selected: GuildNearbyInfo | null = null;
  for (const info of nearbyByGuild.values()) {
    if (!selected || info.memberIds.length > selected.memberIds.length) selected = info;
  }

  return {
    mode: "GUILD",
    baseUserIds: [userId, ...selected!.memberIds],
    guildId: selected!.guildId,
    guildName: selected!.guildName,
    nearbyGuildMemberCount: selected!.memberIds.length,
  };
}

// LiveLocation 에서 내 좌표 구해서 컨텍스트 판정
async function detectGuildContextFromLiveLocation(userId: number): Promise<GuildContext> {
  const live = await prisma.liveLocation.findUnique({ where: { userId } });

  if (!live || live.lat == null || live.lng == null) {
    return {
      mode: "PERSONAL",
      baseUserIds: [userId],
      guildId: null,
      guildName: null,
      nearbyGuildMemberCount: 0,
    };
  }

  return detectGuildContext(userId, live.lat, live.lng);
}

/* ──────────────────────────────────────────────
 * 내부 공통: rebuild 실행(중복코드 제거)
 * ────────────────────────────────────────────── */

async function rebuildForUser(params: {
  userId: number;
  lat: number;
  lng: number;
  radiusMeters: number;
}): Promise<{
  ok: true;
  mode: RecommendationMode;
  guildId: number | null;
  guildName: string | null;
  nearbyGuildMemberCount: number;
  hasTasteData: boolean;
  count: number;
  message?: string;
}> {
  const { userId, lat, lng, radiusMeters } = params;

  // 1) 연맹 컨텍스트 판정
  const ctx = await detectGuildContext(userId, lat, lng);

  // 2) Stay 기반 카테고리 weight 계산(개인 or 연맹)
  const { weights, hasTasteData } = await getCategoryWeightsForUsers(ctx.baseUserIds);

  // 3) 취향 데이터 없으면 균등 weight
  if (!hasTasteData) {
    applyEqualWeights(weights);
  }

  // 4) Kakao 주변 장소
  const nearby = await fetchNearbyFunPlaces(lat, lng, radiusMeters);

  // 5) score 부여(필터링 X, 정렬만)
  const scored = nearby
    .map((p) => ({ ...p, score: weights[p.mappedCategory] ?? 0 }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // 6) DB 저장(유저 단위 캐시)
  await prisma.recommendation.deleteMany({ where: { userId } });

  if (scored.length > 0) {
    await prisma.recommendation.createMany({
      data: scored.map((p) => ({
        userId,
        stayId: null,
        kakaoPlaceId: p.id,
        name: p.name,
        categoryName: p.categoryName,
        categoryGroupCode: p.categoryGroupCode,
        mappedCategory: p.mappedCategory,
        x: p.x,
        y: p.y,
        score: p.score ?? 0,
      })),
    });
  }

  return {
    ok: true,
    mode: ctx.mode,
    guildId: ctx.guildId,
    guildName: ctx.guildName,
    nearbyGuildMemberCount: ctx.nearbyGuildMemberCount,
    hasTasteData,
    count: scored.length,
    message:
      scored.length === 0
        ? "주변 3km 안에서 추천할 수 있는 장소를 찾지 못했어요."
        : undefined,
  };
}

/* ──────────────────────────────────────────────
 * 추천 재계산: POST /api/recommendations/rebuild
 * ────────────────────────────────────────────── */

router.post("/rebuild", authRequired, async (req: Request, res: Response) => {
  try {
    const currentUser = req.currentUser!;
    const userId = Number(currentUser.id);

    if (Number.isNaN(userId)) {
      return res.status(500).json({ ok: false, error: "INVALID_SESSION_USER_ID" });
    }

    let { lat, lng, radius } = req.body || {};
    let latNum = lat != null ? Number(lat) : NaN;
    let lngNum = lng != null ? Number(lng) : NaN;

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      // body에 없으면 LiveLocation에서 사용
      const live = await prisma.liveLocation.findUnique({ where: { userId } });
      if (!live || live.lat == null || live.lng == null) {
        return res.status(400).json({
          ok: false,
          error: "NO_LOCATION",
          message: "현재 위치 정보가 없습니다. 위치 권한을 허용하고 앱을 한 번 움직여 주세요.",
        });
      }
      latNum = live.lat!;
      lngNum = live.lng!;
    }

    const radiusNum =
      radius != null && !Number.isNaN(Number(radius)) ? Number(radius) : 3000;

    const result = await rebuildForUser({
      userId,
      lat: latNum,
      lng: lngNum,
      radiusMeters: radiusNum,
    });

    return res.json(result);
  } catch (err) {
    console.error("❌ POST /api/recommendations/rebuild 에러:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

/* ──────────────────────────────────────────────
 * raw 목록 조회: GET /api/recommendations
 * ────────────────────────────────────────────── */

router.get("/", authRequired, async (req: Request, res: Response) => {
  try {
    const currentUser = req.currentUser!;
    const userId = Number(currentUser.id);

    if (Number.isNaN(userId)) {
      return res.status(500).json({ ok: false, error: "INVALID_SESSION_USER_ID" });
    }

    const rows = await prisma.recommendation.findMany({
      where: { userId },
      orderBy: { score: "desc" },
    });

    return res.json({ ok: true, count: rows.length, recommendations: rows });
  } catch (err) {
    console.error("❌ GET /api/recommendations 에러:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

/* ──────────────────────────────────────────────
 * 통합 응답: GET /api/recommendations/unified
 *
 * ✅ 핵심 변경:
 *   - 추천 테이블이 비어있으면(= stay 없어도 가능)
 *     현재 LiveLocation(또는 없다면 에러) 기준으로 rebuild를 자동 실행해서
 *     "무조건 pending이 나오게" 한다.
 * ────────────────────────────────────────────── */

router.get("/unified", authRequired, async (req: Request, res: Response) => {
  try {
    const currentUser = req.currentUser!;
    const userId = Number(currentUser.id);

    if (Number.isNaN(userId)) {
      return res.status(500).json({ ok: false, error: "INVALID_SESSION_USER_ID" });
    }

    // 0) 컨텍스트 먼저(프론트에서 "연맹원 n명" 표기용)
    const ctx = await detectGuildContextFromLiveLocation(userId);

    // 1) 현재 저장된 추천 목록
    let recommendations = await prisma.recommendation.findMany({
      where: { userId },
      orderBy: { score: "desc" },
      include: { stay: true },
    });

    // ✅ 2) 비어 있으면 자동 rebuild(= stay 없어도 Kakao 기반으로 채워짐)
    if (AUTO_REBUILD_ON_EMPTY && recommendations.length === 0) {
      const live = await prisma.liveLocation.findUnique({ where: { userId } });

      if (!live || live.lat == null || live.lng == null) {
        // 위치 자체가 없으면 여기서만큼은 안내하고 종료
        return res.json({
          ok: true,
          mode: ctx.mode,
          guildId: ctx.guildId,
          guildName: ctx.guildName,
          nearbyGuildMemberCount: ctx.nearbyGuildMemberCount,
          count: 0,
          pending: [],
          achieved: [],
          message:
            "현재 위치 정보가 없습니다. 위치 권한을 허용하고 앱을 한 번 움직여 주세요.",
        });
      }

      await rebuildForUser({
        userId,
        lat: live.lat!,
        lng: live.lng!,
        radiusMeters: 3000,
      });

      recommendations = await prisma.recommendation.findMany({
        where: { userId },
        orderBy: { score: "desc" },
        include: { stay: true },
      });
    }

    // 3) 방문 여부 판단 (Stay 에 kakaoPlaceId 가 있는지)
    const kakaoPlaceIds = Array.from(new Set(recommendations.map((r) => r.kakaoPlaceId)));

    const stays = kakaoPlaceIds.length
      ? await prisma.stay.findMany({
          where: { userId, kakaoPlaceId: { in: kakaoPlaceIds } },
          select: {
            kakaoPlaceId: true,
            endTime: true,
            recommendationPointsAwardedAt: true,
          },
        })
      : [];

    const visitedSet = new Set(stays.map((s) => s.kakaoPlaceId!));
    const stayByKakaoPlaceId = new Map(
      stays.map((s) => [s.kakaoPlaceId!, s]),
    );

    // ✅ 이미 작성한 기록 확인 (guildId가 있으면 해당 길드, 없으면 사용자가 속한 첫 번째 길드)
    const targetGuildId = ctx.guildId || (await prisma.guildMembership.findFirst({
      where: {
        userId,
        status: "APPROVED",
      },
      select: { guildId: true },
    }))?.guildId;

    const achievedKakaoPlaceIds = recommendations
      .filter((r) => visitedSet.has(r.kakaoPlaceId))
      .map((r) => r.kakaoPlaceId);

    const existingRecords = targetGuildId && achievedKakaoPlaceIds.length > 0
      ? await prisma.guildRecord.findMany({
          where: {
            userId,
            guildId: targetGuildId,
            kakaoPlaceId: { in: achievedKakaoPlaceIds },
          },
          select: {
            kakaoPlaceId: true,
          },
        })
      : [];

    const recordedKakaoPlaceIdSet = new Set(
      existingRecords.map((r) => r.kakaoPlaceId!).filter(Boolean),
    );

    const achieved = recommendations
      .filter((r) => visitedSet.has(r.kakaoPlaceId))
      .map((r) => {
        const stay = stayByKakaoPlaceId.get(r.kakaoPlaceId);
        const hasRecord = targetGuildId
          ? recordedKakaoPlaceIdSet.has(r.kakaoPlaceId)
          : false;
        return {
          ...r,
          stay: stay
            ? {
                endTime: stay.endTime,
                awardedPoints:
                  stay.recommendationPointsAwardedAt != null ? 50 : null,
              }
            : null,
          hasRecord, // ✅ 이미 작성한 기록이 있는지 여부
        };
      });
    const pending = recommendations.filter((r) => !visitedSet.has(r.kakaoPlaceId));

    return res.json({
      ok: true,
      mode: ctx.mode,
      guildId: ctx.guildId,
      guildName: ctx.guildName,
      nearbyGuildMemberCount: ctx.nearbyGuildMemberCount,
      count: pending.length,
      pending,
      achieved,
      message:
        recommendations.length === 0
          ? "주변 3km 안에서 추천할 수 있는 장소를 찾지 못했어요."
          : undefined,
    });
  } catch (err) {
    console.error("❌ GET /api/recommendations/unified 에러:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

export default router;
