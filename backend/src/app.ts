/**********************************************************************************
 * Express 앱 전역 설정 파일 (app.ts)
 **********************************************************************************/

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import morgan from 'morgan';
import cors, { type CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';

import routes from './routes';
import tasteRecordsRouter from './routes/tasteRecords.routes';
import uploadRouter from './routes/upload.routes';
import placesRouter from './routes/places.routes';

import { env } from './utils/env';
const isProd = env.NODE_ENV === 'production';

const app = express();

// ======================= 공통 미들웨어 =========================

app.disable('x-powered-by');
app.use(morgan('dev'));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 업로드 정적 경로
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(cookieParser());


// ⭐⭐ [중요] 요청 로깅 – 요청이 아예 서버에 오는지 확인용
app.use((req, _res, next) => {
  console.log(
    `[REQ] ${req.method} ${req.path} | Origin=${req.headers.origin}`
  );
  next();
});


// ======================= CORS 설정 =========================

// ⭐⭐⭐ 개발 환경에서는 origin 전부 허용 (앱/웹 붙게 하기)
if (env.NODE_ENV !== 'production') {
  console.log('⚠ 개발 환경 – CORS 모든 Origin 허용 중');
  app.use(
    cors({
      origin: true,              // 어떤 origin이든 허용
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 204,
    })
  );
} else {
  // ⭐ 운영 환경 – 너의 기존 strict CORS 유지
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      const allowLocalhost = allowedOrigins.some((o) =>
        o.startsWith('http://localhost:')
      );
      const allow127 = allowedOrigins.some((o) =>
        o.startsWith('http://127.0.0.1:')
      );

      if (origin.startsWith('http://localhost:') && allowLocalhost)
        return callback(null, true);
      if (origin.startsWith('http://127.0.0.1:') && allow127)
        return callback(null, true);

      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
}

app.set('trust proxy', 1);

console.log('[APP] NODE_ENV =', env.NODE_ENV, 'isProd =', isProd);
// ======================= 세션 설정 =========================


app.use(
  session({
    name: 'sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
     httpOnly: true,
     sameSite: 'none',
     secure: false,
    },
  })
);

// ======================= 루트 경로 =========================

app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Cloud7 Backend is running.',
    docs: '/docs',
    health: '/health',
  });
});


// ======================= 라우터 등록 =========================

app.use('/api/uploads', uploadRouter);
app.use('/api/taste-records', tasteRecordsRouter);
app.use('/api/places', placesRouter);
app.use('/api', routes);


// ======================= 404 핸들러 =========================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});


// ======================= 전역 오류 처리 =========================

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({
      ok: false,
      error:
        env.NODE_ENV === 'development' && err instanceof Error
          ? err.message
          : 'Internal Server Error',
    });
  }
);

export default app;
