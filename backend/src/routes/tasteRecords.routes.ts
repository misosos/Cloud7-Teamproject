// backend/src/routes/tasteRecords.routes.ts
// ============================================================
// 취향 기록(TasteRecord) API 라우터
// ------------------------------------------------------------
// 이 라우터는 "취향 기록" CRUD + 인사이트 일부를 담당합니다.
//
// 🔗 최종 엔드포인트(실제 클라이언트에서 호출하는 경로)
//   - [POST]    /api/taste-records              : 취향 기록 생성
//   - [GET]     /api/taste-records              : 내 취향 기록 목록 조회
//   - [GET]     /api/taste-records/insights     : 내 취향 인사이트/통계 조회
//   - [GET]     /api/taste-records/:id          : 내 특정 취향 기록 상세 조회
//   - [DELETE]  /api/taste-records/:id          : 내 특정 취향 기록 삭제
//
// 📌 마운트 구조(app.ts / routes/index.ts 기준)
//   app.ts:
//     app.use('/api', routes);
//
//   routes/index.ts:
//     router.use('/taste-records', tasteRecordsRouter);
//
//   → 따라서 이 파일 안에서 정의한 경로들은
//      '/', '/insights', '/:id' 처럼 상대 경로이고,
//      최종 경로는 항상 `/api/taste-records/*` 형태가 됩니다.
//
//   ⚠️ 프론트엔드에서는 반드시 `/api/taste-records...` 형태로 호출해야 하며,
//      `/taste-records`처럼 `/api` 없이 호출하면 React index.html이 반환되어
//      "Unexpected token '<'" 와 같은 JSON 파싱 에러가 발생할 수 있습니다.
// ============================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import authRequired from '../middlewares/authRequired';
import {
  createTasteRecord,
  getTasteRecordsByUser,
  getTasteRecordByIdForUser,
  deleteTasteRecord,
  // ✅ 인사이트용 서비스 함수
  getTasteRecordInsightsByUser,
} from '../services/tasteRecord.service';

// ============================================================
// 인증 요청 타입 보완: AuthedRequest
// ------------------------------------------------------------
// - currentUser: authRequired 미들웨어에서 주입된다고 가정
//   (req.currentUser = req.session.user 형태)
// ============================================================
type AuthedRequest = Request & {
  currentUser?: {
    id: string;
    email?: string;
  };
};

// ============================================================
// 요청 바디 타입: CreateTasteRecordBody
// ------------------------------------------------------------
// 취향 기록 생성 시 들어오는 바디를 타입으로 정리해서
// 아래 POST 핸들러에서 재사용합니다.
// ============================================================
type CreateTasteRecordBody = {
  title?: string;
  caption?: string;
  content?: string;
  category?: string;
  tags?: string[];
  // 썸네일 URL (예: `/uploads/taste-records/xxx.jpg`)
  thumb?: string | null;
  // 프론트에서 YYYY-MM-DD 또는 ISO 문자열로 보내준다고 가정
  visitedAt?: string | null;
};

// ============================================================
// 헬퍼 함수: getUserId
// ------------------------------------------------------------
// Request에서 현재 로그인한 userId(Int)를 안전하게 꺼내는 유틸입니다.
//
// - 우선순위:
//   1) (req as AuthedRequest).currentUser?.id (authRequired에서 넣어준 값)
//   2) req.session.user?.id (혹시 currentUser가 없을 경우 대비)
//
// - 반환:
//   - 정수로 변환 가능한 경우: number
//   - 없거나 NaN인 경우: null
// ============================================================
function getUserId(req: Request): number | null {
  const authed = req as AuthedRequest;
  const sessionUser = (req as any).session?.user as
    | { id?: string }
    | undefined;

  const rawId =
    authed.currentUser?.id ??
    sessionUser?.id ??
    null;

  if (!rawId) return null;

  const num = Number(rawId);
  if (Number.isNaN(num)) return null;

  return num;
}

const router = Router();

// 공통 Unauthorized 응답 헬퍼
const sendUnauthorized = (res: Response): void => {
  res.status(401).json({
    ok: false,
    error: 'UNAUTHORIZED',
    message: '로그인이 필요합니다.',
  });
};

// 공통 BadRequest 응답 헬퍼
const sendBadRequest = (res: Response, message: string): void => {
  res.status(400).json({
    ok: false,
    error: 'BAD_REQUEST',
    message,
  });
};

// ============================================================
// 전역 인증 보호 (로그인 필수)
// ------------------------------------------------------------
// 이 라우터 아래의 모든 엔드포인트는 로그인 필수입니다.
// - authRequired 미들웨어에서 세션/쿠키를 확인하고,
//   실패 시 401(UNAUTHORIZED) + { ok: false, message: '로그인이 필요합니다.' }
//   형태로 응답합니다.
//
// 👉 따라서 클라이언트에서 이 API들을 호출할 때는
//    - 항상 withCredentials: true 옵션을 사용하고
//    - 먼저 /api/auth/login → /api/auth/me 순서로 세션을 생성/확인해야 합니다.
// ============================================================
router.use(authRequired);

// ============================================================
// [POST] /api/taste-records
// ------------------------------------------------------------
// 취향 기록 생성
//  - visitedAt: 사용자가 실제로 경험한 날짜(선택 사항)
//  - thumb    : 업로드된 썸네일 이미지 URL(선택 사항)
// ============================================================
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1) 로그인된 사용자 ID 추출
      const userId = getUserId(req);
      if (!userId) {
        sendUnauthorized(res);
        return;
      }

      // 2) 요청 바디 구조 분해
      const {
        title,
        caption,
        content,
        category,
        tags,
        thumb, // ✅ 썸네일 URL (예: `/uploads/taste-records/xxx.jpg`)
        visitedAt, // ✅ 사용자가 선택한 날짜(문자열, 선택 사항)
      } = req.body as CreateTasteRecordBody;

      // 3) 필수 항목(title, category) 검증
      if (!title || !category) {
        sendBadRequest(res, 'title과 category는 필수입니다.');
        return;
      }

      // 4) 날짜 문자열을 Date 객체로 변환 (옵션 필드)
      //  - 값이 없거나, 잘못된 형식이면 DB에 넣지 않도록 null 처리
      let visitedAtDate: Date | null = null;
      if (visitedAt) {
        const parsed = new Date(visitedAt);
        if (!Number.isNaN(parsed.getTime())) {
          visitedAtDate = parsed;
        }
      }

      // 5) 서비스 레이어에 위임하여 레코드 생성 (thumb + visitedAt 포함)
      const data = await createTasteRecord(userId, {
        title,
        caption,
        content,
        category,
        tags,
        thumb,
        // Prisma 스키마에 `recordDate DateTime?` 필드가 있다고 가정
        recordDate: visitedAtDate ?? undefined,
      });

      // 6) 프론트에서 사용하는 형태로 응답
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
//  - 서비스 레이어에서 recordDate(또는 visitedAt 역할)까지
//    포함해 반환한다고 가정
// ============================================================
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        sendUnauthorized(res);
        return;
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
// [GET] /api/taste-records/insights
// ------------------------------------------------------------
// 내 취향 인사이트/통계 조회
//
// 예시: (서비스 레이어에서 실제 구조 정의)
// {
//   totalCount: number;                         // 전체 기록 수
//   byCategory: { [category: string]: number };// 카테고리별 개수
//   topTags: { tag: string; count: number }[]; // 인기 태그 Top N
//   timeline: { date: string; count: number }[];// 날짜별 기록 수
// }
//
// 쿼리 파라미터로 기간 필터를 받을 수 있게 설계:
//   GET /api/taste-records/insights?from=2025-01-01&to=2025-01-31
// ============================================================
router.get(
  '/insights',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        sendUnauthorized(res);
        return;
      }

      const { from, to } = req.query as { from?: string; to?: string };

      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) {
          fromDate = d;
        }
      }

      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) {
          toDate = d;
        }
      }

      // ⚠️ 현재 서비스 함수는 (userId)만 받도록 구현되어 있으므로
      // fromDate, toDate는 이후 확장 시에 활용 가능
      const data = await getTasteRecordInsightsByUser(userId);

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
//  - 서비스 레이어에서 recordDate(방문일) 필드까지 포함해서 반환한다고 가정
// ============================================================
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        sendUnauthorized(res);
        return;
      }

      const { id } = req.params;
      if (!id) {
        sendBadRequest(res, 'id 파라미터가 필요합니다.');
        return;
      }

      const data = await getTasteRecordByIdForUser(userId, id);

      if (!data) {
        res.status(404).json({
          ok: false,
          error: 'NOT_FOUND',
          message: '기록을 찾을 수 없습니다.',
        });
        return;
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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        sendUnauthorized(res);
        return;
      }

      const { id } = req.params;
      if (!id) {
        sendBadRequest(res, 'id 파라미터가 필요합니다.');
        return;
      }

      // 서비스 레이어에 삭제 위임 (boolean 반환)
      const deleted = await deleteTasteRecord(userId, id);

      if (!deleted) {
        res.status(404).json({
          ok: false,
          error: 'NOT_FOUND',
          message: '삭제할 기록을 찾을 수 없습니다.',
        });
        return;
      }

      res.json({
        ok: true,
        message: '기록이 삭제되었습니다.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;