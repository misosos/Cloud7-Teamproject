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

const app = express();

// ======================= 공통 미들웨어 =========================

app.disable('x-powered-by');
app.use(morgan('dev'));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 업로드 정적 경로
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(cookieParser());

// ======================= CORS 설정 =========================

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    const allowLocalhost = allowedOrigins.some((o) =>
      o.startsWith('http://localhost:'),
    );
    const allow127 = allowedOrigins.some((o) =>
      o.startsWith('http://127.0.0.1:'),
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

app.set('trust proxy', 1);

// ======================= 세션 설정 =========================

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
      domain:
        env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN
          ? process.env.COOKIE_DOMAIN
          : undefined,
    },
  }),
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

// 업로드 API
app.use('/api/uploads', uploadRouter);

// 취향 기록 API
app.use('/api/taste-records', tasteRecordsRouter);

// ⭐ 카카오맵 장소/경로 API  
//   → /api/places/search  
//   → /api/places/directions  
//   → /api/places/optimize 
app.use('/api/places', placesRouter);

// 기존 공통 API (/auth, /health 등)
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
  },
);

export default app;
