/// <reference path="../types/session.d.ts" />
// src/middlewares/authRequired.ts
import type { Request, Response, NextFunction } from 'express';

/**
 * 로그인 보호 미들웨어 (세션 쿠키 기반, A안 전제)
 *
 * - 이 프로젝트는 "세션 쿠키에 user를 저장"하는 방식(A안)을 기본으로 합니다.
 * - 따라서 인증 여부 판단은 `req.session.user`만 사용합니다. (보안상 req.user는 사용하지 않음)
 * - 통과 시 `req.currentUser`에 동일한 객체를 넣어 다운스트림에서 편하게 사용합니다.
 *
 * 프론트 연동 컨벤션
 * - 부팅 시   : /auth/me 호출 → 200이면 user 세팅, 401이면 비로그인 처리
 * - 로그인    : 성공 후 서버가 세션에 user 저장 → 이후 요청부터 자동 인증
 * - 로그아웃  : /auth/logout 호출 → 세션 파기, 클라 스토어 초기화
 */
export default function authRequired(req: Request, res: Response, next: NextFunction) {
  // 1) 세션에 저장된 사용자 정보만을 신뢰
  const user = req.session?.user;

  // 2) 없으면 401
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      message: '로그인이 필요합니다.',
    });
  }

  // 3) 하위 핸들러 편의용 프로퍼티 설정 (타입은 src/types/session.d.ts에서 선언 병합)
  req.currentUser = user;

  // 4) 다음 미들웨어/핸들러로
  return next();
}

/**
 * 역할 기반 접근 제어 (선택)
 * - 사용 예: router.post('/admin-only', authRequired, requireRole('admin'), handler);
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.currentUser ?? req.session?.user;

    if (!user) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    // user.role이 존재할 때만 검사 (없으면 패스)
    if (user.role && !roles.includes(user.role)) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    return next();
  };
}

/* =============================================================================
   CORS / 세션 쿠키 체크리스트 (app.ts 발췌)
   -----------------------------------------------------------------------------
   app.use(
     cors({
       origin: ENV.CORS_ORIGIN,
       credentials: true,
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
         sameSite: 'lax', // 다른 도메인/포트면 'none' (+ secure: true) 조합
         secure: ENV.NODE_ENV === 'production',
         maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
       },
     })
   );
   ============================================================================= */