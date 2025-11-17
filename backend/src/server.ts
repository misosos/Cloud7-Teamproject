// src/server.ts

/**
 * 서버 시작(bootstrap) 파일
 * ---------------------------------------------------------
 * 역할
 *  - Express로 구성된 앱(app)을 실제 포트에 바인딩해 실행합니다.
 *  - 실행/에러/종료와 같은 "프로세스 레벨" 제어를 담당합니다.
 *
 * 동작 개요
 *  1) `.env` 로드 → 환경변수 반영
 *  2) 포트(PORT) 결정 → 기본 3000
 *  3) `app.listen`으로 서버 시작
 *  4) 공통 서버 에러(EADDRINUSE, EACCES) 가독성 있는 로그 처리
 *  5) SIGINT/Ctrl+C, SIGTERM 수신 시 안전 종료
 *
 * 참고
 *  - app의 라우팅/미들웨어 세팅은 `src/app.ts`에서 수행합니다.
 *  - 환경변수 스키마/검증은 `src/utils/env.ts`에서 수행합니다.
 */

import 'dotenv/config';           // .env 파일을 자동으로 읽어 process.env에 주입
import app from './app';          // 미들웨어/라우팅이 모두 세팅된 Express 앱 인스턴스
import { env } from './utils/env';// 검증된 환경변수를 타입 안전하게 가져오기

// 실행 포트 결정: 우선순위는 ENV(PORT) → 없으면 3000
const port = Number(env.PORT) || 3000;

// 서버 시작: 지정한 포트로 리스닝을 시작하고 성공 로그 출력
const server = app.listen(port, () => {
  console.log(`✅ Backend running on http://localhost:${port}`);
});

// 공통 서버 에러 처리:
// - EADDRINUSE: 해당 포트가 이미 다른 프로세스에서 사용 중
// - EACCES: 해당 포트를 열 권한이 부족(특히 1024 미만의 포트는 관리자 권한 필요)
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use`);
  } else if (err.code === 'EACCES') {
    console.error(`❌ Need elevated privileges for port ${port}`);
  } else {
    console.error(err); // 그 외 에러는 원본 그대로 출력(초기 개발 단계에서는 디버깅에 유용)
  }
});

// 정상 종료 핸들링:
// - SIGINT: 로컬에서 Ctrl+C 입력 시 발생
// - SIGTERM: 배포 플랫폼(예: PM2, Docker, PaaS)에서 종료 신호를 보낼 때 발생
// → 열린 커넥션을 닫은 뒤 프로세스를 종료하여 깔끔하게 내려갑니다.
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

export default server; // 테스트나 다른 모듈에서 참조할 수 있도록 export