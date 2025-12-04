// src/routes/places.routes.ts
import express, { Request, Response } from "express";
import axios from "axios";
import authRequired, { type AuthedRequest } from "../middlewares/authRequired";
import prisma from "../lib/prisma";
import { getPlacesRecommendedByTaste } from "../services/recommendation.service";

const router = express.Router();

// 카카오 로컬 API 기본 URL
const KAKAO_BASE_URL =
  "https://dapi.kakao.com/v2/local/search/category.json";

// .env 에서 가져오는 카카오 REST API 키
const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_MOBILITY_KEY = process.env.KAKAO_MOBILITY_REST_KEY; // ⭐ 추가됨

if (!KAKAO_API_KEY) {
  console.warn(
    "[WARN] KAKAO_REST_API_KEY is not set. /api/places 호출 시 오류가 날 수 있습니다.",
  );
}
if (!KAKAO_MOBILITY_KEY) {
  console.warn(
    "[WARN] KAKAO_MOBILITY_REST_KEY is not set. /api/places/optimize 호출 시 오류가 날 수 있습니다.",
  );
}

/**
 * ─────────────────────
 * 공통 타입 / 유틸
 * ─────────────────────
 */

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
}

interface KakaoPlaceResponse {
  documents: KakaoPlaceDocument[];
}

export type MappedCategory =
  | "영화"
  | "공연"
  | "전시"
  | "문화시설"
  | "관광명소"
  | "카페"
  | "식당"
  | "기타";

export interface PlaceDTO {
  id: string;
  name: string;
  categoryName: string;
  categoryGroupCode: string;
  mappedCategory: MappedCategory;
  x: number;
  y: number;
  phone: string;
  roadAddress: string;
  address: string;
}

function mapCategory(doc: KakaoPlaceDocument): MappedCategory {
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

  return "기타";
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

// 하버사인 거리(m)
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

// 내가 속한 길드원 중 "근처" 판정 반경
const NEARBY_RADIUS_M = 150;

// LiveLocation 읽기 (없으면 에러)
async function getUserLiveLocationOrThrow(userId: number) {
  const live = await prisma.liveLocation.findUnique({
    where: { userId },
  });

  if (!live || live.lat == null || live.lng == null) {
    throw new Error("LIVE_LOCATION_NOT_FOUND");
  }

  return { lat: live.lat, lng: live.lng };
}

// 우리가 "놀거리"로 볼 카테고리 그룹 코드들
const FUN_CATEGORY_GROUPS = ["CT1", "AT4", "CE7", "FD6"] as const;
type FunCategoryGroup = (typeof FUN_CATEGORY_GROUPS)[number];

interface FetchPlacesParams {
  x: string; // 경도
  y: string; // 위도
  radius: string; // m 단위
  categoryGroup: FunCategoryGroup;
}

/**
 * 카카오 로컬 API를 category_group_code 하나 기준으로 호출
 */
async function fetchPlacesByGroupCode(
  params: FetchPlacesParams,
): Promise<PlaceDTO[]> {
  const { x, y, radius, categoryGroup } = params;

  if (!KAKAO_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY is not configured");
  }

  const res = await axios.get<KakaoPlaceResponse>(KAKAO_BASE_URL, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_API_KEY}`,
    },
    params: {
      category_group_code: categoryGroup,
      x,
      y,
      radius,
      sort: "distance",
      size: 15,
    },
  });

  return res.data.documents.map(toPlaceDTO);
}

/**
 * ─────────────────────
 * 1) GET /api/places
 *    → 카카오 주변 장소 그냥 긁어오기
 * ─────────────────────
 */
router.get("/", async (req, res) => {
  try {
    const { x, y, radius } = req.query;

    if (!x || !y) {
      return res.status(400).json({
        ok: false,
        error: "x(경도)와 y(위도)는 필수입니다.",
      });
    }

    const radiusStr =
      typeof radius === "string" && radius.trim() !== ""
        ? radius.trim()
        : "2000";

    const results = await Promise.all(
      FUN_CATEGORY_GROUPS.map((code) =>
        fetchPlacesByGroupCode({
          x: String(x),
          y: String(y),
          radius: radiusStr,
          categoryGroup: code,
        }),
      ),
    );

    const mergedMap = new Map<string, PlaceDTO>();
    results.flat().forEach((place) => {
      mergedMap.set(place.id, place);
    });

    const places = Array.from(mergedMap.values());

    return res.json({
      ok: true,
      count: places.length,
      places,
    });
  } catch (error) {
    console.error("[GET /api/places] Error:", error);

    return res.status(500).json({
      ok: false,
      error: "주변 장소 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * ─────────────────────
 * 2) GET /api/places/recommend-by-taste
 *    → 예전 "개인 취향 기반 추천" (바로 Kakao 호출)
 * ─────────────────────
 */
router.get(
  "/recommend-by-taste",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const { currentUser } = req as AuthedRequest;

      if (!currentUser) {
        return res.status(401).json({
          ok: false,
          error: "로그인이 필요합니다.",
        });
      }

      const { x, y, radius } = req.query;

      let lat: number;
      let lng: number;

      if (x && y) {
        // 쿼리로 들어온 x,y를 사용하는 기존 방식 유지
        lng = Number(x);
        lat = Number(y);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          return res.status(400).json({
            ok: false,
            error: "x, y는 숫자여야 합니다.",
          });
        }
      } else {
        // x,y 가 없으면 LiveLocation 기반 현재 위치 사용
        try {
          const live = await getUserLiveLocationOrThrow(currentUser.id);
          lat = live.lat;
          lng = live.lng;
        } catch (e) {
          console.warn(
            `[GET /api/places/recommend-by-taste] LiveLocation 없음 user=${currentUser.id}`,
          );
          return res.status(400).json({
            ok: false,
            error:
              "현재 위치 정보가 없습니다. 먼저 위치 권한을 허용하고 앱에서 이동을 한 번 해 주세요.",
          });
        }
      }

      const radiusNum =
        typeof radius === "string" && radius.trim() !== ""
          ? Number(radius)
          : 2000;

      const places = await getPlacesRecommendedByTaste(
        currentUser.id,
        lat,
        lng,
        radiusNum,
      );

      return res.json({
        ok: true,
        count: places.length,
        places,
      });
    } catch (error) {
      console.error("[GET /api/places/recommend-by-taste] Error:", error);
      return res.status(500).json({
        ok: false,
        error: "취향 기반 추천 조회 중 오류가 발생했습니다.",
      });
    }
  },
);

/**
 * ─────────────────────
 * 3) GET /api/places/recommend-unified
 *    → 개인/길드 통합 추천 (Recommendation 테이블 기반)
 *      - 길드원 근처에 있으면 GUILD 모드
 *      - 아니면 PERSONAL 모드
 *      - PERSONAL에서 추천이 하나도 없으면
 *        → getPlacesRecommendedByTaste로 생성 후 다시 조회
 * ─────────────────────
 */
router.get(
  "/recommend-unified",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const { currentUser } = req as AuthedRequest;
      if (!currentUser) {
        return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
      }

      const userId = currentUser.id;

      // 1) 내 LiveLocation (없으면 길드 판정은 못하고 → PERSONAL 강제)
      const meLive = await prisma.liveLocation.findUnique({
        where: { userId },
      });

      // 2) 내가 속한 길드들 (GuildMembership 기준)
      const myGuilds = await prisma.guildMembership.findMany({
        where: { userId },
        select: {
          guildId: true,
          guild: { select: { id: true, name: true } },
        },
      });

      const guildIds = myGuilds.map((g) => g.guildId);

      // 3) 같은 길드원 중 “근처에 있는 사람”이 1명 이상인지 확인
      let hasNearbyGuildmate = false;
      let selectedGuildId: number | null = null;
      let selectedGuildName: string | undefined;

      if (
        meLive &&
        meLive.lat != null &&
        meLive.lng != null &&
        guildIds.length > 0
      ) {
        const guildMemberUserIds = (
          await prisma.guildMembership.findMany({
            where: { guildId: { in: guildIds } },
            select: { userId: true },
          })
        )
          .map((m) => m.userId)
          .filter((id) => id !== userId);

        if (guildMemberUserIds.length > 0) {
          const liveGuildmates = await prisma.liveLocation.findMany({
            where: {
              userId: { in: guildMemberUserIds },
            },
            include: {
              user: {
                select: {
                  guildMemberships: {
                    select: {
                      guildId: true,
                      guild: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          });

          for (const gm of liveGuildmates) {
            if (gm.lat == null || gm.lng == null) continue;

            const dist = distanceMeters(
              meLive.lat,
              meLive.lng,
              gm.lat,
              gm.lng,
            );

            if (dist <= NEARBY_RADIUS_M) {
              hasNearbyGuildmate = true;

              const gmGuild = gm.user.guildMemberships[0]?.guild;
              if (gmGuild) {
                selectedGuildId = gmGuild.id;
                selectedGuildName = gmGuild.name;
              }
              break;
            }
          }
        }
      } else {
        console.log(
          "[/api/places/recommend-unified] LiveLocation 없음 또는 길드 없음 → PERSONAL 모드로 진행",
        );
      }

      let mode: "PERSONAL" | "GUILD" = "PERSONAL";
      let places: any[] = [];
      let achieved: any[] = [];

      // ──────────────────
      // 3-1) GUILD 모드
      // ──────────────────
      if (hasNearbyGuildmate && selectedGuildId) {
        mode = "GUILD";

        const pending = await prisma.recommendation.findMany({
          where: {
            source: "GUILD",
            guildId: selectedGuildId,
            status: "PENDING",
          },
          orderBy: { createdAt: "desc" },
        });

        const visited = await prisma.recommendation.findMany({
          where: {
            source: "GUILD",
            guildId: selectedGuildId,
            status: "VISITED",
          },
          orderBy: { visitedAt: "desc" },
          take: 20,
        });

        places = pending;
        achieved = visited;
      } else {
        // ──────────────────
        // 3-2) PERSONAL 모드
        // ──────────────────
        mode = "PERSONAL";

        let pending = await prisma.recommendation.findMany({
          where: {
            source: "PERSONAL",
            userId,
            status: "PENDING",
          },
          orderBy: { createdAt: "desc" },
        });

        let visited = await prisma.recommendation.findMany({
          where: {
            source: "PERSONAL",
            userId,
            status: "VISITED",
          },
          orderBy: { visitedAt: "desc" },
          take: 20,
        });

        // 아직 아무 추천도 없다면 → 취향 기반으로 한 번 생성
        if (pending.length === 0 && visited.length === 0 && meLive) {
          const radiusNum = 2000;
          const tastePlaces = await getPlacesRecommendedByTaste(
            userId,
            meLive.lat,
            meLive.lng,
            radiusNum,
          );

          if (tastePlaces.length > 0) {
            await prisma.recommendation.createMany({
              data: tastePlaces.map((p: any) => ({
                userId,
                guildId: null,
                source: "PERSONAL",
                kakaoPlaceId: p.id,
                name: p.name,
                categoryName: p.categoryName,
                categoryGroupCode: p.categoryGroupCode,
                mappedCategory: (p.mappedCategory ?? "기타") as string,
                lat: p.y,
                lng: p.x,
                roadAddress: p.roadAddress ?? null,
                address: p.address ?? null,
                phone: p.phone ?? null,
                status: "PENDING",
                reason: "PERSONAL_TASTE_AROUND_ME",
              })),
            });

            // 다시 조회
            pending = await prisma.recommendation.findMany({
              where: {
                source: "PERSONAL",
                userId,
                status: "PENDING",
              },
              orderBy: { createdAt: "desc" },
            });
          }
        }

        places = pending;
        achieved = visited;
      }

      return res.json({
        ok: true,
        mode,
        guildId: selectedGuildId,
        guildName: selectedGuildName,
        count: places.length,
        places,
        achieved,
      });
    } catch (err) {
      console.error("GET /api/places/recommend-unified error:", err);
      return res.status(500).json({
        ok: false,
        error: "SERVER_ERROR",
      });
    }
  },
);

/**
 * ─────────────────────
 * 4) POST /api/places/optimize
 *    → 카카오 모빌리티 경로 최적화 API
 * ─────────────────────
 */
router.post("/optimize", async (req, res) => {
  try {
    if (!KAKAO_MOBILITY_KEY) {
      return res.status(500).json({
        ok: false,
        error: "KAKAO_MOBILITY_REST_KEY is not configured",
      });
    }

    const { origin, destination, waypoints = [], priority = "RECOMMEND" } =
      req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        ok: false,
        error: "origin, destination은 필수입니다.",
      });
    }

    const params: any = {
      origin,
      destination,
      priority,
      road_details: true,
    };

    if (Array.isArray(waypoints) && waypoints.length > 0) {
      params.waypoints = waypoints.join("|");
    }

    const kakaoRes = await axios.get(
      "https://apis-navi.kakaomobility.com/v1/directions",
      {
        params,
        headers: {
          Authorization: `KakaoAK ${KAKAO_MOBILITY_KEY}`,
          KA: "sdk/1.0 os=web origin=http://localhost",
        },
      },
    );

    return res.json(kakaoRes.data);
  } catch (err: any) {
    console.error("/api/places/optimize error:", err.response?.data || err);
    return res.status(500).json({
      ok: false,
      error: err.response?.data || "kakao-mobility-request-failed",
    });
  }
});

export default router;
