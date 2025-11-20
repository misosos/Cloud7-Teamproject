/**********************************************************************************
 * Express 앱 전역 설정 파일 (app.ts)
 *
 * 역할
 *  - 공통 미들웨어(CORS, 로깅, JSON/FORM 파싱, 쿠키/세션, 보안/압축)를 한 곳에 모아 Express 앱 인스턴스를 생성합니다.
 *  - 실제 서버 시작(포트 바인딩)은 `src/server.ts`가 담당하고, 이 파일은 "앱 구성"만 담당합니다.
 *
 * 요청 처리 흐름(요약)
 *  1) 브라우저 → 서버 요청
 *  2) 아래 미들웨어들이 선언 순서대로 실행
 *     - `morgan`으로 요청 로깅
 *     - `helmet`으로 보안 헤더 설정
 *     - `compression`으로 응답 압축
 *     - `express.json()`/`express.urlencoded()`으로 본문 파싱
 *     - `cookie-parser`로 쿠키 읽기
 *     - `cors`로 프론트 도메인에서의 쿠키 포함 요청 허용
 *     - `express-session`으로 세션(쿠키) 복원 및 생성
 *  3) 마지막에 `/api` 경로로 분기되어 `/api/health`, `/api/auth` 등 개별 엔드포인트를 처리합니다.
 *
 * 환경변수(.env) 가이드
 *  - NODE_ENV            : 'development' | 'production'
 *  - PORT                : 서버 포트 (예: 3000) → 실제 사용은 server.ts에서
 *  - SESSION_SECRET      : 세션 서명용 비밀키(길고 복잡하게). 절대 깃에 올리지 마세요.
 *  - CORS_ORIGIN         : 허용할 프론트엔드 주소 (쉼표로 여러 개 가능)
 *                          예) http://localhost:5173, http://127.0.0.1:5173, https://your.domain
 *  - COOKIE_DOMAIN       : (선택) 프로덕션 쿠키 도메인. 예) your.domain
 *
 * 배포/보안 팁
 *  - `app.set('trust proxy', 1)` : 프록시/로드밸런서(Nginx, Cloudflare, Vercel 등) 뒤에서 클라이언트 IP/보안 연결 정보를 신뢰하도록 설정.
 *    이는 아래 `secure` 쿠키 설정 판단에도 영향을 줍니다.
 *  - production 모드에서 sameSite/secure가 자동 강화됩니다(sameSite='none', secure=true).
 *    로컬 개발(development)에서는 sameSite='lax', secure=false로 동작하여 개발 편의성 유지.
 *  - 현재 세션 스토어는 MemoryStore(기본값)입니다. 운영 환경에서는 Redis/Mongo 등 외부 스토어로 교체하세요.
 *    (예: connect-redis, connect-mongo 사용. 세션 유실 방지/수평 확장 대비)
 **********************************************************************************/

import express, { type Request, type Response, type NextFunction } from 'express'; // Express 서버 및 타입
import morgan from 'morgan'; // 요청/응답 로깅 미들웨어
import cors, { CorsOptions } from 'cors'; // 크로스 도메인 요청 허용(CORS)
import cookieParser from 'cookie-parser'; // 쿠키 파싱
import session from 'express-session'; // 세션(쿠키 기반) 미들웨어
import helmet from 'helmet'; // 보안 헤더 자동 설정
import compression from 'compression'; // 응답 압축
import routes from './routes'; // 라우터 묶음(/health, /auth, ...)
import tasteRecordsRouter from './routes/tasteRecords.routes'; // 취향 기록 라우터(/api/taste-records)
import { env } from './utils/env'; // 환경변수 로더/검증 유틸

const app = express(); // ✅ Express 앱 인스턴스 생성

/** 보안: X-Powered-By 헤더 제거 (스택 노출 방지) */
app.disable('x-powered-by');

/** 요청/응답 로그: 개발 편의를 위해 간단한 'dev' 포맷 사용 */
app.use(morgan('dev'));

/** 보안 헤더 기본값 적용 (필요 시 정책은 프로젝트에 맞게 조정) */
app.use(
  helmet({
    // cross-origin 리소스(CDN 이미지 등) 차단으로 문제가 나면 정책을 완화
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // 필요 시 CSP(Content Security Policy)도 명시적으로 관리 가능
    // contentSecurityPolicy: false,
  })
);

/** 응답 압축 (텍스트 중심 API에 유리) */
app.use(compression());

/** JSON/FORM 본문 파싱 */
app.use(express.json({ limit: '1mb' })); // 요청 본문 JSON 최대 1MB
app.use(express.urlencoded({ extended: true })); // 폼 URL-Encoded 파싱

/** 쿠키 파싱: 서명되지 않은 일반 쿠키를 req.cookies에 파싱 */
app.use(cookieParser());

/**
 * CORS 설정
 * - credentials: true → 브라우저가 쿠키(세션 쿠키 포함)를 자동으로 주고받을 수 있도록 허용
 * - origin: 함수로 화이트리스트 검증 (쉼표로 구분된 다중 오리진 지원)
 *   ※ 프론트 fetch/axios에서도 반드시 `withCredentials: true` 설정 필요
 */
const allowedOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean); // .env → 배열로 변환

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // 비브라우저(서버-서버/로컬 curl) 요청은 origin이 없을 수 있으므로 허용
    if (!origin) return callback(null, true);

    // 1) .env에 명시된 허용 오리진인지 확인
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // 2) localhost/127.0.0.1 개발 편의 허용(둘 다 .env에 넣는 것을 권장)
    if (origin.startsWith('http://localhost:') && allowedOrigins.some((o) => o.startsWith('http://localhost:'))) {
      return callback(null, true);
    }
    if (origin.startsWith('http://127.0.0.1:') && allowedOrigins.some((o) => o.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }

    // 3) 명시적으로 허용되지 않은 오리진 → 차단
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // 쿠키 포함 전송 허용
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // 허용 메서드
  allowedHeaders: ['Content-Type', 'Authorization'], // 허용 헤더
  optionsSuccessStatus: 204, // 사전 요청(OPTIONS) 성공 코드
};

app.use(cors(corsOptions));

/**
 * 프록시 신뢰 설정
 * - 프록시/로드밸런서 뒤에 서버가 있는 경우(일반적 배포) true로 설정해야
 *   secure 쿠키 판단 및 클라이언트 IP 등의 정보가 올바르게 처리됩니다.
 * - 숫자 1은 "한 단계 프록시를 신뢰" 의미 (필요에 따라 조정 가능)
 */
app.set('trust proxy', 1);

/**
 * 세션(쿠키 기반) 설정
 * - name: 브라우저에 심을 쿠키 이름 (여기서는 'sid')
 * - secret: 세션 서명용 비밀키 (반드시 .env의 SESSION_SECRET 사용, 깃에 올리지 말 것)
 * - resave: 세션에 변경이 없으면 저장하지 않음(false) → 불필요한 쓰기 방지
 * - saveUninitialized: 초기화되지 않은 세션을 저장하지 않음(false) → 빈 세션 방지
 * - cookie:
 *   - httpOnly: JS에서 쿠키 접근 불가(true) → XSS로부터 보호
 *   - sameSite:
 *       · production: 'none' → 크로스 도메인에서도 쿠키 전송(프론트/백엔드 도메인 분리 시 필요)
 *       · development: 'lax' → 로컬 개발 시 편의성
 *   - secure:
 *       · production: true → HTTPS에서만 쿠키 전송
 *       · development: false
 *   - domain:
 *       · (선택) 프로덕션에서 서브도메인 공유가 필요하면 COOKIE_DOMAIN 설정
 *
 * ⚠️ 운영 권장: 세션 스토어 외부화(예: Redis)
 *    import connectRedis from 'connect-redis'
 *    const RedisStore = connectRedis(session)
 *    app.use(session({ store: new RedisStore({ client: redisClient }), ... }))
 */
app.use(
  session({
    name: 'sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: env.NODE_ENV === 'production',
      // 운영 시 필요한 경우에만 도메인 설정(예: .your.domain)
      domain: env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN : undefined,
      // 필요 시 세션 만료 설정 (예: 7일)
      // maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

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

/**
 * 라우터 묶음
 * - `/api/health` : 상태 확인(헬스체크)
 * - `/api/auth`   : 로그인/로그아웃, /auth/me 등 인증 관련
 * - `/api/taste-records` : 취향 기록 관련 CRUD API
 * - 추후 라우트가 늘어나도 `src/routes`에서만 추가하면 이곳은 그대로 사용 가능
 *
 * 👉 모든 API 엔드포인트는 `/api` 프리픽스를 갖도록 통일합니다.
 */
// 취향 기록 관련 라우터는 /api/taste-records 경로에 직접 연결
app.use('/api/taste-records', tasteRecordsRouter);
// 그 외 공통 라우터는 /api 프리픽스로 묶어서 사용
app.use('/api', routes);

/** 404 핸들러: 정의되지 않은 라우트 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

/** 전역 오류 핸들러: 예기치 못한 서버 오류 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // 개발 중엔 콘솔에 전체 에러 출력(운영에서는 로깅 시스템으로 전송 권장: Winston/Pino + ELK 등)
  console.error(err);

  // 민감 정보 노출 방지: 클라이언트에는 일반화된 메시지만 전달
  res.status(500).json({
    ok: false,
    error: env.NODE_ENV === 'development' && err instanceof Error ? err.message : 'Internal Server Error',
  });
});

export default app;