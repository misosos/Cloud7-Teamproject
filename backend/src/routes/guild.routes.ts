// src/routes/guild.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import authRequired from "../middlewares/authRequired";
import {
  listGuilds,
  getGuildById,
  createGuild,
  getMyGuildStatus,
  joinGuildForUser,
  leaveGuildForUser,
  getPendingMemberships,
  processMembershipRequest,
  updateGuild,
  disbandGuild,
  getGuildMembers,
  getGuildRanking,
  createGuildRecord,
  getGuildRecords,
  getGuildRecordById,
  deleteGuildRecord,
  createGuildRecordComment,
  getGuildRecordComments,
  deleteGuildRecordComment,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  createGuildMission,
  deleteGuildMission,
  getGuildMissions,
  getCompletedGuildMissions,
  getGuildMissionRecords,
  createGuildMissionRecord,
} from "../services/guild.service";

type AuthedRequest = Request & {
  currentUser?: { id?: string | number };
};

function getUserId(req: AuthedRequest): number | null {
  const sessionUser = (req as any).session?.user as
    | { id?: string | number }
    | undefined;

  const rawId = req.currentUser?.id ?? sessionUser?.id ?? null;

  if (rawId == null) return null;

  const num = Number(rawId);
  return Number.isNaN(num) ? null : num;
}

const router = Router();

/**
 * GET /api/guilds
 * 전체 길드 목록 조회 (공개) – 멤버 수 포함
 */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listGuilds();
    return res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/guilds/me
 * 현재 로그인한 사용자의 내 연맹 상태 조회
 */
router.get(
  "/me",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const data = await getMyGuildStatus(userId);
      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET
 * 사용자 알림 목록 조회 (/:id 보다 먼저 와야 함)
 */
router.get(
  "/notifications",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const data = await getUserNotifications(userId);
      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET
 * 읽지 않은 알림 개수 조회
 */
router.get(
  "/notifications/unread-count",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const count = await getUnreadNotificationCount(userId);
      return res.json({ ok: true, data: { count } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH
 * 알림 읽음 처리
 */
router.patch(
  "/notifications/:notificationId/read",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const notificationId = req.params.notificationId;
      if (!notificationId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "notificationId 파라미터가 올바르지 않습니다.",
        });
      }

      await markNotificationAsRead(notificationId, userId);
      return res.json({ ok: true, data: null });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "NOTIFICATION_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "알림을 찾을 수 없습니다.",
          });
        }
        if (code === "UNAUTHORIZED") {
          return res.status(403).json({
            ok: false,
            error: "FORBIDDEN",
            message: "권한이 없습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * PATCH
 * 모든 알림 읽음 처리
 */
router.patch(
  "/notifications/read-all",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      await markAllNotificationsAsRead(userId);
      return res.json({ ok: true, data: null });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET 
 * 길드 단일 조회 
 */
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      const data = await getGuildById(id);
      if (!data) {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "연맹을 찾을 수 없습니다.",
        });
      }

      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET
 * 연맹 멤버 목록 조회 
 */
router.get(
  "/:id/members",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      const data = await getGuildMembers(guildId);
      return res.json({ ok: true, data });
    } catch (err: any) {
      if (err instanceof Error && (err as any).code === "GUILD_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "연맹을 찾을 수 없습니다.",
        });
      }
      next(err);
    }
  },
);

/**
 * GET
 * 연맹 랭킹 조회 
 */
router.get(
  "/:id/ranking",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      const currentUserId = getUserId(req);
      const data = await getGuildRanking(guildId, currentUserId || undefined);
      return res.json({ ok: true, data });
    } catch (err: any) {
      if (err instanceof Error && (err as any).code === "GUILD_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "연맹을 찾을 수 없습니다.",
        });
      }
      next(err);
    }
  },
);

/**
 * POST
 * 새 길드 생성 
 */
router.post(
  "/",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const ownerId = getUserId(req);
      if (!ownerId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const {
        name,
        description,
        category,
        tags,
        rules,
        maxMembers,
        emblemUrl,
      } = req.body as {
        name?: string;
        description?: string;
        category?: string;
        tags?: string[];
        rules?: string;
        maxMembers?: number | string;
        emblemUrl?: string;
      };

      if (!name || !name.trim()) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "name은 필수입니다.",
        });
      }

      const normalizedTags =
        Array.isArray(tags)
          ? tags
              .map((tag) => String(tag).trim())
              .filter((tag) => tag.length > 0)
              .slice(0, 8)
          : undefined;

      const parsedMaxMembers =
        maxMembers == null || maxMembers === ""
          ? undefined
          : Number(maxMembers);

      const data = await createGuild(ownerId, {
        name: name.trim(),
        description,
        category,
        tags: normalizedTags,
        rules,
        maxMembers: Number.isFinite(parsedMaxMembers) ? parsedMaxMembers : undefined,
        emblemUrl,
      });

      return res.status(201).json({ ok: true, data });
    } catch (err: any) {
      console.error("연맹 생성 에러:", err);
      console.error("에러 상세:", {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        name: err?.name,
      });
      next(err);
    }
  },
);

/**
 * POST
 * 현재 로그인한 사용자가 해당 길드에 가입
 */
router.post(
  "/:id/join",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      const data = await joinGuildForUser(userId, guildId);

      return res.json({ ok: true, data });
    } catch (err: any) {
      if (err instanceof Error && (err as any).code === "GUILD_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "연맹을 찾을 수 없습니다.",
        });
      }

      next(err);
    }
  },
);

/**
 * POST
 * 현재 로그인한 사용자가 해당 길드에서 탈퇴
 */
router.post(
  "/:id/leave",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      await leaveGuildForUser(userId, guildId);

      return res.json({ ok: true, data: null });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "GUILD_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "연맹을 찾을 수 없습니다.",
          });
        }
        if (code === "OWNER_CANNOT_LEAVE") {
          return res.status(400).json({
            ok: false,
            error: "BAD_REQUEST",
            message: "연맹장은 탈퇴할 수 없습니다. 연맹을 삭제하거나 다른 사람에게 양도해주세요.",
          });
        }
        if (code === "MEMBERSHIP_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "가입한 연맹이 아닙니다.",
          });
        }
      }

      next(err);
    }
  },
);

/**
 * GET
 * 가입 신청 목록 조회 (연맹장만)
 */
router.get(
  "/:id/pending",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      const data = await getPendingMemberships(guildId, userId);
      return res.json({ ok: true, data });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "GUILD_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "연맹을 찾을 수 없습니다.",
          });
        }
        if (code === "NOT_OWNER") {
          return res.status(403).json({
            ok: false,
            error: "FORBIDDEN",
            message: "연맹장만 접근할 수 있습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * POST
 * 가입 신청 승인
 */
router.post(
  "/:id/memberships/:membershipId/approve",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.id);
      const membershipId = Number(req.params.membershipId);
      if (!guildId || Number.isNaN(guildId) || !membershipId || Number.isNaN(membershipId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "파라미터가 올바르지 않습니다.",
        });
      }

      await processMembershipRequest(membershipId, guildId, userId, "approve");
      return res.json({ ok: true, data: null });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "GUILD_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "연맹을 찾을 수 없습니다.",
          });
        }
        if (code === "NOT_OWNER") {
          return res.status(403).json({
            ok: false,
            error: "FORBIDDEN",
            message: "연맹장만 승인할 수 있습니다.",
          });
        }
        if (code === "MEMBERSHIP_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "가입 신청을 찾을 수 없습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * POST
 * 가입 신청 거절
 */
router.post(
  "/:id/memberships/:membershipId/reject",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.id);
      const membershipId = Number(req.params.membershipId);
      if (!guildId || Number.isNaN(guildId) || !membershipId || Number.isNaN(membershipId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "파라미터가 올바르지 않습니다.",
        });
      }

      await processMembershipRequest(membershipId, guildId, userId, "reject");
      return res.json({ ok: true, data: null });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "GUILD_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "연맹을 찾을 수 없습니다.",
          });
        }
        if (code === "NOT_OWNER") {
          return res.status(403).json({
            ok: false,
            error: "FORBIDDEN",
            message: "연맹장만 거절할 수 있습니다.",
          });
        }
        if (code === "MEMBERSHIP_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "가입 신청을 찾을 수 없습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * PATCH
 * 연맹 업데이트 (연맹장만 가능)
 */
router.patch(
  "/:id",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      const { emblemUrl } = req.body as {
        emblemUrl?: string;
      };

      const data = await updateGuild(guildId, userId, {
        emblemUrl,
      });

      return res.json({ ok: true, data });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "GUILD_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "연맹을 찾을 수 없습니다.",
          });
        }
        if (code === "NOT_OWNER") {
          return res.status(403).json({
            ok: false,
            error: "FORBIDDEN",
            message: "연맹장만 연맹 정보를 수정할 수 있습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * POST
 * 연맹 해체 (연맹장만 가능)
 */
router.post(
  "/:id/disband",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      await disbandGuild(guildId, userId);
      return res.json({ ok: true, data: null });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "GUILD_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "연맹을 찾을 수 없습니다.",
          });
        }
        if (code === "NOT_OWNER") {
          return res.status(403).json({
            ok: false,
            error: "FORBIDDEN",
            message: "연맹장만 연맹을 해체할 수 있습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * POST
 * 길드 도감 기록 생성
 */
router.post(
  "/:id/records",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
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
        kakaoPlaceId,
      } = req.body as {
        title?: string;
        desc?: string;
        content?: string;
        category?: string;
        recordedAt?: string;
        rating?: number;
        mainImage?: string | null;
        extraImages?: string[];
        hashtags?: string[];
        kakaoPlaceId?: string;
      };

      if (!title || !title.trim()) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "title은 필수입니다.",
        });
      }

      const data = await createGuildRecord(userId, guildId, {
        title: title.trim(),
        desc,
        content,
        category,
        recordedAt,
        rating,
        mainImage,
        extraImages,
        hashtags,
        kakaoPlaceId,
      });

      return res.status(201).json({ ok: true, data });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "GUILD_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "연맹을 찾을 수 없습니다.",
          });
        }
        if (code === "NOT_MEMBER") {
          return res.status(403).json({
            ok: false,
            error: "FORBIDDEN",
            message: "연맹 멤버만 도감을 추가할 수 있습니다.",
          });
        }
        if (code === "MIN_STAY_NOT_MET") {
          return res.status(400).json({
            ok: false,
            error: "BAD_REQUEST",
            message: err.message || "해당 장소에서 최소 5분 이상 머물러야 기록을 작성할 수 있습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * GET
 * 길드 도감 기록 목록 조회
 */
router.get(
  "/:id/records",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guildId = Number(req.params.id);
      if (!guildId || Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "id 파라미터가 올바르지 않습니다.",
        });
      }

      const data = await getGuildRecords(guildId);
      return res.json({ ok: true, data });
    } catch (err: any) {
      if (err instanceof Error && (err as any).code === "GUILD_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "연맹을 찾을 수 없습니다.",
        });
      }
      next(err);
    }
  },
);

/**
 * DELETE
 * 길드 도감 기록 삭제
 */
router.delete(
  "/:id/records/:recordId",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const recordId = req.params.recordId;
      if (!recordId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "recordId 파라미터가 올바르지 않습니다.",
        });
      }

      await deleteGuildRecord(recordId, userId);
      return res.json({ ok: true, data: null });
    } catch (err: any) {
      const code = err?.code;
      if (code === "RECORD_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "도감 기록을 찾을 수 없습니다.",
        });
      }
      if (code === "UNAUTHORIZED") {
        return res.status(403).json({
          ok: false,
          error: "FORBIDDEN",
          message: "본인이 작성한 도감 기록만 삭제할 수 있습니다.",
        });
      }
      next(err);
    }
  },
);

/**
 * GET
 * 특정 도감 기록 조회
 */
router.get(
  "/:id/records/:recordId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recordId = req.params.recordId;
      if (!recordId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "recordId 파라미터가 올바르지 않습니다.",
        });
      }

      const data = await getGuildRecordById(recordId);
      if (!data) {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "도감 기록을 찾을 수 없습니다.",
        });
      }

      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST
 * 길드 도감 댓글 생성
 */
router.post(
  "/:id/records/:recordId/comments",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const recordId = req.params.recordId;
      if (!recordId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "recordId 파라미터가 올바르지 않습니다.",
        });
      }

      const { content, parentCommentId } = req.body as {
        content?: string;
        parentCommentId?: string | null;
      };

      if (!content || !content.trim()) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "댓글 내용을 입력해주세요.",
        });
      }

      const data = await createGuildRecordComment(userId, recordId, {
        content: content.trim(),
        parentCommentId: parentCommentId || null,
      });

      return res.status(201).json({ ok: true, data });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "RECORD_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "도감 기록을 찾을 수 없습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * GET
 * 길드 도감 댓글 목록 조회
 */
router.get(
  "/:id/records/:recordId/comments",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recordId = req.params.recordId;
      if (!recordId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "recordId 파라미터가 올바르지 않습니다.",
        });
      }

      const data = await getGuildRecordComments(recordId);
      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE
 * 길드 도감 댓글 삭제
 */
router.delete(
  "/:id/records/:recordId/comments/:commentId",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const commentId = req.params.commentId;
      if (!commentId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "commentId 파라미터가 올바르지 않습니다.",
        });
      }

      await deleteGuildRecordComment(commentId, userId);
      return res.json({ ok: true, data: null });
    } catch (err: any) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "COMMENT_NOT_FOUND") {
          return res.status(404).json({
            ok: false,
            error: "NOT_FOUND",
            message: "댓글을 찾을 수 없습니다.",
          });
        }
        if (code === "UNAUTHORIZED") {
          return res.status(403).json({
            ok: false,
            error: "FORBIDDEN",
            message: "댓글을 삭제할 권한이 없습니다.",
          });
        }
      }
      next(err);
    }
  },
);

/**
 * POST /api/guilds/:guildId/missions
 * 연맹 미션 생성
 */
router.post(
  "/:guildId/missions",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const guildId = Number(req.params.guildId);
      if (Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "유효하지 않은 연맹 ID입니다.",
        });
      }

      const {
        title,
        content,
        limitCount,
        difficulty,
        mainImage,
        extraImages,
      } = req.body as {
        title?: string;
        content?: string;
        limitCount?: number | string;
        difficulty?: string;
        mainImage?: string | null;
        extraImages?: string[];
      };

      if (!title || !title.trim()) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "미션 제목은 필수입니다.",
        });
      }

      const parsedLimitCount =
        limitCount == null || limitCount === ""
          ? undefined
          : Number(limitCount);

      if (!parsedLimitCount || parsedLimitCount < 1) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "선착순 인원은 1명 이상이어야 합니다.",
        });
      }

      const data = await createGuildMission(userId, guildId, {
        title: title.trim(),
        content: content || undefined,
        limitCount: parsedLimitCount,
        difficulty: difficulty || undefined,
        mainImage: mainImage || undefined,
        extraImages: Array.isArray(extraImages) ? extraImages : undefined,
      });

      return res.status(201).json({ ok: true, data });
    } catch (err: any) {
      const code = err?.code;
      if (code === "GUILD_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "연맹을 찾을 수 없습니다.",
        });
      }
      if (code === "UNAUTHORIZED") {
        return res.status(403).json({
          ok: false,
          error: "FORBIDDEN",
          message: "연맹장만 미션을 생성할 수 있습니다.",
        });
      }
      if (code === "TITLE_REQUIRED") {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "미션 제목은 필수입니다.",
        });
      }
      if (code === "INVALID_LIMIT_COUNT") {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "선착순 인원은 1명 이상이어야 합니다.",
        });
      }
      next(err);
    }
  },
);

/**
 * GET /api/guilds/:guildId/missions
 * 연맹 미션 목록 조회 (진행 중인 미션만)
 * 규칙: participantCount < limitCount 인 미션만 반환
 */
router.get(
  "/:guildId/missions",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const guildId = Number(req.params.guildId);
      if (Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "유효하지 않은 연맹 ID입니다.",
        });
      }

      const data = await getGuildMissions(guildId);
      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/guilds/:guildId/missions/completed
 * 완료된 연맹 미션 목록 조회
 * 규칙: participantCount >= limitCount 인 미션만 반환
 * 프론트에서 "📚 연맹 미션" 섹션에 표시
 */
router.get(
  "/:guildId/missions/completed",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const guildId = Number(req.params.guildId);
      if (Number.isNaN(guildId)) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "유효하지 않은 연맹 ID입니다.",
        });
      }

      const data = await getCompletedGuildMissions(guildId);
      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/guilds/:guildId/missions/:missionId
 * 연맹 미션 삭제
 * 규칙: 연맹장만 삭제 가능
 */
router.delete(
  "/:guildId/missions/:missionId",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      const missionId = req.params.missionId;
      if (!missionId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "유효하지 않은 미션 ID입니다.",
        });
      }

      await deleteGuildMission(missionId, userId);
      return res.json({ ok: true, data: null });
    } catch (err: any) {
      const code = err?.code;
      if (code === "MISSION_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "연맹 미션을 찾을 수 없습니다.",
        });
      }
      if (code === "UNAUTHORIZED") {
        return res.status(403).json({
          ok: false,
          error: "FORBIDDEN",
          message: "연맹장만 미션을 삭제할 수 있습니다.",
        });
      }
      next(err);
    }
  },
);

/**
 * GET /api/guilds/:guildId/missions/:missionId/records
 * 미션별 후기 목록 조회
 */
router.get(
  "/:guildId/missions/:missionId/records",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const missionId = req.params.missionId;
      if (!missionId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "유효하지 않은 미션 ID입니다.",
        });
      }

      const data = await getGuildMissionRecords(missionId);
      return res.json({ ok: true, data });
    } catch (err: any) {
      const code = err?.code;
      if (code === "MISSION_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "미션을 찾을 수 없습니다.",
        });
      }
      next(err);
    }
  },
);

/**
 * POST /api/guilds/:guildId/missions/:missionId/records
 * 미션 참여 기록 생성 (미션 도감 작성)
 */
router.post(
  "/:guildId/missions/:missionId/records",
  authRequired,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    const guildId = Number(req.params.guildId);
    const missionId = req.params.missionId;
    
    try {
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      if (Number.isNaN(guildId) || !missionId) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "유효하지 않은 연맹 ID 또는 미션 ID입니다.",
        });
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
      } = req.body as {
        title?: string;
        desc?: string;
        content?: string;
        category?: string;
        recordedAt?: string;
        rating?: number;
        mainImage?: string | null;
        extraImages?: string[];
        hashtags?: string[];
      };

      if (!title || !title.trim()) {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "후기 제목은 필수입니다.",
        });
      }

      const data = await createGuildMissionRecord(userId, guildId, missionId, {
        title: title.trim(),
        desc: desc || undefined,
        content: content || undefined,
        category: category || undefined,
        recordedAt: recordedAt || undefined,
        rating: rating || undefined,
        mainImage: mainImage || undefined,
        extraImages: Array.isArray(extraImages) ? extraImages : undefined,
        hashtags: Array.isArray(hashtags) ? hashtags : undefined,
      });

      return res.status(201).json({ ok: true, data });
    } catch (err: any) {
      console.error("[미션 참여 기록 생성] 에러:", err);
      console.error("[미션 참여 기록 생성] 에러 상세:", {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        userId,
        guildId,
        missionId,
      });
      
      const code = err?.code;
      if (code === "GUILD_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "연맹을 찾을 수 없습니다.",
        });
      }
      if (code === "NOT_MEMBER") {
        return res.status(403).json({
          ok: false,
          error: "FORBIDDEN",
          message: "연맹 멤버만 미션에 참여할 수 있습니다.",
        });
      }
      if (code === "MISSION_NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND",
          message: "미션을 찾을 수 없습니다.",
        });
      }
      if (code === "MISSION_FULL") {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "아쉽지만 이미 끝난 미션입니다.",
        });
      }
      if (code === "ALREADY_PARTICIPATED") {
        return res.status(400).json({
          ok: false,
          error: "BAD_REQUEST",
          message: "이미 참여한 미션입니다.",
        });
      }
      next(err);
    }
  },
);

export default router;
