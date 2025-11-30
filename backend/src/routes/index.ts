// ==============================================
// 라우트 집결지 (Routes Hub) — src/routes/index.ts
// ==============================================
//
// 이 파일은 **하위 라우터들을 한 곳에 모아서** 앱에 연결해 주는 “허브” 역할을 합니다.
//
// 예시 흐름:
//   - 이 파일에서:
//       router.use('/auth', auth);
//       router.use('/health', health);
//
//   - app.ts에서:
//       app.use('/api', routes);
//
//   → 실제 최종 경로는 아래와 같이 됩니다.
//       GET /api/auth/me
//       POST /api/auth/login
//       GET /api/health
//
// 즉, 이 파일은 **"/auth", "/health" 같은 1차 경로를 관리**하고,
// app.ts는 그 위에 "/api" 같은 **공통 prefix를 한 번만 씌우는 곳**이라고 보면 됩니다.
//
// 새 기능(도메인)을 추가하고 싶을 때의 패턴:
//   1) src/routes/tasteRecords.routes.ts 라우터 파일 생성
//   2) 여기에서 import & router.use 로 장착
//   3) app.ts 에서는 그대로 `app.use('/api', routes)`만 유지
//
// 이렇게 하면 **라우팅 구조를 한눈에 파악할 수 있고**, 기능별로 파일이 분리되어 관리가 쉽습니다.

import { Router } from 'express';
import guildRouter from './guild.routes';

// ==============================================
// 도메인(기능)별 하위 라우터 모음
// ==============================================
//
// - auth   : 로그인/회원가입/로그아웃 등 "인증" 관련 엔드포인트
// - health : 서버 살아 있음(Health Check) 확인용 엔드포인트
// - tasteRecordsRouter : 취향 기록(Taste Record) 관련 엔드포인트 (라우트 정의는 별도 파일)
//
// 각 라우터 파일 내부에서:
//   - router.get('/me', ...)
//   - router.post('/login', ...)
// 등 **자신의 하위 경로만** 관리하고,
// 여기에서 `/auth`, `/health` 같은 1단계 prefix를 붙여줍니다.
import auth from './auth.routes';
import health from './health.routes';
import tasteRecordsRouter from './tasteRecords.routes';

// ==============================================
// 상위 라우터 생성
// ==============================================
//
// Express의 Router 인스턴스를 하나 만들고,
// 여기에 각 도메인별 라우터를 "장착(mount)"해서
// 하나의 큰 라우터로 합칩니다.
const router = Router();

// ==============================================
// 하위 라우터 연결 (Mounting)
// ==============================================

// '/auth/*' 로 들어오는 모든 요청을 auth 라우터가 처리하도록 연결
//
// 예)
//   - auth.routes.ts 에서 router.get('/me', ...) 이라면
//   - 실제 전체 경로는 GET /auth/me 가 됩니다.
//
// app.ts 에서 다시 `app.use('/api', routes)`로 감싸면:
//   - 최종 경로: GET /api/auth/me
router.use('/auth', auth);

// '/health/*' 로 들어오는 모든 요청을 health 라우터가 처리하도록 연결
//
// 예)
//   - health.routes.ts 에서 router.get('/', ...) 이라면
//   - 실제 전체 경로는 GET /health 가 됩니다.
//
// app.ts 에서 '/api' prefix를 붙이면:
//   - 최종 경로: GET /api/health
router.use('/health', health);

// 참고: tasteRecordsRouter 는 현재 import 만 되어 있고,
//          이 파일에서는 아직 사용하지 않습니다.
//          (팀에서 라우트 추가 시 아래와 같이 장착할 수 있습니다.)
//
//   예시)
//     router.use('/taste-records', tasteRecordsRouter);
//
//   → app.ts 의 `app.use('/api', routes)` 와 조합하면
//     최종 경로: /api/taste-records/*

// ==============================================
// 상위 라우터 export
// ==============================================
//
// app.ts (또는 서버 엔트리)에서 다음과 같이 사용합니다.
//
//   import routes from './routes';
//
//   // 공통 prefix '/api' 아래에 모든 라우트를 마운트
//   app.use('/api', routes);
//
// 이렇게 하면 이 파일에서 정의한:
//   - /auth/*, /health/*, (추후) /taste-records/*
// 들이 모두 '/api' 접두사를 공유하게 됩니다.

router.use('/guilds', guildRouter);


export default router;