/**
 * Express 앱 전역 설정 파일 (app.ts)
 *
 * 역할
 *  - 공통 미들웨어(CORS, 로깅, JSON 파싱, 쿠키/세션)를 한 곳에 모아 Express 앱 인스턴스를 생성합니다.
 *  - 실제 서버 시작(포트 바인딩)은 `src/server.ts`가 담당하고, 이 파일은 "앱 구성"만 담당합니다.
 *
 * 요청 처리 흐름(요약)
 *  1) 브라우저 → 서버 요청
 *  2) 아래 미들웨어들이 선언 순서대로 실행
 *     - `morgan`으로 요청 로깅
 *     - `express.json()`으로 JSON 본문 파싱
 *     - `cookie-parser`로 쿠키 읽기
 *     - `cors`로 프론트 도메인에서의 쿠키 포함 요청 허용
 *     - `express-session`으로 세션(쿠키) 복원 및 생성
 *  3) 마지막에 `routes`로 분기되어 `/health`, `/auth` 등 개별 엔드포인트 처리
 *
 * 환경변수(.env) 가이드
 *  - NODE_ENV            : 'development' | 'production'
 *  - PORT                : 서버 포트 (예: 3000) → 실제 사용은 server.ts에서
 *  - SESSION_SECRET      : 세션 서명용 비밀키(길고 복잡하게). 절대 깃에 올리지 마세요.
 *  - CORS_ORIGIN         : 프론트엔드 주소 (예: http://localhost:5173, 배포 시 실제 도메인으로 변경)
 *
 * 배포/보안 팁
 *  - `app.set('trust proxy', 1)` : 프록시/로드밸런서(Nginx, Cloudflare, Vercel 등) 뒤에서 클라이언트 IP/보안 연결 정보를 신뢰하도록 설정.
 *    이는 아래 `secure` 쿠키 설정 판단에도 영향을 줍니다.
 *  - production 모드에서 sameSite/secure가 자동 강화됩니다(sameSite='none', secure=true).
 *    로컬 개발(development)에서는 sameSite='lax', secure=false로 동작하여 개발 편의성 유지.
 */

import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import routes from './routes';

import { env } from './utils/env';

const app = express();

/** 요청/응답 로그: 개발 편의를 위해 간단한 'dev' 포맷 사용 */
app.use(morgan('dev'));

/** JSON 본문 파싱: 클라이언트가 보낸 JSON 바디(req.body)를 읽을 수 있게 함 */
app.use(express.json());

/** 쿠키 파싱: 서명되지 않은 일반 쿠키를 req.cookies에 파싱 */
app.use(cookieParser());

/**
 * CORS 설정
 * - origin: 허용할 프론트엔드 도메인 (env.CORS_ORIGIN 사용)
 * - credentials: true → 브라우저가 쿠키(세션 쿠키 포함)를 자동으로 주고받을 수 있도록 허용
 *   ※ 프론트 fetch/axios에서도 반드시 `withCredentials: true` 설정 필요
 */
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

/**
 * 프록시 신뢰 설정
 * - 프록시/로드밸런서 뒤에 서버가 있는 경우(일반적인 배포 환경) true로 설정해야
 *   secure 쿠키 판단 및 클라이언트 IP 등의 정보가 올바르게 처리됩니다.
 * - 숫자 1은 "한 단계 프록시를 신뢰" 의미 (필요에 따라 조정 가능)
 */
app.set('trust proxy', 1);

/**
 * 세션(쿠키 기반) 설정
 * - name: 브라우저에 심을 쿠키 이름 (여기서는 'sid')
 * - secret: 세션 서명용 비밀키 (반드시 .env의 SESSION_SECRET 사용, 깃에 올리지 말 것)
 * - resave: 세션에 변경이 없으면 저장하지 않음(false) → 불필요한 쓰기 방지
 * - saveUninitialized: 초기화되지 않은 세션을 저장하지 않음(false) → 불필요한 빈 세션 방지
 * - cookie:
 *   - httpOnly: JS에서 쿠키 접근 불가(true) → XSS로부터 보호
 *   - sameSite:
 *       · production: 'none' → 크로스 도메인에서도 쿠키 전송(프론트/백엔드 도메인 분리 시 필요)
 *       · development: 'lax' → 로컬 개발 시 편의성
 *   - secure:
 *       · production: true → HTTPS에서만 쿠키 전송
 *       · development: false
 */
app.use(session({
  name: 'sid',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: env.NODE_ENV === 'production',
  },
}));

/**
 * 라우터 묶음
 * - `/health` : 상태 확인(헬스체크)
 * - `/auth`   : 로그인/로그아웃, /auth/me 등 인증 관련
 * - 추후 라우트가 늘어나도 `src/routes`에서만 추가하면 이곳은 그대로 사용 가능
 */

/**
 * 루트 경로 핸들러: 환영 메시지(JSON)로 200 응답
 * - 브라우저로 바로 접근했을 때도 유용한 안내 제공
 * - 운영/모니터링용 헬스체크는 /health 유지
 */
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Cloud7 Backend is running.',
    docs: '/docs (추후 Swagger 연결 시)',
    health: '/health',
  });
});

app.use(routes);

export default app;