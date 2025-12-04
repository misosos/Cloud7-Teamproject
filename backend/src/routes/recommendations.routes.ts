// src/routes/recommendations.routes.ts
import { Router, type Request, type Response } from "express";
import authRequired, { type AuthedRequest } from "../middlewares/authRequired";
import prisma from "../lib/prisma";
import { getPlacesRecommendedByTaste } from "../services/recommendation.service";

const router = Router();

// 간단 거리 계산 (하버사인)
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

// 같은 길드원 “근처” 판정 반경
const NEARBY_RADIUS_M = 150;

router.get(
  "/unified",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const { currentUser } = req as AuthedRequest;
      if (!currentUser) {
        return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
      }

      const userId = currentUser.id;

      // 1) 내 LiveLocation (없어도 PERSONAL 모드로 fallback)
      const meLive = await prisma.liveLocation.findUnique({
        where: { userId },
      });

      // 2) 내가 속한 길드들 (GuildMembership 기준)
      const myGuilds = await prisma.guildMembership.findMany({
        where: { userId },
        select: {
          guildId: true,
          guild: { select: { id: true, name: true } },
        },
      });

      const guildIds = myGuilds.map((g) => g.guildId);

      // 3) 같은 길드원 중 “근처에 있는 사람”이 1명 이상인지 확인
      let hasNearbyGuildmate = false;
      let selectedGuildId: number | null = null;
      let selectedGuildName: string | undefined;

      if (
        meLive &&
        meLive.lat != null &&
        meLive.lng != null &&
        guildIds.length > 0
      ) {
        // 같은 길드에 속한 다른 유저들 ID 모으기
        const guildMemberUserIds = (
          await prisma.guildMembership.findMany({
            where: { guildId: { in: guildIds } },
            select: { userId: true },
          })
        )
          .map((m) => m.userId)
          .filter((id) => id !== userId);

        if (guildMemberUserIds.length > 0) {
          const liveGuildmates = await prisma.liveLocation.findMany({
            where: {
              userId: { in: guildMemberUserIds },
            },
            include: {
              user: {
                select: {
                  guildMemberships: {
                    select: {
                      guildId: true,
                      guild: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          });

          for (const gm of liveGuildmates) {
            if (gm.lat == null || gm.lng == null) continue;

            const dist = distanceMeters(
              meLive.lat,
              meLive.lng,
              gm.lat,
              gm.lng,
            );

            if (dist <= NEARBY_RADIUS_M) {
              hasNearbyGuildmate = true;

              // 일단 첫 번째 길드 하나 선택
              const gmGuild = gm.user.guildMemberships[0]?.guild;
              if (gmGuild) {
                selectedGuildId = gmGuild.id;
                selectedGuildName = gmGuild.name;
              }
              break;
            }
          }
        }
      } else {
        console.log(
          "[/api/recommendations/unified] LiveLocation 없음 또는 길드 없음 → PERSONAL 모드로 진행",
        );
      }

      let mode: "PERSONAL" | "GUILD" = "PERSONAL";
      let places: any[] = [];
      let achieved: any[] = [];

      if (hasNearbyGuildmate && selectedGuildId) {
        mode = "GUILD";

        const pending = await prisma.recommendation.findMany({
          where: {
            source: "GUILD",
            guildId: selectedGuildId,
            status: "PENDING",
          },
          orderBy: { createdAt: "desc" },
        });

        const visited = await prisma.recommendation.findMany({
          where: {
            source: "GUILD",
            guildId: selectedGuildId,
            status: "VISITED",
          },
          orderBy: { visitedAt: "desc" },
          take: 20,
        });

        places = pending;
        achieved = visited;
      } else {
        mode = "PERSONAL";

        const pending = await prisma.recommendation.findMany({
          where: {
            source: "PERSONAL",
            userId,
            status: "PENDING",
          },
          orderBy: { createdAt: "desc" },
        });

        const visited = await prisma.recommendation.findMany({
          where: {
            source: "PERSONAL",
            userId,
            status: "VISITED",
          },
          orderBy: { visitedAt: "desc" },
          take: 20,
        });

        places = pending;
        achieved = visited;
      }

      return res.json({
        ok: true,
        mode,
        guildId: selectedGuildId,
        guildName: selectedGuildName,
        count: places.length,
        places,
        achieved,
      });
    } catch (err) {
      console.error("GET /api/recommendations/unified error:", err);
      return res.status(500).json({
        ok: false,
        error: "SERVER_ERROR",
      });
    }
  },
);


export default router;
