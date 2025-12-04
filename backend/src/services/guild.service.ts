// src/services/guild.service.ts
import { prisma } from "../lib/prisma";

/**
 * 프론트와 주고받는 길드 기본 DTO
 */
export type GuildDTO = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  rules: string | null;
  maxMembers: number;
  emblemUrl: string | null;
  ownerId: number;
  createdAt: string; 
};

function serializeGuild(g: any): GuildDTO {
  let tags: string[] = [];
  if (g.tagsJson) {
    try {
      tags = JSON.parse(g.tagsJson) as string[];
    } catch (e) {
      console.error("tagsJson 파싱 에러:", e, "tagsJson:", g.tagsJson);
      tags = [];
    }
  }

  let createdAt: string;
  if (g.createdAt instanceof Date) {
    createdAt = g.createdAt.toISOString();
  } else if (typeof g.createdAt === "string") {
    createdAt = g.createdAt;
  } else {
    createdAt = new Date().toISOString();
  }

  return {
    id: g.id,
    name: g.name,
    description: g.description ?? null,
    category: g.category ?? null,
    tags,
    rules: g.rules ?? null,
    maxMembers: typeof g.maxMembers === "number" ? g.maxMembers : 20,
    emblemUrl: g.emblemUrl ?? null,
    ownerId: g.ownerId,
    createdAt,
  };
}

/**
 * 길드 리스트용 DTO (멤버 수 포함)
 */
export type GuildListItemDTO = GuildDTO & {
  memberCount: number;
};

/**
 * 프론트에서 쓰는 "내 연맹 상태" 타입
 * NONE     : 아직 가입한 연맹 없음
 * PENDING  : 가입 신청은 했지만 승인 대기 
 * APPROVED : 가입 완료 (guild 정보 포함)
 */
export type GuildMembershipStatus = "NONE" | "PENDING" | "APPROVED";

export type MyGuildStatusResponse = {
  status: GuildMembershipStatus;
  guild?: GuildDTO;
};

/**
 * 길드 가입 신청 로직
 * 길드가 없으면 에러 code = 'GUILD_NOT_FOUND'
 * 기존 멤버십이 없으면 새로 PENDING 생성 (연맹장 승인 필요)
 * PENDING 이면 그대로 반환
 * 이미 APPROVED 이면 그대로 반환
 */
export async function joinGuildForUser(userId: number, guildId: number) {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  // 연맹장은 자동 승인
  if (guild.ownerId === userId) {
    const existing = await prisma.guildMembership.findUnique({
      where: { userId_guildId: { userId, guildId } },
    });
    if (!existing) {
      return prisma.guildMembership.create({
        data: {
          userId,
          guildId,
          status: "APPROVED",
        },
      });
    }
    return existing;
  }

  const existing = await prisma.guildMembership.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });

  if (!existing) {
    // 처음 가입 신청 - PENDING 상태로 생성
    return prisma.guildMembership.create({
      data: {
        userId,
        guildId,
        status: "PENDING",
      },
    });
  }

  // 이미 존재하는 멤버십 반환
  return existing;
}

/**
 * 전체 길드 목록 (최신순) + 멤버 수 포함
 */
export async function listGuilds(): Promise<GuildListItemDTO[]> {
  const guilds = await prisma.guild.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true } }, // Guild.memberships relation
    },
  });

  return guilds.map((g) => ({
    ...serializeGuild(g),
    memberCount: g._count.memberships,
  }));
}

/**
 * 단일 길드
 */
export async function getGuildById(id: number): Promise<GuildDTO | null> {
  const guild = await prisma.guild.findUnique({ where: { id } });
  return guild ? serializeGuild(guild) : null;
}

/**
 * 길드 생성
 * tags 는 tagsJson 에 JSON 배열로 저장
 * 길드 생성 후, owner 를 자동으로 APPROVED 멤버십으로 등록
 */
export async function createGuild(
  ownerId: number,
  payload: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    rules?: string;
    maxMembers?: number;
    emblemUrl?: string;
  },
): Promise<GuildDTO> {
  const { name, description, category, tags, rules, maxMembers, emblemUrl } = payload;

  console.log("createGuild 호출:", { ownerId, name, maxMembers });

  // ownerId 유효성 검사
  if (!ownerId || typeof ownerId !== "number" || !Number.isFinite(ownerId)) {
    throw new Error(`유효하지 않은 ownerId: ${ownerId}`);
  }

  const sanitizedMaxMembers =
    typeof maxMembers === "number" && Number.isFinite(maxMembers)
      ? Math.min(Math.max(Math.floor(maxMembers), 2), 200)
      : 20;

  try {
    // 트랜잭션으로 길드 생성과 멤버십 생성을 함께 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 길드 생성
      const created = await tx.guild.create({
        data: {
          name,
          description: description ?? null,
          category: category ?? null,
          tagsJson:
            tags && Array.isArray(tags) && tags.length > 0
              ? JSON.stringify(tags)
              : null,
          rules: rules ?? null,
          maxMembers: sanitizedMaxMembers,
          emblemUrl: emblemUrl ?? null,
          ownerId,
        },
      });

      console.log("길드 생성 완료:", created.id);

      // 2. 생성자는 자동으로 이 길드에 가입 (APPROVED 상태)
      try {
        const existing = await tx.guildMembership.findUnique({
          where: { userId_guildId: { userId: ownerId, guildId: created.id } },
        });

        if (!existing) {
          await tx.guildMembership.create({
            data: {
              userId: ownerId,
              guildId: created.id,
              status: "APPROVED",
            },
          });
          console.log("멤버십 생성 완료");
        } else {
          console.log("멤버십이 이미 존재함");
        }
      } catch (membershipErr: any) {
        console.error("멤버십 생성 에러:", membershipErr);
        // 멤버십 생성 실패 시 트랜잭션 롤백
        throw membershipErr;
      }

      return created;
    });

    return serializeGuild(result);
  } catch (err: any) {
    console.error("길드 생성 DB 에러:", err);
    console.error("에러 상세:", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
      stack: err?.stack,
    });

    if (err.code === "P2002") {
      // Prisma unique constraint violation
      const field = err.meta?.target?.[0] || "필드";
      throw new Error(`이미 존재하는 ${field}입니다.`);
    }
    if (err.code === "P2003") {
      // Foreign key constraint violation
      throw new Error("유효하지 않은 사용자 ID입니다.");
    }
    throw err;
  }
}

/**
 * 내 연맹 상태 조회
 * APPROVED 상태의 GuildMembership 중 하나를 내 연맹으로 간주
 * 없으면 status: 'NONE'
 */
export async function getMyGuildStatus(
  userId: number,
): Promise<MyGuildStatusResponse> {
  const membership = await prisma.guildMembership.findFirst({
    where: {
      userId,
      status: "APPROVED",
    },
    include: {
      guild: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!membership || !membership.guild) {
    return { status: "NONE" };
  }

  return {
    status: "APPROVED",
    guild: serializeGuild(membership.guild),
  };
}

/**
 * 연맹 탈퇴
 * 해당 연맹의 멤버십을 삭제
 * 연맹장은 탈퇴할 수 없음 (연맹 삭제는 별도 기능)
 */
export async function leaveGuildForUser(
  userId: number,
  guildId: number,
): Promise<void> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  // 연맹장은 탈퇴할 수 없음
  if (guild.ownerId === userId) {
    const err = new Error("OWNER_CANNOT_LEAVE");
    (err as any).code = "OWNER_CANNOT_LEAVE";
    throw err;
  }

  const membership = await prisma.guildMembership.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });

  if (!membership) {
    const err = new Error("MEMBERSHIP_NOT_FOUND");
    (err as any).code = "MEMBERSHIP_NOT_FOUND";
    throw err;
  }

  await prisma.guildMembership.delete({
    where: { id: membership.id },
  });
}

/**
 * 가입 신청 목록 조회 (연맹장만)
 */
export type PendingMembershipDTO = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  createdAt: string;
};

export async function getPendingMemberships(
  guildId: number,
  ownerId: number,
): Promise<PendingMembershipDTO[]> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  if (guild.ownerId !== ownerId) {
    const err = new Error("NOT_OWNER");
    (err as any).code = "NOT_OWNER";
    throw err;
  }

  const memberships = await prisma.guildMembership.findMany({
    where: {
      guildId,
      status: "PENDING",
    },
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    userName: m.user.name,
    userEmail: m.user.email,
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * 가입 신청 승인/거절
 */
export async function processMembershipRequest(
  membershipId: number,
  guildId: number,
  ownerId: number,
  action: "approve" | "reject",
): Promise<void> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  if (guild.ownerId !== ownerId) {
    const err = new Error("NOT_OWNER");
    (err as any).code = "NOT_OWNER";
    throw err;
  }

  const membership = await prisma.guildMembership.findUnique({
    where: { id: membershipId },
  });

  if (!membership || membership.guildId !== guildId) {
    const err = new Error("MEMBERSHIP_NOT_FOUND");
    (err as any).code = "MEMBERSHIP_NOT_FOUND";
    throw err;
  }

  if (action === "approve") {
    await prisma.guildMembership.update({
      where: { id: membershipId },
      data: { status: "APPROVED" },
    });
  } else {
    // 거절 시 멤버십 삭제
    await prisma.guildMembership.delete({
      where: { id: membershipId },
    });
  }
}

/**
 * 연맹 멤버 목록 조회 (APPROVED 상태만)
 */
export type GuildMemberDTO = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  isOwner: boolean;
};

export async function getGuildMembers(
  guildId: number,
): Promise<GuildMemberDTO[]> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      memberships: {
        where: { status: "APPROVED" },
        include: {
          user: true,
        },
      },
    },
  });

  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  return guild.memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    userName: m.user.name,
    userEmail: m.user.email,
    isOwner: m.userId === guild.ownerId,
  }));
}

/**
 * 연맹 랭킹 조회
 * 점수가 있으면 점수순으로 정렬
 * 점수가 없으면 이름순으로 정렬
 * 최대 3위까지 반환
 */
export type GuildRankingDTO = {
  rank: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  score: number;
};

export async function getGuildRanking(
  guildId: number,
  currentUserId?: number,
): Promise<{
  myRank: GuildRankingDTO | null;
  top3: GuildRankingDTO[];
}> {
  const members = await getGuildMembers(guildId);

  // 점수가 모두 0이거나 없는 경우 이름순으로 정렬
  // 실제 점수 계산 로직이 추가되면 여기서 점수를 가져와야 함
  const membersWithScore = members.map((m) => ({
    ...m,
    score: 0, // 임시로 0점, 나중에 실제 점수 계산 로직 추가
  }));

  // 점수가 모두 0이면 이름순으로 정렬, 아니면 점수 내림차순
  const allScoresZero = membersWithScore.every((m) => m.score === 0);
  const sorted = allScoresZero
    ? [...membersWithScore].sort((a, b) => {
        const nameA = a.userName || a.userEmail || "";
        const nameB = b.userName || b.userEmail || "";
        return nameA.localeCompare(nameB, "ko");
      })
    : [...membersWithScore].sort((a, b) => b.score - a.score);

  // 상위 3위까지
  const top3 = sorted.slice(0, 3).map((m, index) => ({
    rank: index + 1,
    userId: m.userId,
    userName: m.userName,
    userEmail: m.userEmail,
    score: m.score,
  }));

  // 내 랭킹 찾기
  let myRank: GuildRankingDTO | null = null;
  if (currentUserId) {
    const myIndex = sorted.findIndex((m) => m.userId === currentUserId);
    if (myIndex !== -1) {
      myRank = {
        rank: myIndex + 1,
        userId: sorted[myIndex].userId,
        userName: sorted[myIndex].userName,
        userEmail: sorted[myIndex].userEmail,
        score: sorted[myIndex].score,
      };
    }
  }

  return { myRank, top3 };
}

/**
 * 연맹 업데이트 (연맹장만 가능)
 * emblemUrl 등 연맹 정보를 업데이트
 */
export async function updateGuild(
  guildId: number,
  ownerId: number,
  payload: {
    emblemUrl?: string;
  },
): Promise<GuildDTO> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  if (guild.ownerId !== ownerId) {
    const err = new Error("NOT_OWNER");
    (err as any).code = "NOT_OWNER";
    throw err;
  }

  const updated = await prisma.guild.update({
    where: { id: guildId },
    data: {
      emblemUrl: payload.emblemUrl !== undefined ? payload.emblemUrl : undefined,
    },
  });

  return serializeGuild(updated);
}

/**
 * 연맹 해체 (연맹장만 가능)
 * 연맹과 모든 멤버십을 삭제
 */
export async function disbandGuild(
  guildId: number,
  ownerId: number,
): Promise<void> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  if (guild.ownerId !== ownerId) {
    const err = new Error("NOT_OWNER");
    (err as any).code = "NOT_OWNER";
    throw err;
  }

  // 모든 멤버십 삭제 후 연맹 삭제
  await prisma.guildMembership.deleteMany({
    where: { guildId },
  });

  await prisma.guild.delete({
    where: { id: guildId },
  });
}
