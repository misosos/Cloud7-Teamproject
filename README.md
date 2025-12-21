## Frontend 초기 설정
```bash
cd frontend
npm install

# 중요!! frontend 폴더 안에서 .env 파일 만들기 (.env.example 파일 내용 복붙)

# 개발 서버 실행
npm run dev

```
> **문제 해결:** `vite: command not found` 에러가 발생하면 아래를 한 번만 설치 후 다시 실행하세요.
>
> ```bash
> npm i -D vite @vitejs/plugin-react typescript
> npm i react react-dom
> npm run dev
> ```

## Backend 초기 설정 & Database & Session 설정

### 1) 의존성 설치 (backend)
```bash
cd backend
npm install

# 중요!! backend 폴더 안에서 .env 파일 만들기 (.env.example 파일 내용 복붙)

# Prisma & DB 클라이언트
npm i @prisma/client
npm i -D prisma

# 세션 & 쿠키
npm i express-session cookie-parser
npm i -D @types/express-session @types/cookie-parser

# CORS (프론트-백엔드 분리 개발 시 필요)
npm i cors
npm i -D @types/cors

#axios 설치
npm install axios

# (선택) 보안/로그/속도제한
npm i helmet morgan express-rate-limit
```

### 2) Prisma 준비 (SQLite)
```bash
# Prisma 클라이언트 생성
npx prisma generate

# 최초 스키마 적용(개발용) — 마이그레이션 생성 + 적용
npx prisma migrate dev --name init

# schema.prisma가 변경되었을때[팀원이 변경]
npx prisma db push
npx prisma generate

# db push / migrate 이후, 다른 브랜치에서 스키마 변경을 pull 했을 때
npx prisma generate

# 팀 동기화/배포 환경 — 기존 마이그레이션만 적용[내가 변경]
npx prisma migrate deploy
npx prisma generate

# (선택) 시드 데이터 투입
npx prisma db seed
```

## 테스트 (터미널 창 2개 띄우기)
```bash
# 1) 프론트엔드 개발 서버 실행 
cd frontend
npm run dev

# 2) 백엔드 개발 서버 실행
cd backend
npm run dev

```
