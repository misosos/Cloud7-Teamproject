/// <reference path="../types/session.d.ts" />
// src/routes/stays.routes.ts

import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import authRequired from "../middlewares/authRequired";

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/stays
 * body: { lat: number, lng: number, startTime?: number, endTime?: number }
 *  - userId는 절대 프론트에서 받지 않고, 무조건 세션의 currentUser.id 사용
 */
router.post("/", authRequired, async (req: Request, res: Response) => {
  try {
    // 🔒 authRequired 통과한 시점에서는 currentUser가 **반드시 존재**
    const currentUser = req.currentUser;
    if (!currentUser) {
      // 타입/미들웨어 꼬였을 때 대비용 (실제로 여기 오면 안 됨)
      return res.status(401).json({
        ok: false,
        error: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      });
    }

    const { lat, lng, startTime, endTime } = req.body || {};

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return res
        .status(400)
        .json({ ok: false, error: "BAD_REQUEST", message: "lat/lng가 올바르지 않습니다." });
    }

    // 프론트에서 ms 단위 timestamp를 넘긴다고 가정 → Date로 변환
    const start =
      typeof startTime === "number" ? new Date(startTime) : new Date();
    const end =
      typeof endTime === "number" ? new Date(endTime) : new Date();

    const stay = await prisma.stay.create({
      data: {
        userId: currentUser.id, // ✅ 세션의 로그인 유저 id로 연동
        lat: latNum,
        lng: lngNum,
        startTime: start,
        endTime: end,
      },
    });

    return res.status(201).json({ ok: true, stay });
  } catch (err) {
    console.error("❌ POST /api/stays 에러:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

export default router;
  