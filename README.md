## Frontend 초기 설정
```bash
# 1) 설치
cd frontend
npm install

# 2) 개발 서버 실행 
npm run dev
# http://localhost:5173 (Vite 기본 포트)

```
> **문제 해결:** `vite: command not found` 에러가 발생하면 아래를 한 번만 설치 후 다시 실행하세요.
>
> ```bash
> npm i -D vite @vitejs/plugin-react typescript
> npm i react react-dom
> npm run dev
> ```

## Backend 초기 설정
```bash
cd backend
npm install
# .env 파일 만들기 (.env.example 파일 내용 복붙)
npm run dev
# 서버가 뜨면: http://localhost:3000/health
```

### 자주 나는 이슈 & 해결
- **포트 점유**: `PORT` 변경하거나 기존 프로세스 종료 후 재시작.
- **CORS 타입 에러**: `npm i -D @types/cors`
- **ES 모듈 import 오류**: `tsconfig.json`에 `"esModuleInterop": true` 설정.
- **서버 접속 불가**: `npm run dev`가 실행 중인지 확인 → `curl /health`로 점검.


## Database & Session 설정

### 0) 환경변수 (.env)
**위치는 `backend/.env`**, 커밋 금지(대신 `backend/.env.example` 

### 1) 의존성 설치 (backend)
```bash
cd backend

# Prisma & DB 클라이언트
npm i @prisma/client
npm i -D prisma

# 세션 & 쿠키
npm i express-session cookie-parser
npm i -D @types/express-session @types/cookie-parser

# CORS (프론트-백엔드 분리 개발 시 필요)
npm i cors
npm i -D @types/cors

# (선택) 보안/로그/속도제한
npm i helmet morgan express-rate-limit
```

### 2) Prisma 준비
```bash
# Prisma 클라이언트 생성
npx prisma generate

# 최초 스키마 적용(개발용) — 마이그레이션 생성 + 적용
npx prisma migrate dev --name init

# 팀 동기화/배포 환경 — 기존 마이그레이션만 적용
npx prisma migrate deploy

# (선택) 시드 데이터 투입
npx prisma db seed
```

### 3) 로컬 DB (SQLite) 권장
- 로컬 개발은 빠른 시작을 위해 **SQLite** 사용(파일: `backend/prisma/dev.db`).
- `dev.db` 파일은 **.gitignore** 대상 → 개인 로컬에서만 유지.
- 깃에는 **`schema.prisma` / `migrations/**` / `seed.ts` / `.env.example`**만 포함.

### 4) 프로덕션(DB/세션) 전환 가이드 (요약)
- **AWS RDS(PostgreSQL) 예시:**
  ```dotenv
  DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public&amp;connection_limit=5"
  ```
- **세션 쿠키 프로덕션 설정 체크리스트**
  - `app.set('trust proxy', 1)` (로드밸런서/프록시 뒤에 둘 때)
  - `cookie: { secure: true, sameSite: 'lax', httpOnly: true }` (HTTPS 전제)
  - `SESSION_SECRET`는 반드시 환경변수로 주입
  - (선택) 외부 스토어 사용 고려: Redis(`connect-redis`) 또는 Prisma 세션 스토어

### 5) 자주 나는 이슈 & 빠른 점검
- **`P1001` DB 연결 불가**: `DATABASE_URL`/포트/보안그룹 확인 → 컨테이너 사용 시 `docker compose ps`.
- **마이그레이션 불일치**: `npx prisma migrate deploy`로 적용.
- **`req.session`가 undefined**: `express-session`/`cookie-parser` 미들웨어가 **라우터 등록 전에** 있는지 확인.
- **CORS 에러**: `CORS_ORIGIN` 값과 프론트 실제 도메인(포트 포함) 일치 확인.