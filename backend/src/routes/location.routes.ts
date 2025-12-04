// src/routes/location.routes.ts
import { Router, type Response } from "express";
import authRequired, { type AuthedRequest } from "../middlewares/authRequired";
import prisma from "../lib/prisma";
import axios from "axios";

const router = Router();

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_LOCAL_BASE =
  "https://dapi.kakao.com/v2/local/search/category.json";

if (!KAKAO_API_KEY) {
  console.warn("[WARN] KAKAO_REST_API_KEY is not set.");
}

type TrackedCategory =
  | "영화"
  | "공연"
  | "전시"
  | "문화시설"
  | "관광명소"
  | "카페"
  | "식당";

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

const FUN_CATEGORY_GROUPS = ["CT1", "AT4", "CE7", "FD6"] as const;

const SEARCH_RADIUS = 200;
const MATCH_RADIUS = 50;

async function findStayedPlace(
  lat: number,
  lng: number,
): Promise<PlaceDTO | null> {
  if (!KAKAO_API_KEY) {
    console.warn("[WARN] KAKAO_REST_API_KEY not set, skip tagging");
    return null;
  }

  const x = String(lng);
  const y = String(lat);
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
        radius: SEARCH_RADIUS,
        sort: "distance",
        size: 15,
      },
    });

    res.data.documents.map(toPlaceDTO).forEach((p) => all.push(p));
  }

  if (all.length === 0) return null;

  const candidates = all
    .map((p) => ({
      place: p,
      dist: distanceMeters(lat, lng, p.y, p.x),
    }))
    .filter((item) => item.dist <= MATCH_RADIUS);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0].place;
}

// ====== 핵심 파라미터 ======
const MAX_DISTANCE_M = 50;
const MAX_GAP_MS = 5 * 60 * 1000;
// 🔥 테스트용: 10초 (실서비스에서는 10 * 60 * 1000 으로 바꾸면 됨)
const MIN_STAY_MS = 10 * 1000;

router.post(
  "/update",
  authRequired,
  async (req: AuthedRequest, res: Response) => {
    try {
      const { currentUser } = req;
      if (!currentUser) {
        return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
      }

      const { lat, lng } = req.body || {};
      const latNum = Number(lat);
      const lngNum = Number(lng);

      if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        console.warn("[/api/location/update] bad lat/lng:", lat, lng);
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "lat / lng는 숫자여야 합니다.",
        });
      }

      const userId = currentUser.id;
      const now = new Date();

      // 1) LiveLocation upsert
      await prisma.liveLocation.upsert({
        where: { userId },
        update: { lat: latNum, lng: lngNum, updatedAt: now },
        create: { userId, lat: latNum, lng: lngNum },
      });

      // 2) Stay 처리
      let stay = await prisma.stay.findFirst({
        where: { userId },
        orderBy: { startTime: "desc" },
      });

      let mode: "create" | "update" = "create";

      if (stay) {
        const dist = distanceMeters(stay.lat, stay.lng, latNum, lngNum);
        const gap = now.getTime() - stay.endTime.getTime();

        if (dist <= MAX_DISTANCE_M && gap <= MAX_GAP_MS) {
          // 같은 장소 계속 머무는 중
          stay = await prisma.stay.update({
            where: { id: stay.id },
            data: { endTime: now },
          });
          mode = "update";
        } else {
          // 다른 장소로 이동 → 새 stay
          stay = await prisma.stay.create({
            data: {
              userId,
              lat: latNum,
              lng: lngNum,
              startTime: now,
              endTime: now,
            },
          });
          mode = "create";
        }
      } else {
        // 첫 stay
        stay = await prisma.stay.create({
          data: {
            userId,
            lat: latNum,
            lng: lngNum,
            startTime: now,
            endTime: now,
          },
        });
        mode = "create";
      }

      const durationMs =
        stay.endTime.getTime() - stay.startTime.getTime();

      let tagged = false;

      // ====== duration 로그 ======
      console.log(
        `[/api/location/update] user=${userId}, stayId=${stay.id}, mode=${mode}, durationMs=${durationMs}`,
      );

      // 3) 10초 이상 & 아직 카테고리 없는 stay → 태깅 시도
      if (durationMs >= MIN_STAY_MS && !stay.mappedCategory) {
        console.log(
          `⏰ [StayTag] user=${userId}, stayId=${stay.id} 가 ${
            MIN_STAY_MS / 1000
          }초 이상 머무름 → 카카오 태깅 시도`,
        );

        const place = await findStayedPlace(stay.lat, stay.lng);

        if (place && place.mappedCategory) {
          // 3-1) Stay 태깅
          const updatedStay = await prisma.stay.update({
            where: { id: stay.id },
            data: {
              kakaoPlaceId: place.id,
              categoryName: place.categoryName,
              categoryGroupCode: place.categoryGroupCode,
              mappedCategory: place.mappedCategory,
            },
          });

          console.log(
            `🟢 [StayTagged] user=${userId}, stayId=${stay.id}, category=${place.mappedCategory}, place=${place.name}`,
          );

          tagged = true;

          // 3-2) Recommendation 달성 처리 (개인 + 연맹)
          try {
            const guildMemberships = await prisma.guildMember.findMany({
              where: { userId },
              select: { guildId: true },
            });
            const guildIds = guildMemberships.map((g) => g.guildId);

            await prisma.recommendation.updateMany({
              where: {
                kakaoPlaceId: place.id,
                status: "PENDING",
                OR: [
                  { userId },
                  { guildId: { in: guildIds } },
                ],
              },
              data: {
                status: "VISITED",
                visitedAt: new Date(),
              },
            });

            console.log(
              `🏁 [RecommendationVisited] user=${userId}, kakaoPlaceId=${place.id}, guildCount=${guildIds.length}`,
            );
          } catch (e) {
            console.error(
              "[Stay] Recommendation VISITED 처리 실패:",
              e,
            );
          }
        } else {
          console.log(
            `🟡 [StayTagSkipped] user=${userId}, stayId=${stay.id} → ${
              MIN_STAY_MS / 1000
            }초 이상 머물렀지만 매칭 장소 없음`,
          );
        }
      }

      return res.json({
        ok: true,
        mode,
        stayId: stay.id,
        tagged,
        durationMs,
      });
    } catch (err) {
      console.error("❌ POST /api/location/update 에러:", err);
      return res.status(500).json({
        ok: false,
        error: "SERVER_ERROR",
      });
    }
  },
);

export default router;
