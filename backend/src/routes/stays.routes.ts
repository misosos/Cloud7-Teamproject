/// <reference path="../types/session.d.ts" />
// src/routes/stays.routes.ts

import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import authRequired from "../middlewares/authRequired";
import axios from "axios";

const router = Router();
const prisma = new PrismaClient();

// .env
const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_LOCAL_BASE =
  "https://dapi.kakao.com/v2/local/search/category.json";

// 카카오에서 볼 그룹코드 (문화시설, 관광명소, 카페, 식당)
const FUN_CATEGORY_GROUPS = ["CT1", "AT4", "CE7", "FD6"] as const;
type FunCategoryGroup = (typeof FUN_CATEGORY_GROUPS)[number];

// ✅ 우리가 "추적할" 최종 취향 카테고리 7개 (기타 없음)
export type TrackedCategory =
  | "영화"
  | "공연"
  | "전시"
  | "문화시설"
  | "관광명소"
  | "카페"
  | "식당";

const TRACKED_CATEGORIES: TrackedCategory[] = [
  "영화",
  "공연",
  "전시",
  "문화시설",
  "관광명소",
  "카페",
  "식당",
];

// 카카오 응답 타입
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

interface PlaceDTO {
  id: string;
  name: string;
  categoryName: string;
  categoryGroupCode: string;
  mappedCategory: TrackedCategory | null; // 7개 중 하나거나, 추적 대상 아니면 null
  x: number;
  y: number;
  phone: string;
  roadAddress: string;
  address: string;
}

/**
 * 카카오 category_group_code + category_name → 우리 카테고리(7개) 매핑
 *  - 추적 대상 아니면 null
 */
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
    // 나머지 CT1은 넓게 "문화시설"로
    return "문화시설";
  }

  if (group === "AT4") return "관광명소";
  if (group === "CE7") return "카페";
  if (group === "FD6") return "식당";

  // 우리가 안 볼 그룹코드면 null
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

// 하버사인 거리(m)
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
 * ✅ "머문 장소 그 자체" 찾기
 *  - 현재 위치 기준으로 CT1/AT4/CE7/FD6 카테고리를 반경 SEARCH_RADIUS 안에서 조회
 *  - 그 중에서 현재 위치와 거리 ≤ MATCH_RADIUS 인 것만 "내가 그 장소에 있다"로 인정
 *  - 그 후보들 중 가장 가까운 하나를 반환
 *  - 없으면 null
 */
const SEARCH_RADIUS = 200; // 카카오 검색 반경 (m)
const MATCH_RADIUS = 50;   // 이 거리 이내여야 "그 장소에 있다"고 인정

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

  const allResults: PlaceDTO[] = [];

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

    res.data.documents.map(toPlaceDTO).forEach((p) => allResults.push(p));
  }

  if (allResults.length === 0) return null;

  // 현재 위치와 MATCH_RADIUS 이내인 장소만 후보로
  const candidates = allResults
    .map((p) => ({
      place: p,
      dist: distanceMeters(lat, lng, p.y, p.x),
    }))
    .filter((item) => item.dist <= MATCH_RADIUS);

  if (candidates.length === 0) {
    // 주변에 문화/관광/카페/식당이 있지만, 너무 멀면 "그 장소에 있는 것"으로 보지 않음
    return null;
  }

  // 그중 가장 가까운 한 곳 선택
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0].place;
}

/**
 * POST /api/stays
 * body: { lat: number, lng: number, startTime: number, endTime: number }
 *  - 10분 머무름 감지 시 한 번 호출
 *  - 현재 위치에 "실제로 있는" 장소의 카테고리가
 *    7개 추적 카테고리 중 하나일 때만 DB에 저장
 */
router.post("/", authRequired, async (req: Request, res: Response) => {
  try {
    const currentUser = req.currentUser!;
    const { lat, lng, startTime, endTime } = req.body || {};

    const userIdNum = Number(currentUser.id);
    if (Number.isNaN(userIdNum)) {
      console.error("❌ invalid currentUser.id:", currentUser.id);
      return res.status(500).json({
        ok: false,
        error: "INVALID_SESSION_USER_ID",
      });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return res.status(400).json({
        ok: false,
        error: "BAD_REQUEST",
        message: "lat/lng가 올바르지 않습니다.",
      });
    }

    const start =
      typeof startTime === "number" ? new Date(startTime) : new Date();
    const end =
      typeof endTime === "number" ? new Date(endTime) : new Date();

    // 🔍 현재 머문 장소 자체 찾기
    const stayedPlace = await findStayedPlace(latNum, lngNum);

    // 주변에 매칭되는 장소가 없으면 → 저장 스킵
    if (!stayedPlace) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "NO_PLACE_MATCH",
      });
    }

    // 카테고리가 7개 추적 카테고리 중 하나가 아니면 → 저장 스킵
    if (!stayedPlace.mappedCategory) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "CATEGORY_NOT_TRACKED",
      });
    }

    // (여기까지 왔으면 stayedPlace.mappedCategory는 7개 중 하나)
    const stay = await prisma.stay.create({
      data: {
        userId: userIdNum,
        lat: latNum,
        lng: lngNum,
        startTime: start,
        endTime: end,
        kakaoPlaceId: stayedPlace.id,
        categoryName: stayedPlace.categoryName,
        categoryGroupCode: stayedPlace.categoryGroupCode,
        mappedCategory: stayedPlace.mappedCategory,
      },
    });

    return res.status(201).json({ ok: true, stay });
  } catch (err) {
    console.error("❌ POST /api/stays 에러:", err);
    return res
      .status(500)
      .json({ ok: false, error: "SERVER_ERROR" });
  }
});

export default router;
