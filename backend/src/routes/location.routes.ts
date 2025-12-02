// backend/src/routes/location.routes.ts
import { Router, type Request, type Response } from "express";
import authRequired, { type AuthedRequest } from "../middlewares/authRequired";
import prisma from "../lib/prisma";

const router = Router();

// 간단 거리 계산 (미터)
function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // m
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

/**
 * ✅ POST /api/location/update
 * body: { lat: number, lng: number }
 *
 * - LiveLocation: 항상 최신 위치로 upsert
 * - Stay:
 *    · 마지막 Stay가 50m 이내 & 5분 이내면 → endTime만 갱신
 *    · 아니면 새 Stay 생성 (startTime = endTime = now)
 */
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
          message: "lat / lng는 숫자여야 합니다.",
        });
      }

      const userId = currentUser.id;
      const now = new Date();

      // 1) LiveLocation upsert
      await prisma.liveLocation.upsert({
        where: { userId },
        update: {
          lat: latNum,
          lng: lngNum,
          updatedAt: now,
        },
        create: {
          userId,
          lat: latNum,
          lng: lngNum,
        },
      });

      // 2) Stay 처리
      // 2-1) 이 유저의 마지막 Stay 하나 가져오기
      const lastStay = await prisma.stay.findFirst({
        where: { userId },
        orderBy: { startTime: "desc" },
      });

      const MAX_DISTANCE_M = 50; // 50m 이내면 같은 장소로 간주
      const MAX_GAP_MS = 5 * 60 * 1000; // 마지막 endTime 이후 5분 이내

      if (lastStay) {
        const dist = distanceMeters(
          lastStay.lat,
          lastStay.lng,
          latNum,
          lngNum,
        );
        const end = lastStay.endTime;
        const gap = now.getTime() - end.getTime();

        if (dist <= MAX_DISTANCE_M && gap <= MAX_GAP_MS) {
          // 👉 같은 장소에 계속 머무르는 중으로 보고 endTime만 갱신
          await prisma.stay.update({
            where: { id: lastStay.id },
            data: {
              endTime: now,
            },
          });

          return res.json({
            ok: true,
            mode: "update",
            stayId: lastStay.id,
          });
        }
      }

      // 👉 여기까지 왔으면 새 Stay 시작
      const newStay = await prisma.stay.create({
        data: {
          userId,
          lat: latNum,
          lng: lngNum,
          startTime: now,
          endTime: now,
          // kakaoPlaceId / categoryName 등은 나중에 붙여도 됨
        },
      });

      return res.json({
        ok: true,
        mode: "create",
        stayId: newStay.id,
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
