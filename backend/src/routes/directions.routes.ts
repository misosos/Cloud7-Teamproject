// src/routes/directions.routes.ts

import { Router } from "express";
import axios from "axios";

const router = Router();

// server.ts 에서 import 'dotenv/config'를 했으니까 여기서 바로 process.env 사용 가능
const KAKAO_MOBILITY_API_KEY = process.env.KAKAO_MOBILITY_API_KEY;

if (!KAKAO_MOBILITY_API_KEY) {
  console.warn("⚠️ KAKAO_MOBILITY_API_KEY가 설정되어 있지 않습니다.");
}

/**
 * 다중 경유지 경로 요청 프록시
 * 프론트에서:
 *  POST /api/directions/optimize
 *  {
 *    "origin": "126.9784,37.5667",        // 출발지 lng,lat
 *    "destination": "127.0276,37.4979",   // 도착지 lng,lat
 *    "waypoints": ["126.99,37.5", ...],   // 선택 (없어도 됨)
 *    "priority": "RECOMMEND" | "TIME" | ...
 *  }
 */
router.post("/optimize", async (req, res) => {
  try {
    const { origin, destination, waypoints, priority } = req.body;

    if (!origin || !destination) {
      return res
        .status(400)
        .json({ error: "출발지(origin)와 목적지(destination)가 필요합니다." });
    }

    if (!KAKAO_MOBILITY_API_KEY) {
      return res
        .status(500)
        .json({ error: "서버에 KAKAO_MOBILITY_API_KEY가 설정되어 있지 않습니다." });
    }

    const params: any = {
      origin,
      destination,
      priority: priority || "RECOMMEND",
      road_details: true,
      alternatives: false,
    };

    if (Array.isArray(waypoints) && waypoints.length > 0) {
      params.waypoints = waypoints.join("|"); // "x1,y1|x2,y2|..."
    }

    const response = await axios({
      method: "get",
      url: "https://apis-navi.kakaomobility.com/v1/directions",
      headers: {
        Authorization: `KakaoAK ${KAKAO_MOBILITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      params,
    });

    // 일단은 Kakao 응답을 그대로 프론트로 전달 (나중에 최적화/가공 붙이면 됨)
    return res.json(response.data);
  } catch (error: any) {
    console.error("경로 최적화/카카오 API 오류:", error.message);
    return res.status(500).json({
      error: "서버 오류",
      message: error.message,
    });
  }
});

export default router;
