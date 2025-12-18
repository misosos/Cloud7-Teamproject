/**
 * 인증(Auth) 라우터
 * - 이 파일은 인증 관련 엔드포인트(`/api/auth/*`)만 담당합니다.
 * - 보통 `app.ts` 또는 `src/routes/index.ts`에서 `app.use('/api/auth', authRouter)`로 마운트하여 사용합니다.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 프론트엔드 연동 규칙(세션 쿠키 기반)
 * 1) 반드시 `fetch/axios` 호출 시 `credentials: 'include'`(axios는 `withCredentials: true`)를 설정해야
 *    브라우저가 `Set-Cookie`를 저장하고 이후 요청마다 세션 쿠키를 전송합니다.
 * 2) 서버 CORS는 `{ origin: ENV.CORS_ORIGIN, credentials: true }`로 설정되어 있어야 합니다.
 * 3) 세션 저장 컨벤션(권장): `req.session.user = { id, email, role }`
 *    - `/auth/me`는 이 세션 값을 읽어 현재 로그인 사용자를 반환합니다.
 * 4) 개발 중 같은 도메인이 아니라면(예: Vite http://localhost:5173 ↔ API http://localhost:3000),
 *    쿠키 도메인/포트가 달라서 인증이 안 되는 일이 많습니다. CORS와 `credentials` 설정을 꼭 맞추세요.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 엔드포인트 개요
 * - GET   /auth/me       : 현재 로그인한 사용자 조회 (세션 확인)
 * - POST  /auth/register : 회원가입 처리(성공 시 세션에 user 저장)
 * - POST  /auth/login    : 로그인 처리(성공 시 세션에 user 저장)
 * - POST  /auth/logout   : 로그아웃 처리(세션 파기 + 쿠키 제거)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 보안/운영 팁
 * - `/auth/me`는 실제 서비스에서는 보호 라우트(예: `authRequired`)를 권장합니다.
 * - `/auth/logout`는 멱등성(idempotent)을 위해 POST 사용. CSRF 대비는 SameSite, CSRF 토큰 등 적용 고려.
 * - 비밀번호는 DB에 평문 저장 금지(이미 서비스 레이어에서 bcrypt 해시 사용).
 * - 에러 메시지는 과도한 정보 노출 금지(존재 여부, 해시 비교 실패 이유 등은 통일된 메시지로).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 빠른 테스트(curl)
 * 1) 회원가입:
 *    curl -i -c cookies.txt -H "Content-Type: application/json" \
 *      -d '{"email":"a@b.com","password":"123456","name":"홍길동"}' \
 *      http://localhost:3000/api/auth/register
 * 2) 로그인:
 *    curl -i -b cookies.txt -c cookies.txt -H "Content-Type: application/json" \
 *      -d '{"email":"a@b.com","password":"123456"}' \
 *      http://localhost:3000/api/auth/login
 * 3) 세션 확인:
 *    curl -i -b cookies.txt http://localhost:3000/api/auth/me
 * 4) 로그아웃:
 *    curl -i -b cookies.txt -X POST http://localhost:3000/api/auth/logout
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 프론트 예시(axios)
 *   const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, withCredentials: true });
 *   await api.post('/auth/login', { email, password }); // 쿠키 저장됨
 *   const { data } = await api.get('/auth/me');         // 세션 사용자 조회
 */

import { Router } from 'express';
import { me, register, login, logout } from '../controllers/auth.controller';
import {
  getKakaoAuthUrl,
  getKakaoToken,
  getKakaoUserInfo,
  findOrCreateKakaoUser,
} from '../services/kakaoAuth.service';
import { env } from '../utils/env';
// import authRequired from '../middlewares/authRequired';

const router = Router();

/**
 * GET /auth/me
 *
 * - 현재 로그인한 사용자의 세션 정보를 반환합니다.
 * - 기본 상태:
 *   - "공개 엔드포인트"로 구성하여, 앱 부팅 시 로그인 여부만 확인합니다.
 *   - 실제 서비스에서는 `authRequired`를 적용해 보호 라우트로 바꾸는 것을 권장합니다.
 *
 * 응답 예시
 *   200 OK
 *     { ok: true, authenticated: true, user: { id, email, name?, role? } }  // 로그인된 상태
 *
 *   200 OK
 *     { ok: true, authenticated: false, user: null }                       // 로그인 안 된 상태
 *
 *   (보호 라우트 적용 시 예시)
 *   401 Unauthorized
 *     { ok: false, error: 'UNAUTHORIZED', message?: '...' }
 *
 * 프론트 주의
 * - `withCredentials: true`(axios) 또는 `credentials: 'include'`(fetch)를
 *   설정하지 않으면 세션 쿠키가 전송되지 않아 항상 비로그인으로 보일 수 있습니다.
 */
router.get('/me', me);

/**
 * POST /auth/register
 *
 * - 회원가입: 본문에 `{ email, password, name? }`를 받습니다.
 * - 성공 시 세션에 user를 저장하고, 생성된 사용자 정보를 반환합니다.
 *
 * 요청 바디 예시
 *   {
 *     "email": "a@b.com",
 *     "password": "123456",
 *     "name": "홍길동"
 *   }
 *
 * 응답 예시
 *   201 Created
 *     { ok: true, user: { id, email, name?, role? } }
 *
 *   400 Bad Request
 *     { ok: false, error: 'email and password are required' }
 *
 *   409 Conflict
 *     { ok: false, error: 'Email already registered' }
 *
 * curl 예시
 *   curl -i -c cookies.txt -H "Content-Type: application/json" \
 *     -d '{"email":"a@b.com","password":"123456","name":"홍길동"}' \
 *     http://localhost:3000/api/auth/register
 */
router.post('/register', register);

/**
 * POST /auth/login
 *
 * - 로그인: 본문에 `{ email, password }`를 받습니다.
 * - 성공 시 세션에 user를 저장하고, 사용자 정보를 반환합니다.
 *
 * 요청 바디 예시
 *   {
 *     "email": "a@b.com",
 *     "password": "123456"
 *   }
 *
 * 응답 예시
 *   200 OK
 *     { ok: true, user: { id, email, name?, role? } }
 *
 *   400 Bad Request
 *     { ok: false, error: 'email and password required' }
 *
 *   401 Unauthorized
 *     { ok: false, error: 'Invalid credentials' }
 *
 * 프론트 주의
 * - 여기서도 `withCredentials: true` / `credentials: 'include'`가 반드시 필요합니다.
 *   이 옵션을 설정하지 않으면 서버가 세션 쿠키를 내려줘도 브라우저가 저장하지 않습니다.
 *
 * curl 예시
 *   curl -i -b cookies.txt -c cookies.txt -H "Content-Type: application/json" \
 *     -d '{"email":"a@b.com","password":"123456"}' \
 *     http://localhost:3000/api/auth/login
 */
router.post('/login', login);

/**
 * POST /auth/logout
 *
 * - 현재 세션을 파기(destroy)하고 관련 쿠키를 제거합니다.
 * - 프론트에서는 성공 응답을 받으면 클라이언트 상태(Zustand의 user 등)도 초기화해야 합니다.
 *
 * 응답 예시
 *   200 OK
 *     { ok: true }
 *
 * curl 예시
 *   curl -i -b cookies.txt -X POST http://localhost:3000/api/auth/logout
 */
router.post('/logout', logout);

// ──────────────────────────────────────────────────────────────────────────
// 카카오 소셜 로그인
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /auth/kakao
 *
 * - 카카오 로그인 페이지로 리다이렉트합니다.
 * - 프론트에서 이 URL로 이동하면 카카오 로그인 화면이 나타납니다.
 *
 * 사용 예시
 *   window.location.href = '/api/auth/kakao';
 *   또는
 *   <a href="/api/auth/kakao">카카오로 로그인</a>
 */
router.get('/kakao', (req, res) => {
  // 카카오 CLIENT_ID가 설정되지 않은 경우
  if (!env.KAKAO_CLIENT_ID) {
    return res.status(500).json({
      ok: false,
      error: 'KAKAO_CLIENT_ID가 설정되지 않았습니다.',
    });
  }

  const kakaoAuthUrl = getKakaoAuthUrl();
  res.redirect(kakaoAuthUrl);
});

/**
 * GET /auth/kakao/callback
 *
 * - 카카오 로그인 후 돌아오는 콜백 URL입니다.
 * - 카카오에서 인가 코드(code)를 받아 토큰 교환 → 사용자 정보 조회 → 세션 생성
 * - 성공 시 프론트엔드 대시보드로 리다이렉트합니다.
 *
 * 쿼리 파라미터
 *   - code: 카카오에서 받은 인가 코드
 *   - error: 에러 발생 시 에러 코드
 */
router.get('/kakao/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    // 카카오에서 에러를 반환한 경우 (사용자가 취소 등)
    if (error) {
      console.error('[카카오 로그인] 에러:', error);
      return res.redirect(`${env.CORS_ORIGIN}/before-login?error=kakao_auth_failed`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${env.CORS_ORIGIN}/before-login?error=no_code`);
    }

    // 1) 인가 코드로 액세스 토큰 교환
    const accessToken = await getKakaoToken(code);

    // 2) 액세스 토큰으로 사용자 정보 조회
    const kakaoUser = await getKakaoUserInfo(accessToken);

    // 3) DB에서 사용자 찾거나 생성
    const user = await findOrCreateKakaoUser(kakaoUser);

    // 4) 세션에 사용자 정보 저장
    (req.session as any).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileImage: user.profileImage,
      provider: user.provider,
    };

    // 5) 세션 저장 후 프론트엔드로 리다이렉트
    req.session.save((err) => {
      if (err) {
        console.error('[카카오 로그인] 세션 저장 실패:', err);
        return res.redirect(`${env.CORS_ORIGIN}/before-login?error=session_save_failed`);
      }

      console.log(`✅ [카카오 로그인] 성공: userId=${user.id}, email=${user.email}`);
      res.redirect(`${env.CORS_ORIGIN}/dashboard`);
    });
  } catch (err: any) {
    console.error('[카카오 로그인] 콜백 처리 실패:', err?.response?.data || err.message);
    res.redirect(`${env.CORS_ORIGIN}/before-login?error=kakao_callback_failed`);
  }
});

export default router;