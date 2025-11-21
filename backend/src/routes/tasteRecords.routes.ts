// backend/src/routes/tasteRecords.routes.ts
// ============================================================
// 취향 기록(TasteRecord) API 라우터
// ------------------------------------------------------------
// 이 라우터는 "취향 기록" CRUD 중 일부를 담당합니다.
//
//   - [POST] /api/taste-records      : 취향 기록 생성
//   - [GET]  /api/taste-records      : 내 취향 기록 목록 조회
//   - [GET]  /api/taste-records/:id  : 내 특정 취향 기록 상세 조회
//
// app.ts / routes/index.ts 에서:
//   app.use('/api', routes);
//   routes.use('/taste-records', tasteRecordsRouter);
//
// 와 같은 식으로 마운트된다고 가정합니다.
// ============================================================

import { Router, Request, Response, NextFunction } from 'express';
import authRequired from '../middlewares/authRequired';
import {
  createTasteRecord,
  getTasteRecordsByUser,
  getTasteRecordByIdForUser,
  deleteTasteRecord,
} from '../services/tasteRecord.service';

// ============================================================
// 인증 요청 타입 보완: AuthedRequest
// ------------------------------------------------------------
// - currentUser: authRequired 미들웨어에서 주입된다고 가정
//   (req.currentUser = req.session.user 형태)
// ============================================================
type AuthedRequest = Request & {
  currentUser?: { id: string; email?: string };
};

// ============================================================
// 헬퍼 함수: getUserId
// ------------------------------------------------------------
// Request에서 현재 로그인한 userId(Int)를 안전하게 꺼내는 유틸입니다.
//
// - 우선순위:
//   1) req.currentUser?.id (authRequired에서 넣어준 값)
//   2) req.session.user?.id (혹시 currentUser가 없을 경우 대비)
//
// - 반환:
//   - 정수로 변환 가능한 경우: number
//   - 없거나 NaN인 경우: null
// ============================================================
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

const router = Router();

// ============================================================
// 전역 인증 보호
// ------------------------------------------------------------
// 이 라우터 아래의 모든 엔드포인트는 로그인 필수입니다.
// - authRequired 미들웨어에서 세션을 확인하고,
//   실패 시 401(UNAUTHORIZED) 응답을 반환합니다.
// ============================================================
router.use(authRequired);

// ============================================================
// [POST] /api/taste-records
// ------------------------------------------------------------
// 취향 기록 생성
// ============================================================
router.post(
  '/',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      // 1) 로그인된 사용자 ID 추출
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        });
      }

      // 2) 요청 바디 구조 분해 (썸네일 URL 포함)
      const {
        title,
        caption,
        content,
        category,
        tags,
        thumb, // ✅ 썸네일 URL (예: `/uploads/taste-records/xxx.jpg`)
      } = req.body as {
        title?: string;
        caption?: string;
        content?: string;
        category?: string;
        tags?: string[];
        thumb?: string | null;
      };

      // 3) 필수 항목(title, category) 검증
      if (!title || !category) {
        return res.status(400).json({
          ok: false,
          error: 'BAD_REQUEST',
          message: 'title과 category는 필수입니다.',
        });
      }

      // 4) 서비스 레이어에 위임하여 레코드 생성 (thumb 포함)
      const data = await createTasteRecord(userId, {
        title,
        caption,
        content,
        category,
        tags,
        thumb,
      });

      // 5) 프론트에서 사용하는 형태로 응답
      res.status(201).json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// [GET] /api/taste-records
// ------------------------------------------------------------
// 내 취향 기록 목록 조회
// ============================================================
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

      const data = await getTasteRecordsByUser(userId);

      res.json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// [GET] /api/taste-records/:id
// ------------------------------------------------------------
// 내 특정 취향 기록 상세 조회
// ============================================================
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

      const data = await getTasteRecordByIdForUser(userId, id);

      if (!data) {
        return res.status(404).json({
          ok: false,
          error: 'NOT_FOUND',
          message: '기록을 찾을 수 없습니다.',
        });
      }

      res.json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// [DELETE] /api/taste-records/:id
// ------------------------------------------------------------
// 내 특정 취향 기록 삭제
// - id + userId 조건으로, 본인 기록만 삭제 가능
// ============================================================
router.delete(
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

      // 서비스 레이어에 삭제 위임 (boolean 반환)
      const deleted = await deleteTasteRecord(userId, id);

      if (!deleted) {
        return res.status(404).json({
          ok: false,
          error: 'NOT_FOUND',
          message: '삭제할 기록을 찾을 수 없습니다.',
        });
      }

      return res.json({
        ok: true,
        message: '기록이 삭제되었습니다.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;