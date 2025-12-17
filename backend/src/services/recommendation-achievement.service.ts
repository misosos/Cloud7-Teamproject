// src/services/recommendation-achievement.service.ts
import prisma from "../lib/prisma";

/**
 * 추천 장소 달성 시 점수 지급
 * - Stay가 생성/업데이트되어 kakaoPlaceId가 설정될 때 호출
 * - 해당 kakaoPlaceId가 Recommendation 테이블에 있으면 달성으로 판단
 * - GUILD 모드일 때만 점수 지급
 * - 중복 방지: recommendationPointsAwardedAt이 NULL일 때만 지급
 * 
 * 테스트/검증 시나리오:
 * 1. 같은 achieved를 API가 3번 호출돼도 점수는 50점 1번만 증가
 *    - recommendationPointsAwardedAt 필드로 중복 방지
 *    - 트랜잭션으로 원자성 보장
 * 
 * 2. 달성 전에는 점수 증가 없음, 달성 순간에만 증가
 *    - Recommendation 테이블에 kakaoPlaceId가 있어야 달성으로 판단
 *    - Stay의 recommendationPointsAwardedAt이 NULL일 때만 지급
 * 
 * 3. 트랜잭션 실패 시 점수/달성상태 불일치 없게
 *    - Stay 업데이트와 GuildScore 업데이트를 같은 트랜잭션으로 처리
 *    - 실패 시 롤백되어 일관성 유지
 * 
 * 4. GUILD 모드가 아닐 때는 점수 지급 안 함
 *    - detectGuildContext로 모드 판정
 *    - PERSONAL 모드면 false 반환
 * 
 * @param userId 사용자 ID
 * @param stayId Stay ID
 * @param kakaoPlaceId 카카오 장소 ID
 * @param lat 위도 (GUILD 모드 판정용)
 * @param lng 경도 (GUILD 모드 판정용)
 * @returns 점수 지급 여부 (true: 지급됨, false: 지급 안 됨)
 */
export async function awardPointsForRecommendationAchievement(
  userId: number,
  stayId: number,
  kakaoPlaceId: string,
  lat: number,
  lng: number,
): Promise<boolean> {
  // 1) Stay가 이미 점수를 받았는지 확인 (중복 방지)
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    select: { recommendationPointsAwardedAt: true },
  });

  if (!stay) {
    console.warn(`[RecommendationAchievement] Stay ${stayId} not found`);
    return false;
  }

  if (stay.recommendationPointsAwardedAt != null) {
    // 이미 점수를 받았음
    return false;
  }

  // 2) 해당 kakaoPlaceId가 Recommendation 테이블에 있는지 확인
  const recommendation = await prisma.recommendation.findFirst({
    where: {
      userId,
      kakaoPlaceId,
    },
  });

  if (!recommendation) {
    // 추천 목록에 없으면 달성 아님
    return false;
  }

  // 3) GUILD 모드인지 확인 (detectGuildContext 사용)
  const guildContext = await detectGuildContext(userId, lat, lng);

  if (guildContext.mode !== "GUILD" || guildContext.guildId == null) {
    // PERSONAL 모드이면 점수 지급 안 함
    return false;
  }

  // 4) 트랜잭션으로 점수 지급 및 Stay 업데이트
  try {
    await prisma.$transaction(async (tx) => {
      // 4-1) Stay의 recommendationPointsAwardedAt 업데이트 (중복 방지)
      await tx.stay.update({
        where: { id: stayId },
        data: {
          recommendationPointsAwardedAt: new Date(),
        },
      });

      // 4-2) GuildScore 업데이트 (+50점)
      await tx.guildScore.upsert({
        where: {
          userId_guildId: {
            userId,
            guildId: guildContext.guildId,
          },
        },
        create: {
          userId,
          guildId: guildContext.guildId,
          score: 50,
        },
        update: {
          score: {
            increment: 50,
          },
        },
      });
    });

    console.log(
      `✅ [RecommendationAchievement] user=${userId}, stayId=${stayId}, kakaoPlaceId=${kakaoPlaceId}, guildId=${guildContext.guildId}, +50점 지급`,
    );
    return true;
  } catch (err) {
    console.error(
      `❌ [RecommendationAchievement] 점수 지급 실패: user=${userId}, stayId=${stayId}`,
      err,
    );
    return false;
  }
}

/**
 * GUILD 모드 판정 (recommendations.routes.ts의 detectGuildContext 재사용)
 */
async function detectGuildContext(
  userId: number,
  lat: number,
  lng: number,
): Promise<{
  mode: "PERSONAL" | "GUILD";
  guildId: number | null;
  guildName: string | null;
  nearbyGuildMemberCount: number;
}> {
  const GUILD_NEARBY_RADIUS_M = 3000; // 3km

  const personal = {
    mode: "PERSONAL" as const,
    guildId: null,
    guildName: null,
    nearbyGuildMemberCount: 0,
  };

  // 내가 속한 길드들
  const myMemberships = await prisma.guildMembership.findMany({
    where: { userId, status: "APPROVED" },
    include: { guild: true },
  });
  if (myMemberships.length === 0) return personal;

  const guildIds = myMemberships.map((m) => m.guildId);

  // 같은 길드의 다른 멤버들
  const otherMemberships = await prisma.guildMembership.findMany({
    where: {
      guildId: { in: guildIds },
      status: "APPROVED",
      userId: { not: userId },
    },
    include: { guild: true },
  });
  if (otherMemberships.length === 0) return personal;

  const otherUserIds = Array.from(new Set(otherMemberships.map((m) => m.userId)));

  const lives = await prisma.liveLocation.findMany({
    where: { userId: { in: otherUserIds } },
  });
  if (lives.length === 0) return personal;

  type GuildNearbyInfo = { guildId: number; guildName: string; memberIds: number[] };
  const nearbyByGuild = new Map<number, GuildNearbyInfo>();

  for (const mem of otherMemberships) {
    const live = lives.find((l) => l.userId === mem.userId && l.lat != null && l.lng != null);
    if (!live) continue;

    const dist = distanceMeters(lat, lng, live.lat!, live.lng!);
    if (dist > GUILD_NEARBY_RADIUS_M) continue;

    const existing = nearbyByGuild.get(mem.guildId);
    if (existing) {
      if (!existing.memberIds.includes(mem.userId)) existing.memberIds.push(mem.userId);
    } else {
      nearbyByGuild.set(mem.guildId, {
        guildId: mem.guildId,
        guildName: mem.guild.name,
        memberIds: [mem.userId],
      });
    }
  }

  if (nearbyByGuild.size === 0) return personal;

  // 가장 많은 인원이 같이 있는 길드 하나 선택
  let selected: GuildNearbyInfo | null = null;
  for (const info of nearbyByGuild.values()) {
    if (!selected || info.memberIds.length > selected.memberIds.length) selected = info;
  }

  return {
    mode: "GUILD",
    guildId: selected!.guildId,
    guildName: selected!.guildName,
    nearbyGuildMemberCount: selected!.memberIds.length,
  };
}

// 거리 계산 함수
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

