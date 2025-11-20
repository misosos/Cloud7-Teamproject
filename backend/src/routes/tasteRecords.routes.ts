// backend/src/routes/tasteRecords.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import authRequired from '../middlewares/authRequired';
import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 인스턴스 (필요 시 공용 인스턴스로 교체 가능)
const prisma = new PrismaClient();

/**
 * 로그인된 유저 정보 타입 보완
 * - currentUser는 프로젝트 전역 미들웨어에서 주입된다고 가정
 * - session은 이미 express-session 타입에 정의되어 있으므로 따로 재정의하지 않음
 */
type AuthedRequest = Request & {
  currentUser?: { id: string; email?: string };
};
/**
 * Request에서 현재 로그인한 userId(Int)를 안전하게 꺼내는 헬퍼
 */
function getUserId(req: AuthedRequest): number | null {
  const sessionUser = (req as any).session?.user as
    | { id?: string }
    | undefined;

  const rawId =
    req.currentUser?.id ??
    sessionUser?.id ??
    null;

  if (!rawId) return null;

  const num = Number(rawId);
  if (Number.isNaN(num)) return null;

  return num;
}

/**
 * Prisma TasteRecord → 프론트에서 사용하는 형태로 직렬화
 * - desc: null 방지
 * - content: null 방지
 * - tagsJson: string → string[] 로 파싱
 * - createdAt: Date → ISO 문자열
 */
function serialize(record: any) {
  return {
    id: record.id,
    title: record.title,
    desc: record.desc ?? '',
    content: record.content ?? '',
    category: record.category,
    tags: record.tagsJson ? (JSON.parse(record.tagsJson) as string[]) : [],
    thumb: record.thumb ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

const router = Router();

// 🔒 이 라우터 아래의 모든 엔드포인트는 로그인 필수
router.use(authRequired);

/**
 * [POST] /api/taste-records
 * 취향 기록 생성
 */
router.post(
  '/',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        });
      }

      const { title, caption, content, category, tags } = req.body as {
        title?: string;
        caption?: string;
        content?: string;
        category?: string;
        tags?: string[];
      };

      if (!title || !category) {
        return res.status(400).json({
          ok: false,
          error: 'BAD_REQUEST',
          message: 'title과 category는 필수입니다.',
        });
      }

      const created = await prisma.tasteRecord.create({
        data: {
          userId,
          title,
          desc: caption ?? null, // 프론트 caption → DB desc
          content: content ?? null,
          category,
          tagsJson:
            tags && Array.isArray(tags) && tags.length > 0
              ? JSON.stringify(tags)
              : null,
          thumb: null,
        },
      });

      res.status(201).json({
        ok: true,
        data: serialize(created),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * [GET] /api/taste-records
 * 내 취향 기록 목록 조회
 */
router.get(
  '/',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        });
      }

      const records = await prisma.tasteRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        ok: true,
        data: records.map(serialize),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * [GET] /api/taste-records/:id
 * 내 특정 취향 기록 상세 조회
 */
router.get(
  '/:id',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          ok: false,
          error: 'BAD_REQUEST',
          message: 'id 파라미터가 필요합니다.',
        });
      }

      const record = await prisma.tasteRecord.findFirst({
        where: {
          id,
          userId, // 내 것만 조회
        },
      });

      if (!record) {
        return res.status(404).json({
          ok: false,
          error: 'NOT_FOUND',
          message: '기록을 찾을 수 없습니다.',
        });
      }

      res.json({
        ok: true,
        data: serialize(record),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;