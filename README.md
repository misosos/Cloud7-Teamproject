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