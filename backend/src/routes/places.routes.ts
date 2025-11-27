// src/routes/places.routes.ts
import express, { Request, Response } from 'express';
import axios from 'axios';
import authRequired from '../middlewares/authRequired';
import type { AuthedRequest } from '../middlewares/authRequired';
import { getPlacesRecommendedByTaste } from '../services/recommendation.service';

const router = express.Router();

// 카카오 로컬 API 기본 URL
const KAKAO_BASE_URL =
  'https://dapi.kakao.com/v2/local/search/category.json';

// .env 에서 가져오는 카카오 REST API 키
const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_MOBILITY_KEY = process.env.KAKAO_MOBILITY_REST_KEY; // ⭐ 추가됨

if (!KAKAO_API_KEY) {
  console.warn(
    '[WARN] KAKAO_REST_API_KEY is not set. /api/places 호출 시 오류가 날 수 있습니다.',
  );
}
if (!KAKAO_MOBILITY_KEY) {
  console.warn(
    '[WARN] KAKAO_MOBILITY_REST_KEY is not set. /api/places/optimize 호출 시 오류가 날 수 있습니다.',
  );
}

/**
 * 카카오 로컬 API 응답 중 우리가 쓰는 필드들 타입
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
  | '영화'
  | '공연'
  | '전시'
  | '문화시설'
  | '관광명소'
  | '카페'
  | '식당'
  | '기타';

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

/**
 * category_group_code + category_name 기반 서비스용 카테고리 매핑
 */
function mapCategory(doc: KakaoPlaceDocument): MappedCategory {
  const group = doc.category_group_code;
  const name = doc.category_name ?? '';

  if (group === 'CT1') {
    if (name.includes('영화')) return '영화';
    if (
      name.includes('공연') ||
      name.includes('아트홀') ||
      name.includes('뮤지컬') ||
      name.includes('라이브')
    )
      return '공연';
    if (
      name.includes('전시') ||
      name.includes('미술') ||
      name.includes('갤러리')
    )
      return '전시';
    return '문화시설';
  }

  if (group === 'AT4') {
    return '관광명소';
  }

  if (group === 'CE7') {
    return '카페';
  }

  if (group === 'FD6') {
    return '식당';
  }

  return '기타';
}

/**
 * Kakao 응답 → 프론트에 넘길 DTO 변환
 */
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

// 우리가 "놀거리"로 볼 카테고리 그룹 코드들
const FUN_CATEGORY_GROUPS = ['CT1', 'AT4', 'CE7', 'FD6'] as const;
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
    throw new Error('KAKAO_REST_API_KEY is not configured');
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
      sort: 'distance',
      size: 15,
    },
  });

  return res.data.documents.map(toPlaceDTO);
}

/**
 * GET /api/places
 */
router.get('/', async (req, res) => {
  try {
    const { x, y, radius } = req.query;

    if (!x || !y) {
      return res.status(400).json({
        ok: false,
        error: 'x(경도)와 y(위도)는 필수입니다.',
      });
    }

    const radiusStr =
      typeof radius === 'string' && radius.trim() !== ''
        ? radius.trim()
        : '2000';

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
    console.error('[GET /api/places] Error:', error);

    return res.status(500).json({
      ok: false,
      error: '주변 장소 조회 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/places/recommend-by-taste
 * 내 취향 분석(카테고리 비율) + 현재 위치 기반 추천 장소
 */
router.get(
  '/recommend-by-taste',
  authRequired,
  async (req: Request, res: Response) => {
    try {
      // ✅ authRequired를 지난 뒤에는 currentUser가 설정되어 있다고 가정
      const { currentUser } = req as AuthedRequest;

      if (!currentUser) {
        return res.status(401).json({
          ok: false,
          error: '로그인이 필요합니다.',
        });
      }

      const { x, y, radius } = req.query;

      if (!x || !y) {
        return res.status(400).json({
          ok: false,
          error: 'x(경도)와 y(위도)는 필수입니다.',
        });
      }

      const lng = Number(x);
      const lat = Number(y);
      const radiusNum =
        typeof radius === 'string' && radius.trim() !== ''
          ? Number(radius)
          : 2000;

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({
          ok: false,
          error: 'x, y는 숫자여야 합니다.',
        });
      }

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
      console.error('[GET /api/places/recommend-by-taste] Error:', error);
      return res.status(500).json({
        ok: false,
        error: '취향 기반 추천 조회 중 오류가 발생했습니다.',
      });
    }
  },
);

/**
 * ⭐ POST /api/places/optimize
 * 카카오 모빌리티 경로 최적화 API
 */
// 맨 위에 있던 import와 router, 기존 GET('/') 라우트들은 그대로 두고,
// router.get('/', ...) 밑에 이걸 넣어주세요.

router.post('/optimize', async (req, res) => {
  try {
    if (!KAKAO_MOBILITY_KEY) {
      return res.status(500).json({
        ok: false,
        error: 'KAKAO_MOBILITY_REST_KEY is not configured',
      });
    }

    const { origin, destination, waypoints = [], priority = 'RECOMMEND' } =
      req.body;

    if (!origin || !destination) {
      return res
        .status(400)
        .json({ ok: false, error: 'origin, destination은 필수입니다.' });
    }

    const params: any = {
      origin,
      destination,
      priority,
      road_details: true,
    };

    if (Array.isArray(waypoints) && waypoints.length > 0) {
      params.waypoints = waypoints.join('|');
    }

    const kakaoRes = await axios.get(
      'https://apis-navi.kakaomobility.com/v1/directions',
      {
        params,
        headers: {
          Authorization: `KakaoAK ${KAKAO_MOBILITY_KEY}`,
          KA: "sdk/1.0 os=web origin=http://localhost" // ⭐⭐ 핵심 FIX ⭐⭐
        },
      },
    );

    return res.json(kakaoRes.data);
  } catch (err: any) {
    console.error('/api/places/optimize error:', err.response?.data || err);
    return res.status(500).json({
      ok: false,
      error: err.response?.data || 'kakao-mobility-request-failed',
    });
  }
});



export default router;
