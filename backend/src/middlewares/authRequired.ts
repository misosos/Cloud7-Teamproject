//middlewares/authRequired.ts
// src/middlewares/authRequired.ts
import type { Request, Response, NextFunction } from 'express';

/**
 * 로그인 보호 미들웨어 (세션 쿠키 기반)
 *
 * ✅ 목적
 * - "로그인이 필요한 API" 앞단에서 세션에 사용자 정보가 있는지 검사합니다.
 * - 없으면 401(Unauthorized)을 반환하고, 있으면 다음 핸들러로 넘깁니다.
 *
 * 🔌 A안(얇은 Zustand) 프론트 연동 컨벤션
 * - 부팅 시:  /auth/me 호출 → 200이면 user 세팅, 401이면 비로그인
 * - 로그인:   성공 후 스토어에 user 넣고, 필요 시 /auth/me 재요청
 * - 로그아웃: 서버 /auth/logout 호출 + 스토어 초기화
 *
 * 🧠 구현 메모
 * - 아직 실제 로그인/세션 저장 로직이 없어도 이 파일은 안전하게 임포트 가능해야 합니다.
 *   → req.session 타입 의존성을 강제하지 않고 (req as any).session 형태로 접근합니다.
 * - 로그인 성공 시 컨트롤러에서 req.session.user = { id, email, role, ... } 형태로 저장한다고 가정합니다.
 */
export default function authRequired(req: Request, res: Response, next: NextFunction) {
  // 1) 세션/전략별로 다양한 위치에 유저가 담길 수 있으므로 가능한 후보를 모두 확인
  //    - 세션 전략: req.session.user
  //    - 패스포트/커스텀 전략: req.user
  const userFromSession = (req as any)?.session?.user;
  const user = (req as any).user ?? userFromSession;

  // 2) 없으면 401 응답
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      message: '로그인이 필요합니다.',
    });
  }

  // 3) 다운스트림에서 편하게 쓰도록 currentUser로 노출(선택)
  (req as any).currentUser = user;

  // 4) 통과
  return next();
}

/* =============================================================================
   사용법 (예시)
   -----------------------------------------------------------------------------
   // src/routes/auth.routes.ts
   import { Router } from 'express';
   import authRequired from '../middlewares/authRequired';
   import { getProfile } from '../controllers/auth.controller';

   const router = Router();
   router.get('/me', authRequired, getProfile); // 보호 라우트
   export default router;

   // src/controllers/auth.controller.ts
   export const getProfile = (req, res) => {
     // 로그인된 사용자 정보
     const user = (req as any).currentUser; // 또는 (req as any).session.user
     return res.json({ ok: true, user });
   };

   // (참고) 로그인 성공 시 세션 저장 컨벤션
   // req.session.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role };

   -----------------------------------------------------------------------------
   CORS / 쿠키 체크리스트 (app.ts)
   -----------------------------------------------------------------------------
   app.use(
     cors({
       origin: ENV.CORS_ORIGIN,   // 프론트 주소
       credentials: true,         // 쿠키 전달 허용
     })
   );

   app.use(
     session({
       name: 'sid',
       secret: ENV.SESSION_SECRET,
       resave: false,
       saveUninitialized: false,
       cookie: {
         httpOnly: true,
         sameSite: 'lax', // 서로 다른 도메인 사용 시 'none'(+ secure: true)
         secure: ENV.NODE_ENV === 'production',
         maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
       },
     })
   );

   -----------------------------------------------------------------------------
   역할 기반 보호가 필요하다면 (선택 기능)
   -----------------------------------------------------------------------------
   export function requireRole(...roles: string[]) {
     return (req: Request, res: Response, next: NextFunction) => {
       const user = (req as any)?.session?.user ?? (req as any).user;
       if (!user) {
         return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
       }
       if (!roles.includes(user.role)) {
         return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
       }
       next();
     };
   }
   // 사용 예: router.post('/admin-only', authRequired, requireRole('admin'), handler);

   -----------------------------------------------------------------------------
   디버깅 팁
   -----------------------------------------------------------------------------
   - 쿠키가 안 실리면: 프론트 fetch/axios에 credentials: 'include' 옵션을 추가했는지 확인
   - /auth/me가 항상 401이면: 로그인 핸들러에서 req.session.user가 제대로 세팅되는지 확인
   - 개발 모드에서 다른 도메인/포트를 쓰면: sameSite/secure 조합이 맞는지 점검
   ============================================================================= */