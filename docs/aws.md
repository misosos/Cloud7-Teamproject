# Cloud7-Teamproject — AWS 배포/운영 **올인원 가이드**

프론트(React/Vite) + 백엔드(Express/Prisma) + 세션 쿠키 인증 구조를 **AWS** 환경으로 옮길 때 필요한 설정을 한 파일에 정리했습니다.  
**핵심만 요약하면** 환경변수 교체 → Prisma를 RDS로 전환 → CORS/세션 쿠키 옵션 정합 → 프론트·백 배포 순입니다.

---

## 🗺️ 권장 아키텍처(개요)

- **Frontend**: S3 정적 호스팅 + CloudFront(HTTPS/캐시)  
- **Backend**: EC2(+Nginx reverse proxy + PM2) _또는_ Elastic Beanstalk/ECS  
- **DB**: RDS (PostgreSQL 또는 MySQL)  
- **Session Store(권장)**: ElastiCache Redis (또는 PrismaSessionStore)  
- **도메인/HTTPS**: Route53 + ACM(CloudFront/ALB용 인증서)

---

## ✅ 빠른 체크리스트

- [ ] `prisma/schema.prisma` 의 `provider` 를 **postgresql/mysql** 로 전환  
- [ ] 운영용 `DATABASE_URL` 교체 (RDS 엔드포인트/포트/DB명/유저/패스워드)  
- [ ] 백엔드: `SESSION_SECRET`, `CORS_ORIGIN`, `HOST`, `PORT` 환경변수 설정  
- [ ] 프론트: `VITE_API_BASE_URL=https://api.your-domain.com`  
- [ ] Axios `withCredentials: true` 유지  
- [ ] Express: `app.set('trust proxy', 1)` + cookie `{ sameSite: 'none', secure: true }` (도메인 분리 시)  
- [ ] Nginx 리버스 프록시 설정, PM2로 백엔드 프로세스 관리  
- [ ] CloudFront/S3로 프론트 정적 배포, SPA 라우팅 404 → `/index.html` 리라이트  
- [ ] `npx prisma migrate deploy` 로 운영 DB 스키마 반영

---

## 1) 백엔드 환경변수

**예시: `.env.production`**

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=8080

# 보안
SESSION_SECRET=매우_길고_랜덤한_문자열
CORS_ORIGIN=https://app.your-domain.com

# RDS 연결 (PostgreSQL 예시)
DATABASE_URL=postgresql://USER:PASS@rds-endpoint.amazonaws.com:5432/DBNAME?sslmode=require
# (MySQL 사용 시)
# DATABASE_URL=mysql://USER:PASS@rds-endpoint.amazonaws.com:3306/DBNAME?sslaccept=strict

# (선택) 세션 스토어용 Redis
# REDIS_URL=redis://:PASS@elasticache-endpoint.amazonaws.com:6379
```

**환경 스키마 예시: `backend/src/utils/env.ts`**

```ts
import { z } from 'zod';

export const env = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().min(1),      // "https://app.example.com,https://admin.example.com"
  REDIS_URL: z.string().optional(),
}).parse(process.env);
```

> 운영/스테이징에서는 `.env` 파일 대신 **AWS 콘솔/CI**의 환경변수 기능 사용을 권장합니다.

---

## 2) Prisma → RDS 전환

**`prisma/schema.prisma`**

```prisma
datasource db {
  provider = "postgresql" // ← 로컬 sqlite 에서 교체 (또는 "mysql")
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**마이그레이션**

개발 중:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

운영(프로덕션) 배포:
```bash
npx prisma generate
npx prisma migrate deploy
```

**RDS 보안 포인트**

- 백엔드가 있는 **서브넷/보안그룹**에서만 RDS 인바운드 허용  
- 멀티 AZ/자동 백업 고려  
- CloudWatch 알람으로 커넥션/CPU/스토리지 모니터링

**PrismaClient 주의**

- 서버리스/핫리로드 환경에서 **중복 생성 방지**  
- 연결 오류 시 재시도/헬스체크 준비

---

## 3) 프론트 환경변수 & API 클라이언트

**`frontend/.env.production`**

```env
VITE_API_BASE_URL=https://api.your-domain.com
```

**`frontend/src/services/apiClient.ts`**

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // ← 세션 쿠키 전송 필수
});
```

**빌드 & 배포**

```bash
npm ci
npm run build
# /dist → S3 업로드 → CloudFront Invalidation
```

---

## 4) CORS / 세션 / 쿠키 설정 (Express)

**`backend/src/app.ts` 핵심**

```ts
import cors from 'cors';
import session from 'express-session';
import { env } from './utils/env';
import express from 'express';

const app = express();
const isProd = env.NODE_ENV === 'production';

// 프록시(CloudFront/ALB/Nginx) 뒤에 있을 때 필수
app.set('trust proxy', 1);

// 여러 도메인 허용 시 쉼표로 분리해 입력
const allowedOrigins = env.CORS_ORIGIN.split(',').map(s => s.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // 쿠키 포함 허용
}));

app.use(session({
  name: 'sid',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,                    // 운영(HTTPS)에서 필수
    sameSite: isProd ? 'none' : 'lax', // 도메인 분리 시 'none'
    maxAge: 1000 * 60 * 60 * 24 * 7,   // 7일
  },
  // 운영에서는 MemoryStore 지양 → Redis/PrismaSessionStore 권장
  // store: new RedisStore({ client: redis }),
}));
```

**시나리오별 요약**

| 시나리오 | 프론트 | 백엔드 | sameSite | secure | CORS origin | credentials |
|---|---|---|---|---|---|---|
| 동일 도메인 | app.example.com | app.example.com | lax | true | 불필요 | 불필요 |
| 서브도메인 | app.example.com | api.example.com | none | true | https://app.example.com | true |
| 완전 분리 | www.app.com | api.app.io | none | true | https://www.app.com | true |

> **중요**: `sameSite='none'` 에서는 반드시 `secure=true` (HTTPS 필요)

---

## 5) EC2 + Nginx + PM2 배포

**백엔드 빌드/실행**

```bash
cd backend
npm ci
npm run build
npx prisma migrate deploy
pm2 start dist/server.js --name cloud7-backend
pm2 save
pm2 startup   # 부팅 자동 시작
```

**Nginx 리버스 프록시** — `/etc/nginx/conf.d/api.conf`

```nginx
server {
  listen 80;
  server_name api.your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:8080;  # Express가 리슨하는 PORT
    proxy_http_version 1.1;

    proxy_set_header Host               $host;
    proxy_set_header X-Real-IP          $remote_addr;
    proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto  $scheme;
    proxy_set_header Upgrade            $http_upgrade;
    proxy_set_header Connection         "upgrade";
  }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**헬스체크 엔드포인트 예시**

```ts
// backend/src/routes/health.ts
import { Router } from 'express';
export const health = Router();

health.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});

// app.ts 에서: app.use(health);
```

- ALB Target Group 헬스체크로 `/healthz` 사용 권장

---

## 6) 프론트: S3 + CloudFront (SPA 라우팅)

- **S3**: 정적 호스팅 버킷 (공개 접근은 CloudFront를 통해서만)  
- **CloudFront**: S3를 오리진으로 연결, Route53 + ACM 인증서로 HTTPS 적용  
- **SPA 404 라우팅**: 에러 응답 → `/index.html` 로 리라이트(뷰 라우터 사용 시 필수)

---

## 7) 세션 스토어(권장)

- 개발/단일 인스턴스: MemoryStore 가능(디버그용)  
- 운영/스케일 아웃: **Redis(ElastiCache)** 또는 DB 기반 세션 스토어  
- PM2 재시작/롤링 중에도 세션 유지 가능

---

## 8) 배포 전 점검

- [ ] DB 마이그레이션: `npx prisma migrate deploy`  
- [ ] `CORS_ORIGIN` 정확한 도메인(쉼표로 다중)  
- [ ] 쿠키: `secure=true`, `sameSite='none'`(도메인 분리)  
- [ ] `app.set('trust proxy', 1)` 적용  
- [ ] 프론트 `VITE_API_BASE_URL` 일치  
- [ ] Nginx/보안그룹 포트 오픈(80/443, 백엔드 포트는 로컬만)  
- [ ] CloudFront Invalidation

---

## 9) 트러블슈팅

**로그인 성공인데 쿠키가 안 붙음**
- 프론트/백 도메인이 다른가? → `sameSite='none'`, `secure=true`
- CORS `origin` 가 정확한지(와일드카드 금지)
- Axios/Fetch에 `withCredentials: true` / `credentials: 'include'`
- 프록시 뒤에 있는가? → `app.set('trust proxy', 1)`

**세션이 자꾸 유실**
- MemoryStore 사용? → Redis/PrismaSessionStore 전환
- PM2 재시작/롤링 시 세션 휘발 방지

**4xx/5xx**
- Nginx `proxy_pass`/헤더 확인
- RDS 보안그룹/서브넷 접근 허용
- 환경변수 오탈자(`VITE_API_BASE_URL`, `CORS_ORIGIN`, `DATABASE_URL`)

**SPA 라우팅 404**
- CloudFront/S3 에러 응답 → `/index.html` 리라이트 규칙 적용

---

## 10) 운영 팁

- **모니터링**: PM2 logs/CloudWatch, RDS 지표 알람  
- **백업/롤백**: RDS 스냅샷, S3 버전닝, 배포시점 태그  
- **보안**: Secrets Manager/SSM Parameter Store로 비밀정보 관리, 최소 권한 보안그룹  
- **배포 자동화**: GitHub Actions → S3/CloudFront, EC2(SSH) or CodeDeploy

---