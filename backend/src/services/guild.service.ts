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
  // 실제 점수를 반영한 랭킹 조회
  return getGuildRankingWithScore(guildId, currentUserId);
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

/**
 * ───────────────────────────────
 * GUILD RECORD 관련 함수들
 * ────────────────────────────────
 */

export type GuildRecordDTO = {
  id: string;
  guildId: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  title: string;
  desc: string | null;
  content: string | null;
  category: string | null;
  recordedAt: string | null;
  rating: number | null;
  mainImage: string | null;
  extraImages: string[];
  hashtags: string[];
  missionId: string | null; // 규칙: missionId가 null이면 개인 도감 기록, null이 아니면 연맹 미션 기록
  createdAt: string;
  updatedAt: string;
};

function serializeGuildRecord(record: any, user?: any): GuildRecordDTO {
  let extraImages: string[] = [];
  if (record.extraImagesJson) {
    try {
      extraImages = JSON.parse(record.extraImagesJson) as string[];
    } catch (e) {
      console.error("extraImagesJson 파싱 에러:", e);
      extraImages = [];
    }
  }

  let hashtags: string[] = [];
  if (record.hashtagsJson) {
    try {
      hashtags = JSON.parse(record.hashtagsJson) as string[];
    } catch (e) {
      console.error("hashtagsJson 파싱 에러:", e);
      hashtags = [];
    }
  }

  return {
    id: record.id,
    guildId: record.guildId,
    userId: record.userId,
    userName: user?.name ?? null,
    userEmail: user?.email ?? "",
    title: record.title,
    desc: record.desc ?? null,
    content: record.content ?? null,
    category: record.category ?? null,
    recordedAt: record.recordedAt
      ? new Date(record.recordedAt).toISOString()
      : null,
    rating: record.rating ?? null,
    mainImage: record.mainImage ?? null,
    extraImages,
    hashtags,
    missionId: record.missionId ?? null, // 규칙: missionId가 null이면 개인 도감 기록, null이 아니면 연맹 미션 기록
    createdAt: record.createdAt
      ? new Date(record.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: record.updatedAt
      ? new Date(record.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * 길드 도감 기록 생성 (개인 도감 기록)
 * - 도감 기록 생성 시 사용자에게 10점 추가
 * - 규칙: missionId는 null로 설정되어 개인 도감 기록으로 분류됨
 */
export async function createGuildRecord(
  userId: number,
  guildId: number,
  payload: {
    title: string;
    desc?: string;
    content?: string;
    category?: string;
    recordedAt?: string | Date;
    rating?: number;
    mainImage?: string | null;
    extraImages?: string[];
    hashtags?: string[];
  },
): Promise<GuildRecordDTO> {
  // 길드 존재 확인 및 멤버십 확인
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  const membership = await prisma.guildMembership.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });

  if (!membership || membership.status !== "APPROVED") {
    const err = new Error("NOT_MEMBER");
    (err as any).code = "NOT_MEMBER";
    throw err;
  }

  const {
    title,
    desc,
    content,
    category,
    recordedAt,
    rating,
    mainImage,
    extraImages,
    hashtags,
  } = payload;

  // 트랜잭션으로 기록 생성과 점수 업데이트를 함께 처리
  const result = await prisma.$transaction(async (tx) => {
    // 1. 도감 기록 생성 (개인 도감 기록이므로 missionId는 null)
    const record = await tx.guildRecord.create({
      data: {
        guildId,
        userId,
        missionId: null, // 규칙: 개인 도감 기록은 missionId가 null이어야 함
        title,
        desc: desc ?? null,
        content: content ?? null,
        category: category ?? null,
        recordedAt: recordedAt
          ? recordedAt instanceof Date
            ? recordedAt
            : new Date(recordedAt)
          : null,
        rating: rating ?? null,
        mainImage: mainImage ?? null,
        extraImagesJson:
          extraImages && extraImages.length > 0
            ? JSON.stringify(extraImages)
            : null,
        hashtagsJson:
          hashtags && hashtags.length > 0 ? JSON.stringify(hashtags) : null,
      },
    });

    // 2. 사용자 점수 업데이트 (10점 추가)
    await tx.guildScore.upsert({
      where: { userId_guildId: { userId, guildId } },
      create: {
        userId,
        guildId,
        score: 10,
      },
      update: {
        score: {
          increment: 10,
        },
      },
    });

    // 3. 사용자 정보 가져오기
    const user = await tx.user.findUnique({ where: { id: userId } });

    return { record, user };
  });

  return serializeGuildRecord(result.record, result.user);
}

/**
 * 길드 도감 기록 목록 조회
 * 규칙: 개인 도감 기록(missionId === null)과 연맹 미션 기록(missionId !== null)을 모두 반환
 * 프론트에서는 필터링하여 사용: guildRecords.filter(r => !r.missionId)
 */
export async function getGuildRecords(
  guildId: number,
): Promise<GuildRecordDTO[]> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  const records = await prisma.guildRecord.findMany({
    where: { guildId },
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return records.map((r) => serializeGuildRecord(r, r.user));
}

/**
 * 특정 도감 기록 조회
 */
export async function getGuildRecordById(
  recordId: string,
): Promise<GuildRecordDTO | null> {
  const record = await prisma.guildRecord.findUnique({
    where: { id: recordId },
    include: {
      user: true,
    },
  });

  if (!record) {
    return null;
  }

  return serializeGuildRecord(record, record.user);
}

/**
 * 길드 도감 기록 삭제
 * 규칙: 작성자만 삭제 가능
 * 미션 기록(missionId가 있는 경우)도 삭제 가능
 */
export async function deleteGuildRecord(
  recordId: string,
  userId: number,
): Promise<void> {
  const record = await prisma.guildRecord.findUnique({
    where: { id: recordId },
  });

  if (!record) {
    const err = new Error("RECORD_NOT_FOUND");
    (err as any).code = "RECORD_NOT_FOUND";
    throw err;
  }

  // 작성자만 삭제 가능
  if (record.userId !== userId) {
    const err = new Error("UNAUTHORIZED");
    (err as any).code = "UNAUTHORIZED";
    throw err;
  }

  // 트랜잭션으로 기록 삭제와 관련 데이터 정리
  await prisma.$transaction(async (tx) => {
    // 1. 관련 댓글 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
    await tx.guildRecordComment.deleteMany({
      where: { recordId },
    });

    // 2. 관련 알림 삭제
    await tx.notification.deleteMany({
      where: { recordId },
    });

    // 3. 기록 삭제
    await tx.guildRecord.delete({
      where: { id: recordId },
    });

    // 4. 점수 차감 (미션 기록이면 -20점, 개인 도감 기록이면 -10점)
    const pointsToDeduct = record.missionId ? 20 : 10;
    const guildScore = await tx.guildScore.findUnique({
      where: { userId_guildId: { userId: record.userId, guildId: record.guildId } },
    });

    if (guildScore && guildScore.score >= pointsToDeduct) {
      await tx.guildScore.update({
        where: { userId_guildId: { userId: record.userId, guildId: record.guildId } },
        data: {
          score: {
            decrement: pointsToDeduct,
          },
        },
      });
    } else if (guildScore) {
      // 점수가 부족하면 0으로 설정
      await tx.guildScore.update({
        where: { userId_guildId: { userId: record.userId, guildId: record.guildId } },
        data: {
          score: 0,
        },
      });
    }
  });
}

/**
 * 랭킹 조회 시 실제 점수 반영
 */
export async function getGuildRankingWithScore(
  guildId: number,
  currentUserId?: number,
): Promise<{
  myRank: GuildRankingDTO | null;
  top3: GuildRankingDTO[];
}> {
  const members = await getGuildMembers(guildId);

  // 각 멤버의 점수 가져오기
  const scores = await prisma.guildScore.findMany({
    where: { guildId },
  });

  const scoreMap = new Map<number, number>();
  scores.forEach((s) => {
    scoreMap.set(s.userId, s.score);
  });

  const membersWithScore = members.map((m) => ({
    ...m,
    score: scoreMap.get(m.userId) ?? 0,
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
 * ───────────────────────────────
 * GUILD RECORD COMMENT 관련 함수들
 * ────────────────────────────────
 */

export type GuildRecordCommentDTO = {
  id: string;
  recordId: string;
  userId: number;
  userName: string | null;
  userEmail: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  replies?: GuildRecordCommentDTO[];
};

function serializeGuildRecordComment(comment: any, user?: any): GuildRecordCommentDTO {
  return {
    id: comment.id,
    recordId: comment.recordId,
    userId: comment.userId,
    userName: user?.name ?? null,
    userEmail: user?.email ?? "",
    parentCommentId: comment.parentCommentId ?? null,
    content: comment.content,
    createdAt: comment.createdAt
      ? new Date(comment.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: comment.updatedAt
      ? new Date(comment.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * 길드 도감 댓글 생성
 * - 댓글 작성 시 글 작성자에게 알림 전송
 */
export async function createGuildRecordComment(
  userId: number,
  recordId: string,
  payload: {
    content: string;
    parentCommentId?: string | null;
  },
): Promise<GuildRecordCommentDTO> {
  const { content, parentCommentId } = payload;

  if (!content || !content.trim()) {
    const err = new Error("CONTENT_REQUIRED");
    (err as any).code = "CONTENT_REQUIRED";
    throw err;
  }

  // 도감 기록 확인
  const record = await prisma.guildRecord.findUnique({
    where: { id: recordId },
    include: { user: true },
  });

  if (!record) {
    const err = new Error("RECORD_NOT_FOUND");
    (err as any).code = "RECORD_NOT_FOUND";
    throw err;
  }

  // 트랜잭션으로 댓글 생성과 알림 생성
  const result = await prisma.$transaction(async (tx) => {
    // 1. 댓글 생성
    const comment = await tx.guildRecordComment.create({
      data: {
        recordId,
        userId,
        content: content.trim(),
        parentCommentId: parentCommentId || null,
      },
    });

    // 2. 사용자 정보 가져오기
    const user = await tx.user.findUnique({ where: { id: userId } });

    // 3. 알림 생성 (자신의 글에 댓글을 다는 경우 제외)
    if (record.userId !== userId) {
      await tx.notification.create({
        data: {
          userId: record.userId, // 글 작성자에게 알림
          fromUserId: userId,
          type: parentCommentId ? "REPLY" : "COMMENT",
          recordId: recordId,
          commentId: comment.id,
          content: parentCommentId
            ? `${user?.name || user?.email}님이 댓글에 답글을 남겼습니다.`
            : `${user?.name || user?.email}님이 도감에 댓글을 남겼습니다.`,
        },
      });
    }

    // 대댓글인 경우 원댓글 작성자에게도 알림
    if (parentCommentId) {
      const parentComment = await tx.guildRecordComment.findUnique({
        where: { id: parentCommentId },
      });

      if (parentComment && parentComment.userId !== userId && parentComment.userId !== record.userId) {
        await tx.notification.create({
          data: {
            userId: parentComment.userId,
            fromUserId: userId,
            type: "REPLY",
            recordId: recordId,
            commentId: comment.id,
            content: `${user?.name || user?.email}님이 댓글에 답글을 남겼습니다.`,
          },
        });
      }
    }

    return { comment, user };
  });

  return serializeGuildRecordComment(result.comment, result.user);
}

/**
 * 길드 도감 댓글 목록 조회
 */
export async function getGuildRecordComments(
  recordId: string,
): Promise<GuildRecordCommentDTO[]> {
  const comments = await prisma.guildRecordComment.findMany({
    where: {
      recordId,
      parentCommentId: null, // 최상위 댓글만
    },
    include: {
      user: true,
      replies: {
        include: {
          user: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return comments.map((comment) => {
    const serialized = serializeGuildRecordComment(comment, comment.user);
    serialized.replies = comment.replies.map((reply) =>
      serializeGuildRecordComment(reply, reply.user),
    );
    return serialized;
  });
}

/**
 * 길드 도감 댓글 삭제
 */
export async function deleteGuildRecordComment(
  commentId: string,
  userId: number,
): Promise<void> {
  // 댓글 확인
  const comment = await prisma.guildRecordComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    const err = new Error("COMMENT_NOT_FOUND");
    (err as any).code = "COMMENT_NOT_FOUND";
    throw err;
  }

  // 작성자 확인
  if (comment.userId !== userId) {
    const err = new Error("UNAUTHORIZED");
    (err as any).code = "UNAUTHORIZED";
    throw err;
  }

  // 트랜잭션으로 댓글 삭제와 관련 알림 삭제
  await prisma.$transaction(async (tx) => {
    // 1. 해당 댓글과 관련된 모든 알림 삭제 (commentId가 일치하는 알림)
    await tx.notification.deleteMany({
      where: {
        commentId: commentId,
      },
    });

    // 2. 대댓글인 경우, 대댓글들의 commentId로도 알림 삭제
    const replies = await tx.guildRecordComment.findMany({
      where: { parentCommentId: commentId },
      select: { id: true },
    });

    if (replies.length > 0) {
      const replyIds = replies.map((r) => r.id);
      await tx.notification.deleteMany({
        where: {
          commentId: { in: replyIds },
        },
      });
    }

    // 3. 댓글 삭제 (대댓글도 함께 삭제됨 - CASCADE)
    await tx.guildRecordComment.delete({
      where: { id: commentId },
    });
  });
}

/**
 * ───────────────────────────────
 * NOTIFICATION 관련 함수들
 * ────────────────────────────────
 */

export type NotificationDTO = {
  id: string;
  userId: number;
  fromUserId: number;
  fromUserName: string | null;
  fromUserEmail: string;
  type: string;
  recordId: string | null;
  commentId: string | null;
  guildId: string | null;
  content: string | null;
  isRead: boolean;
  createdAt: string;
};

function serializeNotification(notification: any, fromUser?: any, guildId?: string | null): NotificationDTO {
  return {
    id: notification.id,
    userId: notification.userId,
    fromUserId: notification.fromUserId,
    fromUserName: fromUser?.name ?? null,
    fromUserEmail: fromUser?.email ?? "",
    type: notification.type,
    recordId: notification.recordId ?? null,
    commentId: notification.commentId ?? null,
    guildId: guildId ?? null,
    content: notification.content ?? null,
    isRead: notification.isRead,
    createdAt: notification.createdAt
      ? new Date(notification.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * 사용자 알림 목록 조회
 */
export async function getUserNotifications(
  userId: number,
  limit: number = 50,
): Promise<NotificationDTO[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      isRead: false,   // ✅ 읽지 않은 것만
    },
    include: {
      fromUser: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // 각 알림의 recordId를 통해 guildId 조회
  const notificationsWithGuildId = await Promise.all(
    notifications.map(async (n) => {
      let guildId: string | null = null;
      if (n.recordId) {
        const record = await prisma.guildRecord.findUnique({
          where: { id: n.recordId },
          select: { guildId: true },
        });
        guildId = record?.guildId ?? null;
      }
      return serializeNotification(n, n.fromUser, guildId);
    }),
  );

  return notificationsWithGuildId;
}

/**
 * 알림 읽음 처리
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: number,
): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    const err = new Error("NOTIFICATION_NOT_FOUND");
    (err as any).code = "NOTIFICATION_NOT_FOUND";
    throw err;
  }

  if (notification.userId !== userId) {
    const err = new Error("UNAUTHORIZED");
    (err as any).code = "UNAUTHORIZED";
    throw err;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

/**
 * 읽지 않은 알림 개수 조회
 */
export async function getUnreadNotificationCount(
  userId: number,
): Promise<number> {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * ───────────────────────────────
 * GUILD MISSION 관련 함수들
 * ────────────────────────────────
 */

export type GuildMissionDTO = {
  id: string;
  guildId: number;
  title: string;
  content: string | null;
  limitCount: number;
  difficulty: string | null;
  mainImage: string | null;
  extraImages: string[];
  participantCount: number; // 현재 참여 인원 수
  createdAt: string;
  updatedAt: string;
};

function serializeGuildMission(mission: any, participantCount: number): GuildMissionDTO {
  let extraImages: string[] = [];
  if (mission.extraImagesJson) {
    try {
      extraImages = JSON.parse(mission.extraImagesJson);
    } catch {
      extraImages = [];
    }
  }

  return {
    id: mission.id,
    guildId: mission.guildId,
    title: mission.title,
    content: mission.content ?? null,
    limitCount: mission.limitCount,
    difficulty: mission.difficulty ?? null,
    mainImage: mission.mainImage ?? null,
    extraImages,
    participantCount,
    createdAt: mission.createdAt
      ? new Date(mission.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: mission.updatedAt
      ? new Date(mission.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * 연맹 미션 생성
 */
export async function createGuildMission(
  userId: number,
  guildId: number,
  payload: {
    title: string;
    content?: string;
    limitCount: number;
    difficulty?: string;
    mainImage?: string | null;
    extraImages?: string[];
  },
): Promise<GuildMissionDTO> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  // 연맹 멤버인지 확인 (연맹장 또는 승인된 연맹원)
  const membership = await prisma.guildMembership.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });

  if (!membership || membership.status !== "APPROVED") {
    const err = new Error("NOT_MEMBER");
    (err as any).code = "NOT_MEMBER";
    throw err;
  }

  const { title, content, limitCount, difficulty, mainImage, extraImages } = payload;

  if (!title || !title.trim()) {
    const err = new Error("TITLE_REQUIRED");
    (err as any).code = "TITLE_REQUIRED";
    throw err;
  }

  if (!limitCount || limitCount < 1) {
    const err = new Error("INVALID_LIMIT_COUNT");
    (err as any).code = "INVALID_LIMIT_COUNT";
    throw err;
  }

  const mission = await prisma.guildMission.create({
    data: {
      guildId,
      title: title.trim(),
      content: content ?? null,
      limitCount,
      difficulty: difficulty ?? null,
      mainImage: mainImage ?? null,
      extraImagesJson:
        extraImages && extraImages.length > 0
          ? JSON.stringify(extraImages)
          : null,
    },
  });

  return serializeGuildMission(mission, 0);
}

/**
 * 연맹 미션 삭제
 * 규칙: 연맹장 또는 미션 작성자만 삭제 가능
 */
export async function deleteGuildMission(
  missionId: string,
  userId: number,
): Promise<void> {
  const mission = await prisma.guildMission.findUnique({
    where: { id: missionId },
    include: {
      guild: true,
    },
  });

  if (!mission) {
    const err = new Error("MISSION_NOT_FOUND");
    (err as any).code = "MISSION_NOT_FOUND";
    throw err;
  }

  // 연맹장 또는 미션 작성자만 삭제 가능
  // (현재 스키마에 작성자 필드가 없으므로 연맹장만 삭제 가능)
  // TODO: 나중에 mission에 creatorId 필드를 추가하면 작성자도 삭제 가능하도록 수정
  if (mission.guild.ownerId !== userId) {
    const err = new Error("UNAUTHORIZED");
    (err as any).code = "UNAUTHORIZED";
    throw err;
  }

  // 트랜잭션으로 미션 삭제와 관련 데이터 정리
  await prisma.$transaction(async (tx) => {
    // 1. 관련 기록의 댓글 삭제
    const records = await tx.guildRecord.findMany({
      where: { missionId },
      select: { id: true },
    });

    if (records.length > 0) {
      const recordIds = records.map((r) => r.id);
      
      // 각 기록의 댓글 삭제
      await tx.guildRecordComment.deleteMany({
        where: { recordId: { in: recordIds } },
      });

      // 각 기록의 알림 삭제
      await tx.notification.deleteMany({
        where: { recordId: { in: recordIds } },
      });

      // 미션 기록 삭제
      await tx.guildRecord.deleteMany({
        where: { missionId },
      });
    }

    // 2. 미션 삭제
    await tx.guildMission.delete({
      where: { id: missionId },
    });
  });
}

/**
 * 연맹 미션 목록 조회 (진행 중인 미션만)
 * 규칙: guildMission.records 수가 limitCount 미만인 미션만 리턴
 */
export async function getGuildMissions(
  guildId: number,
): Promise<GuildMissionDTO[]> {
  const missions = await prisma.guildMission.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
    include: {
      records: {
        select: { id: true },
      },
    },
  });

  return missions.map((mission) => {
    const participantCount = mission.records.length;
    // limitCount를 채운 미션은 제외 (마감된 미션)
    if (participantCount >= mission.limitCount) {
      return null;
    }
    return serializeGuildMission(mission, participantCount);
  }).filter((m): m is GuildMissionDTO => m !== null);
}

/**
 * 완료된 연맹 미션 목록 조회 (limitCount 달성)
 * 규칙: guildMission.records 수가 limitCount 이상인 미션만 리턴
 */
export async function getCompletedGuildMissions(
  guildId: number,
): Promise<GuildMissionDTO[]> {
  const missions = await prisma.guildMission.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
    include: {
      records: {
        select: { id: true },
      },
    },
  });

  return missions.map((mission) => {
    const participantCount = mission.records.length;
    // limitCount를 채운 미션만 반환 (완료된 미션)
    if (participantCount >= mission.limitCount) {
      return serializeGuildMission(mission, participantCount);
    }
    return null;
  }).filter((m): m is GuildMissionDTO => m !== null);
}

/**
 * 미션별 후기 목록 조회
 */
export async function getGuildMissionRecords(
  missionId: string,
): Promise<GuildRecordDTO[]> {
  const mission = await prisma.guildMission.findUnique({
    where: { id: missionId },
  });

  if (!mission) {
    const err = new Error("MISSION_NOT_FOUND");
    (err as any).code = "MISSION_NOT_FOUND";
    throw err;
  }

  const records = await prisma.guildRecord.findMany({
    where: { missionId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return records.map((record) => serializeGuildRecord(record, record.user));
}

/**
 * 미션 참여 기록 생성 (미션 도감 작성)
 * - 미션에 대한 후기 작성 시 +20점 부여
 * - limitCount 체크
 */
export async function createGuildMissionRecord(
  userId: number,
  guildId: number,
  missionId: string,
  payload: {
    title: string;
    desc?: string;
    content?: string;
    category?: string;
    recordedAt?: string | Date;
    rating?: number;
    mainImage?: string | null;
    extraImages?: string[];
    hashtags?: string[];
  },
): Promise<GuildRecordDTO> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    const err = new Error("GUILD_NOT_FOUND");
    (err as any).code = "GUILD_NOT_FOUND";
    throw err;
  }

  const membership = await prisma.guildMembership.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });

  if (!membership || membership.status !== "APPROVED") {
    const err = new Error("NOT_MEMBER");
    (err as any).code = "NOT_MEMBER";
    throw err;
  }

  const mission = await prisma.guildMission.findUnique({
    where: { id: missionId },
    include: {
      records: {
        select: { id: true },
      },
    },
  });

  if (!mission) {
    const err = new Error("MISSION_NOT_FOUND");
    (err as any).code = "MISSION_NOT_FOUND";
    throw err;
  }

  // limitCount 체크
  const participantCount = mission.records.length;
  if (participantCount >= mission.limitCount) {
    const err = new Error("MISSION_FULL");
    (err as any).code = "MISSION_FULL";
    throw err;
  }

  // 이미 참여했는지 확인
  const existingRecord = await prisma.guildRecord.findFirst({
    where: {
      missionId,
      userId,
    },
  });

  if (existingRecord) {
    const err = new Error("ALREADY_PARTICIPATED");
    (err as any).code = "ALREADY_PARTICIPATED";
    throw err;
  }

  const {
    title,
    desc,
    content,
    category,
    recordedAt,
    rating,
    mainImage,
    extraImages,
    hashtags,
  } = payload;

  // 트랜잭션으로 기록 생성과 점수 업데이트를 함께 처리
  const result = await prisma.$transaction(async (tx) => {
    // 1. 미션 참여 기록 생성
    const record = await tx.guildRecord.create({
      data: {
        guildId,
        userId,
        missionId,
        title,
        desc: desc ?? null,
        content: content ?? null,
        category: category ?? null,
        recordedAt: recordedAt
          ? recordedAt instanceof Date
            ? recordedAt
            : new Date(recordedAt)
          : null,
        rating: rating ?? null,
        mainImage: mainImage ?? null,
        extraImagesJson:
          extraImages && extraImages.length > 0
            ? JSON.stringify(extraImages)
            : null,
        hashtagsJson:
          hashtags && hashtags.length > 0 ? JSON.stringify(hashtags) : null,
      },
    });

    // 2. 사용자 점수 업데이트 (20점 추가)
    await tx.guildScore.upsert({
      where: { userId_guildId: { userId, guildId } },
      create: {
        userId,
        guildId,
        score: 20,
      },
      update: {
        score: {
          increment: 20,
        },
      },
    });

    // 3. 사용자 정보 가져오기
    const user = await tx.user.findUnique({ where: { id: userId } });

    return { record, user };
  });

  return serializeGuildRecord(result.record, result.user);
}
