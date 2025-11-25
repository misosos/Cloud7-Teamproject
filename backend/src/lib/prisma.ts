/**
 * Prisma 클라이언트 초기화 유틸 (Node/Express 공용)
 * -------------------------------------------------
 * ❑ 이 파일의 역할
 *   - @prisma/client(ORM)의 PrismaClient 인스턴스를 만들고 재사용합니다.
 *   - ts-node-dev / Vite / Next.js 같은 핫리로드 환경에서
 *     PrismaClient가 매 변경마다 새로 생성되어 DB 커넥션이 폭증하는 문제를 방지합니다.
 *
 * ❑ 환경변수 / DB 연결
 *   - Prisma는 기본적으로 `.env`의 `DATABASE_URL`을 사용합니다.
 *     예) SQLite 로컬 개발
 *       DATABASE_URL="file:./prisma/dev.db"
 *
 *   - AWS RDS(PostgreSQL/MySQL 등)로 전환 시, `.env`의 `DATABASE_URL`만 교체하면 됩니다.
 *     예) PostgreSQL (RDS)
 *       DATABASE_URL="postgresql://<USER>:<PASSWORD>@<RDS-ENDPOINT>:5432/<DBNAME>?schema=public"
 *     예) MySQL (RDS)
 *       DATABASE_URL="mysql://<USER>:<PASSWORD>@<RDS-ENDPOINT>:3306/<DBNAME>"
 *     → 스키마에 맞춰 `prisma/schema.prisma`의 `datasource db { provider = "postgresql" | "mysql" | "sqlite" }`도 함께 조정하세요.
 *
 * ❑ 최초 세팅/스키마 반영
 *   # 클라이언트 생성
 *   npx prisma generate --schema=./prisma/schema.prisma
 *   # 스키마를 DB에 반영 (개발용)
 *   npx prisma db push --schema=./prisma/schema.prisma
 *   # (마이그레이션 사용 시)
 *   npx prisma migrate dev --name init --schema=./prisma/schema.prisma
 *
 * ❑ 주의사항
 *   - 핫리로드 도중 PrismaClient가 매번 new 되면 "Too many connections" 오류가 날 수 있습니다.
 *     → 아래의 전역 캐시(globalThis)를 통해 동일 프로세스 내에서는 하나만 유지합니다.
 *   - production 환경에서는 프로세스당 1개 생성이므로 전역 캐시에 보관하지 않습니다.
 *   - 서버 종료 시 커넥션을 정리하기 위해 beforeExit 훅을 등록합니다(중복 등록 방지 처리 포함).
 */

import { PrismaClient } from '@prisma/client';

// 전역 캐시 타입: Node의 globalThis에 prisma를 한 번만 걸어두기 위한 얕은 타입 단언
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// prisma 인스턴스: 이미 전역에 있으면 재사용, 없으면 새로 생성
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 로그 레벨: 개발 시 필요에 따라 'query' | 'info'를 추가하면 SQL/정보 로그를 볼 수 있습니다.
    // 과한 로그는 콘솔이 지저분해질 수 있어 기본은 'warn', 'error'만 사용합니다.
    log: ['warn', 'error'],
  });

// 개발 환경에서는 전역에 보관 (핫리로드로 모듈 재평가 시 동일 인스턴스를 재사용)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// (선택) 프로세스 종료 시 커넥션 정리
// - 핫리로드 환경에서 이벤트 리스너가 중복 등록되지 않도록
//   "최초 생성 시(전역에 아직 없음)"에만 등록합니다.
if (!globalForPrisma.prisma) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;