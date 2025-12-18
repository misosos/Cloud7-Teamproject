/**********************************************************************************
 * Express 앱 전역 설정 파일 (app.ts)
 **********************************************************************************/

/* ==============================================================================
 *  1. 의존성/모듈 import
 * ============================================================================ */
import express, { type Request, type Response, type NextFunction } from "express";
import morgan from "morgan";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import routes from "./routes";
import tasteRecordsRouter from "./routes/tasteRecords.routes";
import uploadRouter from "./routes/upload.routes";
import { env } from "./utils/env";
import staysRouter from "./routes/stays.routes";
import locationRoutes from "./routes/location.routes";
import recommendationsRoutes from "./routes/recommendations.routes";
import tasteDashboardRoutes from "./routes/tasteDashboard.routes";

/* ==============================================================================
 *  2. Express 앱 인스턴스 생성
 * ============================================================================ */
const app = express();

/* ==============================================================================
 *  3. 공통 미들웨어 설정
 * ============================================================================ */
app.disable("x-powered-by");
app.use(morgan("dev"));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
  }),
);

app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use(cookieParser());

/* ==============================================================================
 *  4. CORS 설정
 * ============================================================================ */
const isProd = env.NODE_ENV === "production";

// env.CORS_ORIGIN: "http://localhost:5173,https://cloud7-taste.duckdns.org:17111"
const allowedOrigins = (env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedHostnames = new Set<string>();
for (const o of allowedOrigins) {
  try {
    allowedHostnames.add(new URL(o).hostname);
  } catch {
    // ignore invalid URL entries
  }
}

// ✅ 현재 배포 도메인(duckdns)에서 들어오는 요청은 포트 상관없이 허용
const DUCKDNS_HOST = "cloud7-taste.duckdns.org";

function isDuckdnsOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      u.hostname === DUCKDNS_HOST
    );
  } catch {
    return false;
  }
}

// ✅ 개발 편의: dev 환경에서는 localhost/127.0.0.1은 env에 없어도 항상 허용
function isLocalDevOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // curl/postman 등 비브라우저 요청은 Origin이 없을 수 있음 -> 허용
    if (!origin) return callback(null, true);

    // file:// 등에서 "null"로 들어올 수도 있는데, 보통 dev에서만 허용하는 게 안전
    if (!isProd && origin === "null") return callback(null, true);

    // 0) duckdns는 포트 무관 허용
    if (isDuckdnsOrigin(origin)) return callback(null, true);

    // 1) env에 정확히 등록된 origin이면 허용
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // 2) dev면 localhost/127 무조건 허용
    if (!isProd && isLocalDevOrigin(origin)) return callback(null, true);

    // 3) (선택) 같은 hostname이면 포트 달라도 허용 (env에 hostname만 한 번이라도 들어있을 때)
    try {
      const u = new URL(origin);
      if (allowedHostnames.has(u.hostname)) return callback(null, true);
    } catch {
      // ignore
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// ✅ 프리플라이트 안정화
app.options("*", cors(corsOptions));

/* ==============================================================================
 *  5. 프록시/로드밸런서 신뢰 설정
 * ============================================================================ */
app.set("trust proxy", 1);

/* ==============================================================================
 *  6. 세션(쿠키 기반) 설정
 * ============================================================================ */
app.use(
  session({
    name: "sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    // (선택) 프록시 환경에서 secure 쿠키 사용할 때 도움됨
    proxy: isProd,

    cookie: {
      httpOnly: true,

      // ✅ prod: 크로스 사이트도 고려해서 none/secure
      // ✅ dev : 로컬 편의 lax/false
      sameSite: isProd ? "none" : "lax",
      secure: isProd, // prod에서 HTTPS(또는 TLS termination)라면 true가 맞음

      // 필요하면 .env로 도메인 지정 가능
      // domain: env.COOKIE_DOMAIN ?? undefined,

      // maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

/* ==============================================================================
 *  7. 헬스체크
 * ============================================================================ */
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    message: "Cloud7 Backend is running.",
    docs: "/docs (추후 Swagger 연결 시)",
    health: "/api/health",
  });
});

/* ==============================================================================
 *  8. 라우터 등록
 * ============================================================================ */
app.use("/api/uploads", uploadRouter);
app.use("/api/taste-records", tasteRecordsRouter);
app.use("/api/stays", staysRouter);
app.use("/api/location", locationRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/taste-dashboard", tasteDashboardRoutes);
app.use("/api", routes);

/* ============================================================================
 *  8-1. 정적 프론트엔드 서빙
 * ========================================================================== */
const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientPath, "index.html"));
});

/* ==============================================================================
 *  9. 404 핸들러
 * ============================================================================ */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    error: "Not Found",
    path: req.path,
    method: req.method,
  });
});

/* ==============================================================================
 *  10. 전역 오류 핸들러
 * ============================================================================ */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  res.status(500).json({
    ok: false,
    error:
      env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Internal Server Error",
  });
});

export default app;