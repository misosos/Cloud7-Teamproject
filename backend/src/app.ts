/**********************************************************************************
 * Express 앱 전역 설정 파일 (app.ts)
 * - production 세션 MemoryStore 경고 해결: Redis/Valkey 기반 connect-redis 적용
 * - HTTP/HTTPS 혼재 환경 대응: env.HTTPS로 secure/sameSite 제어 유지
 **********************************************************************************/

import express, { type Request, type Response, type NextFunction } from "express";
import morgan from "morgan";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import helmet from "helmet";
import compression from "compression";
import path from "path";

// session store
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

import routes from "./routes";
import tasteRecordsRouter from "./routes/tasteRecords.routes";
import uploadRouter from "./routes/upload.routes";
import { env } from "./utils/env";
import staysRouter from "./routes/stays.routes";
import locationRoutes from "./routes/location.routes";
import recommendationsRoutes from "./routes/recommendations.routes";
import tasteDashboardRoutes from "./routes/tasteDashboard.routes";

const app = express();

/* ==============================================================================
 *  3. 공통 미들웨어
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
 *  4. CORS
 * ============================================================================ */
const isProd = env.NODE_ENV === "production";

//  "production"이어도 HTTP일 수 있음
// => secure(true)면 브라우저가 쿠키를 버려서 로그인 유지가 깨짐
const isHttps = String(env.HTTPS).toLowerCase() === "true"; // .env에 HTTPS=true면 https로 간주

const allowedOrigins = (env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedHostnames = new Set<string>();
for (const o of allowedOrigins) {
  try {
    allowedHostnames.add(new URL(o).hostname);
  } catch {
    // ignore
  }
}

const DUCKDNS_HOST = "cloud7-taste.duckdns.org";
function isDuckdnsOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname === DUCKDNS_HOST;
  } catch {
    return false;
  }
}

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
    if (!origin) return callback(null, true);
    if (!isProd && origin === "null") return callback(null, true);

    if (isDuckdnsOrigin(origin)) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!isProd && isLocalDevOrigin(origin)) return callback(null, true);

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

app.options(/.*/, cors(corsOptions));

/* ==============================================================================
 *  5. trust proxy
 * ============================================================================ */
app.set("trust proxy", 1);

/* ==============================================================================
 *  6. session (Redis/Valkey store)
 * ============================================================================ */

const REDIS_URL = process.env.REDIS_URL; 
const useRedis = Boolean(REDIS_URL);     // 있을 때만 Redis 사용

let redisClient: ReturnType<typeof createClient> | null = null;
let redisStore: RedisStore | undefined;

if (useRedis) {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on("error", (err) => console.error("[redis] error:", err));
  redisClient.connect().catch((err) => {
    console.error("[redis] connect error:", err);
  });

  redisStore = new RedisStore({ client: redisClient });
}

app.use(
  session({
    name: "sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    proxy: isProd,
    store: redisStore, //  없으면 MemoryStore(기본)로 동작

    cookie: {
      httpOnly: true,
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps,
    },
  }),
);

/* ==============================================================================
 *  7. health
 * ============================================================================ */
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    message: "Cloud7 Backend is running.",
    docs: "/docs (추후 Swagger 연결 시)",
    health: "/api/health",
  });
});

/* ==============================================================================
 *  8. routes
 * ============================================================================ */
app.use("/api/uploads", uploadRouter);
app.use("/api/taste-records", tasteRecordsRouter);
app.use("/api/stays", staysRouter);
app.use("/api/location", locationRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/taste-dashboard", tasteDashboardRoutes);
app.use("/api", routes);

/* ==============================================================================
 *  8-1. static client
 * ============================================================================ */
const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientPath, "index.html"));
});

/* ==============================================================================
 *  9. 404
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
 *  10. error handler
 * ============================================================================ */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    error: env.NODE_ENV === "development" && err instanceof Error ? err.message : "Internal Server Error",
  });
});

export default app;