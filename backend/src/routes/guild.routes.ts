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

export default router;
