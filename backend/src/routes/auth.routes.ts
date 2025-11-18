/**
 * ✅ 인증(Auth) 라우터
 * - 이 파일은 인증 관련 엔드포인트(`/auth/*`)만 담당합니다.
 * - 보통 `app.ts` 또는 `src/routes/index.ts`에서 `app.use('/auth', authRouter)`로 마운트하여 사용합니다.
 *
 * 프론트엔드 연동 규칙(세션 쿠키 기반)
 * 1) 반드시 `fetch/axios` 호출 시 `credentials: 'include'`를 설정해야 쿠키가 전송됩니다.
 * 2) 서버 `cors`는 `{ origin: ENV.CORS_ORIGIN, credentials: true }`로 설정되어 있어야 합니다.
 * 3) 세션 저장 컨벤션(권장): `req.session.user = { id, email, role }`
 *    - `/auth/me`는 이 세션 값을 읽어 현재 로그인 사용자를 반환합니다.
 *
 * 엔드포인트 개요
 * - GET   /auth/me      : 현재 로그인한 사용자 조회 (세션 확인)
 * - POST  /auth/login   : 로그인 처리(성공 시 세션에 user 저장)
 * - POST  /auth/logout  : 로그아웃 처리(세션 파기 + 쿠키 제거)
 *
 * 보안/운영 팁
 * - `/auth/me`는 보통 보호 라우트로 설정합니다. 로그인 연동 완료 후 `authRequired`를 끼워 넣어주세요.
 * - `/auth/logout`는 멱등성을 위해 POST를 사용(서버 상태 변경). CSRF 대비가 필요한 경우 SameSite 설정 또는 CSRF 토큰 적용 고려.
 */

// Express 라우터 유틸
import { Router } from 'express';

// 컨트롤러: 실제 비즈니스 로직은 컨트롤러에서 처리합니다.
// - me     : 세션에서 사용자 정보를 읽어 반환
// - login  : 자격 증명 검증 후 `req.session.user = {...}` 저장
// - logout : 세션 파괴 및 쿠키 제거
import { me, login, logout } from '../controllers/auth.controller';

// (선택) 로그인 이후 보호가 필요하면 아래 미들웨어를 사용하세요.
// TODO: 로그인 연동 후 `/auth/me` 등 보호가 필요한 경로에 적용
// import { authRequired } from '../middlewares/authRequired';

const router = Router();

/**
 * GET /auth/me
 * - 현재 로그인한 사용자의 세션 정보를 반환합니다.
 * - 기본 상태: 공개 엔드포인트(초기 세팅). 실제 서비스에서는 보호 라우트 권장.
 *   → 적용 예시: router.get('/me', authRequired, me);
 */
router.get('/me', me);

/**
 * POST /auth/login
 * - 요청 본문 예시: { "email": "a@b.com", "password": "****" }
 * - 성공 시 세션에 user를 저장하고, 프론트로 사용자 정보/상태를 반환합니다.
 * - 프론트는 `credentials: 'include'`로 호출해야 세션 쿠키가 설정됩니다.
 */
router.post('/login', login);

/**
 * POST /auth/logout
 * - 현재 세션을 파기(destroy)하고 쿠키를 제거합니다.
 * - 프론트는 성공 여부만 확인하고 클라이언트 상태(Zustand user)도 초기화해주세요.
 */
router.post('/logout', logout);

export default router;