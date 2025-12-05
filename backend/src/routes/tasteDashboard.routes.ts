/// <reference path="../types/session.d.ts" />

import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import authRequired from "../middlewares/authRequired";

const router = Router();
const prisma = new PrismaClient();

// 우리가 추적하는 취향 카테고리 7개 (Stay.mappedCategory와 맞춰야 함)
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

// Stay 기반 weight 계산
async function buildTasteWeights(userId: number): Promise<{
  weights: Record<TrackedCategory, number>;
  totalStays: number;
}> {
  const grouped = await prisma.stay.groupBy({
    by: ["mappedCategory"],
    where: {
      userId,
      mappedCategory: { not: null },
    },
    _count: { _all: true },
  });

  const totalStays = grouped.reduce((sum, g) => sum + g._count._all, 0);

  const weights: Record<TrackedCategory, number> = {
    영화: 0,
    공연: 0,
    전시: 0,
    문화시설: 0,
    관광명소: 0,
    카페: 0,
    식당: 0,
  };

  if (totalStays === 0) {
    // 아직 머문 장소가 하나도 없음 → 전부 0%
    return { weights, totalStays: 0 };
  }

  TRACKED_CATEGORIES.forEach((cat) => {
    const row = grouped.find((g) => g.mappedCategory === cat);
    const count = row?._count._all ?? 0;
    weights[cat] = count / totalStays; // 비율 0~1
  });

  return { weights, totalStays };
}

/**
 * ✅ GET /api/taste-dashboard/me
 *
 * - 현재 유저의 Stay를 기반으로 카테고리 비율 계산
 * - 그 결과를 TasteRecord 테이블에 upsert
 *   (category = 'DASHBOARD' 인 레코드를 취향 대시보드로 사용)
 * - 계산 결과(weight + totalStays)를 그대로 응답으로 돌려줌
 */
router.get(
  "/me",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const user = req.currentUser!;
      const userId = Number(user.id);

      if (Number.isNaN(userId)) {
        return res
          .status(500)
          .json({ ok: false, error: "INVALID_USER_ID" });
      }

      const { weights, totalStays } = await buildTasteWeights(userId);

      // TasteRecord에 "대시보드 스냅샷" 저장
      const tagsJson = JSON.stringify(weights);

      const tasteRecord = await prisma.tasteRecord.upsert({
        where: {
          // 🔥 userId + category 조합으로 "나의 취향 대시보드" 1개만 관리
          userId_category: {
            userId,
            category: "DASHBOARD",
          },
        },
        create: {
          userId,
          title: "나의 취향 대시보드",
          desc: "최근 머문 장소들을 기반으로 계산된 문화 취향 비율입니다.",
          content: null,
          recordedAt: new Date(),
          category: "DASHBOARD",
          tagsJson,
        },
        update: {
          desc: "최근 머문 장소들을 기반으로 다시 계산된 취향 비율입니다.",
          recordedAt: new Date(),
          tagsJson,
        },
      });

      return res.json({
        ok: true,
        totalStays,
        weights,
        tasteRecordId: tasteRecord.id,
      });
    } catch (err) {
      console.error("❌ GET /api/taste-dashboard/me 에러:", err);
      return res
        .status(500)
        .json({ ok: false, error: "SERVER_ERROR" });
    }
  },
);

export default router;
