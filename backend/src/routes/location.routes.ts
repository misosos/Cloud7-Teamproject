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

// ── 타입들 ─────────────────────────────────────────
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

// ── 유틸: 거리 계산 ────────────────────────────────
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

// stay 판정용 파라미터
const MAX_DISTANCE_M = 1000;             // 같은 장소로 볼 거리 (1km)
const MAX_GAP_MS = 5 * 60 * 1000;        // 5분 이내면 같은 stay
const MIN_STAY_MS = 5 * 60 * 1000;       // 🔥 5분 이상 머물러야 최종 "머문장소" 인정

const SEARCH_RADIUS = 1000;              // Kakao 검색 반경 (1km)
const MATCH_RADIUS = 1000;               // 검색 결과와 실제 위치 매칭 반경 (1km)

// 현재 위치 주변 Kakao 장소 1개 매칭 (가장 가까운 것)
async function findStayedPlace(
  lat: number,
  lng: number,
): Promise<PlaceDTO | null> {
  if (!KAKAO_API_KEY) return null;

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

// 현재 위치 주변 Kakao 장소 여러 개 반환 (1km 반경 내 모든 장소)
async function findNearbyPlaces(
  lat: number,
  lng: number,
): Promise<PlaceDTO[]> {
  if (!KAKAO_API_KEY) return [];

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

  if (all.length === 0) return [];

  // kakaoPlaceId 기준 중복 제거
  const dedup = new Map<string, PlaceDTO>();
  all.forEach((p) => dedup.set(p.id, p));

  // 1km 반경 내 장소만 필터링
  const nearby = Array.from(dedup.values())
    .map((p) => ({
      place: p,
      dist: distanceMeters(lat, lng, p.y, p.x),
    }))
    .filter((item) => item.dist <= MATCH_RADIUS)
    .map((item) => item.place);

  return nearby;
}

// ───────────────────────────────────────────────
// POST /api/location/update
//  - 현재 위치 저장(LiveLocation upsert)
//  - 5분 머문장소 → Stay 생성/갱신 + 카테고리 태깅
//  - 추천(Recommendation)과 연결: 방문한 장소면 stayId 세팅
// ───────────────────────────────────────────────
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
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "lat / lng 는 숫자여야 합니다.",
        });
      }

      const userId = currentUser.id;
      const now = new Date();

      // 1) LiveLocation upsert (현재 위치)
      // race condition 방지: 동시 요청 시 P2002 에러 발생 가능
      try {
        await prisma.liveLocation.upsert({
          where: { userId },
          update: { lat: latNum, lng: lngNum },
          create: { userId, lat: latNum, lng: lngNum },
        });
      } catch (err: any) {
        // P2002: Unique constraint failed - 동시 요청으로 인한 충돌
        if (err?.code === "P2002") {
          // 이미 레코드가 존재하므로 update로 재시도
          await prisma.liveLocation.update({
            where: { userId },
            data: { lat: latNum, lng: lngNum },
          });
        } else {
          throw err;
        }
      }

      // 2) Stay 처리 (이전 stay와 비교)
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
          // 다른 장소로 이동 → 새 stay 시작
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

      const durationMs = stay.endTime.getTime() - stay.startTime.getTime();
      let tagged = false;

      console.log(
        `[/api/location/update] user=${userId}, stayId=${stay.id}, mode=${mode}, durationMs=${durationMs}`,
      );

      // 3) 5분 이상 & 아직 카테고리 없는 stay → Kakao 태깅
      if (durationMs >= MIN_STAY_MS && !stay.mappedCategory) {
        console.log(
          `⏰ [StayTag] user=${userId}, stayId=${stay.id} 가 5분 이상 머무름 → 카카오 태깅 시도`,
        );

        const place = await findStayedPlace(stay.lat, stay.lng);

        if (place && place.mappedCategory) {
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

          // ✅ 이 머문 장소가 개인 Recommendation 테이블에 있으면 → 방문한 것으로 연결(stayId 세팅)
          // ✅ 없으면 자동으로 Recommendation 생성 (achieved 목록에 표시되도록)
          const existingRec = await prisma.recommendation.findFirst({
            where: {
              userId,
              kakaoPlaceId: place.id,
            },
          });

          if (existingRec) {
            // 이미 있으면 stayId만 업데이트
            await prisma.recommendation.update({
              where: { id: existingRec.id },
              data: {
                stayId: updatedStay.id,
              },
            });
          } else {
            // 없으면 새로 생성 (score는 기본값 0)
            await prisma.recommendation.create({
              data: {
                userId,
                stayId: updatedStay.id,
                kakaoPlaceId: place.id,
                name: place.name,
                categoryName: place.categoryName,
                categoryGroupCode: place.categoryGroupCode,
                mappedCategory: place.mappedCategory,
                x: place.x,
                y: place.y,
                score: 0,
              },
            });
            console.log(
              `✨ [RecommendationCreated] user=${userId}, kakaoPlaceId=${place.id}, place=${place.name}`,
            );
          }

          // ✅ 점수 지급은 기록 작성 시에만 지급 (GuildRecord 생성 시)
          // Stay 생성 시에는 자동 점수 지급하지 않음
        } else {
          console.log(
            `🟡 [StayTagSkipped] user=${userId}, stayId=${stay.id} → 5분 이상 머물렀지만 매칭 장소 없음`,
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

// ───────────────────────────────────────────────
// POST /api/location/clear
//  - 앱 종료/로그아웃 시 현재 위치 제거
// ───────────────────────────────────────────────
router.post(
  "/clear",
  authRequired,
  async (req: AuthedRequest, res: Response) => {
    try {
      const { currentUser } = req;
      if (!currentUser) {
        return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
      }

      await prisma.liveLocation.deleteMany({
        where: { userId: currentUser.id },
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error("❌ POST /api/location/clear 에러:", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  },
);

export default router;
