/// <reference path="../types/session.d.ts" />
// src/routes/tasteDashboard.routes.ts

import { Router, type Request, type Response } from "express";
import authRequired from "../middlewares/authRequired";
import { prisma } from "../lib/prisma";

const router = Router();

// 우리가 추적하는 7개 카테고리
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

interface CategoryStat {
  key: TrackedCategory;
  label: string;
  count: number;
  ratio: number;       // 0 ~ 1 사이
  percentage: number; // 0 ~ 100 (소수점 1자리)
}

/**
 * GET /api/taste/dashboard
 *  - 로그인 유저의 Stay 기록을 기반으로
 *  - 7개 카테고리별 비율(%)을 계산해 반환
 *
 *  응답 예:
 *  {
 *    "ok": true,
 *    "totalStays": 3,
 *    "categories": [
 *      { "key": "영화", "label": "영화", "count": 1, "ratio": 0.33, "percentage": 33.3 },
 *      ...
 *    ]
 *  }
 */
router.get(
  "/dashboard",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const currentUser = req.currentUser!;
      const userIdNum = Number(currentUser.id);

      if (Number.isNaN(userIdNum)) {
        return res.status(500).json({
          ok: false,
          error: "INVALID_SESSION_USER_ID",
        });
      }

      // 1) mappedCategory가 null이 아닌 Stay만 모아서 카테고리별 count
      const grouped = await prisma.stay.groupBy({
        by: ["mappedCategory"],
        where: {
          userId: userIdNum,
          mappedCategory: { not: null },
        },
        _count: {
          _all: true,
        },
      });

      // 2) 전체 개수: total stays with category
      const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

      // total이 0이면 모든 비율 0%
      const stats: CategoryStat[] = TRACKED_CATEGORIES.map((cat) => {
        const row = grouped.find((g) => g.mappedCategory === cat);
        const count = row?._count._all ?? 0;

        const ratio = total > 0 ? count / total : 0;
        const percentage =
          total > 0 ? Math.round(ratio * 1000) / 10 : 0; // 소수점 1자리 반올림

        return {
          key: cat,
          label: cat,
          count,
          ratio,
          percentage,
        };
      });

      return res.json({
        ok: true,
        totalStays: total,
        categories: stats,
      });
    } catch (err) {
      console.error("❌ GET /api/taste/dashboard 에러:", err);
      return res.status(500).json({
        ok: false,
        error: "SERVER_ERROR",
      });
    }
  },
);

export default router;
