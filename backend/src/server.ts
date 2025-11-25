// src/server.ts
import 'dotenv/config'; // .env 로드
import app from './app';
import { env } from './utils/env';

// HOST 결정
const HOST = (process.env.HOST ?? 'localhost').trim();

// PORT 결정
const parsedPort = Number(env.PORT);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4000;

// 서버 시작
const server = app.listen(PORT, HOST, () => {
  const visibleHost = HOST === '0.0.0.0' ? 'localhost' : HOST;

  console.log(`==============================================`);
  console.log(` Server listening on http://${visibleHost}:${PORT}`);
  console.log(` (Backend running with process.env PORT=${env.PORT})`);
  console.log(`==============================================`);
});

// 서버 에러 핸들링
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else if (err.code === 'EACCES') {
    console.error(`❌ Need elevated privileges for port ${PORT}`);
  } else {
    console.error('❌ Server error:', err);
  }

  process.exitCode = 1;
});

// 안전 종료 함수
function shutdown(reason: string) {
  console.log(`🛑 Shutting down (${reason})`);
  try {
    server.close(() => process.exit(process.exitCode ?? 0));
  } catch (e) {
    console.error('❌ Error during shutdown:', e);
    process.exit(process.exitCode ?? 1);
  }
  setTimeout(() => process.exit(process.exitCode ?? 0), 5000);
}

// 전역 예외 처리
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
  shutdown('unhandledRejection');
});

export default server;
