// src/routes/tasteDashboard.routes.ts
import { Router, type Request, type Response } from "express";
import authRequired, { type AuthedRequest } from "../middlewares/authRequired";
import prisma from "../lib/prisma";
import { TRACKED_CATEGORIES } from "../services/recommendation.service";

const router = Router();

// GET /api/taste-dashboard
router.get(
  "/",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const { currentUser } = req as AuthedRequest;
      if (!currentUser) {
        return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
      }
      const userId = currentUser.id;

      const grouped = await prisma.stay.groupBy({
        by: ["mappedCategory"],
        where: {
          userId,
          mappedCategory: { not: null },
        },
        _count: { _all: true },
      });

      const total = grouped.reduce((s, g) => s + g._count._all, 0);

      const counts: Record<string, number> = {};
      const ratios: Record<string, number> = {};
      TRACKED_CATEGORIES.forEach((c) => {
        const row = grouped.find((g) => g.mappedCategory === c);
        const cnt = row?._count._all ?? 0;
        counts[c] = cnt;
        ratios[c] = total > 0 ? cnt / total : 0;
      });

      return res.json({
        ok: true,
        totalStays: total,
        counts,
        ratios,
      });
    } catch (err) {
      console.error("❌ GET /api/taste-dashboard 에러:", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  },
);

export default router;
