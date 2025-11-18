/**
 * 무엇을 하는 파일인가?
 * ------------------------------------------------------------------
 * - 향후 Prisma Client(ORM) 인스턴스를 '한 곳'에서 생성/공유하기 위한 파일입니다.
 * - 지금은 Prisma를 설치하지 않았기 때문에, 컴파일에 영향이 없도록
 *   전체를 주석으로 남긴 "가이드/설명서" 상태로 보관합니다.
 *
 * 왜 한 곳에서 관리하나요?
 * ------------------------------------------------------------------
 * - 개발 중(ts-node-dev 등 핫리로드) 매 요청마다 PrismaClient를 새로 만들면
 *   DB 커넥션이 과도하게 늘어납니다(메모리/커넥션 누수).
 * - 싱글톤 패턴으로 1개 인스턴스만 생성해 전역 재사용하는 것이 안전합니다.
 *
 * 프론트/백엔드 인증 흐름과 어떤 관계?
 * ------------------------------------------------------------------
 * - 우리는 "세션 쿠키 인증"을 사용할 예정이고,
 *   로그인/회원 조회/권한 체크 등에서 DB 접근이 필요합니다.
 * - 컨트롤러/서비스에서 DB가 필요할 때마다 `import { prisma } from '@/db/prisma'`
 *   형태로 불러 써야, 코드가 흩어지지 않고 테스트도 쉬워집니다.
 *
 * 나중에 실제로 활성화하려면(설치/초기화 순서)
 * ------------------------------------------------------------------
 * 1) 패키지 설치
 *    npm i -D prisma
 *    npm i @prisma/client
 *
 * 2) 초기화(데이터소스는 프로젝트에 맞게 선택)
 *    npx prisma init --datasource-provider postgresql
 *    # 또는 mysql/sqlite 등
 *
 * 3) .env에 DB 연결 문자열(DATABASE_URL) 설정
 *    예) DATABASE_URL="postgresql://user:pass@localhost:5432/mydb?schema=public"
 *
 * 4) 클라이언트 생성
 *    npx prisma generate
 *
 * 5) 모델 정의 후 마이그레이션(선택)
 *    # schema.prisma에 모델(User, Session 등) 추가
 *    npx prisma migrate dev --name init
 *
 * 6) 이제 아래 예시 코드를 '주석 해제'하여 실제 Prisma를 사용하세요.
 *
 * 실제 구현 예시(나중에 주석 해제해서 사용)
 * ------------------------------------------------------------------
 * // import { PrismaClient } from '@prisma/client';
 *
 * // // 개발 환경에서 핫리로드 시에도 1개만 유지하기 위한 전역 캐시
 * // const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
 *
 * // export const prisma =
 * //   globalForPrisma.prisma ??
 * //   new PrismaClient({
 * //     log: ['query', 'info', 'warn', 'error'], // 개발 중엔 로그를 켜두면 디버깅에 유용
 * //   });
 *
 * // if (process.env.NODE_ENV !== 'production') {
 * //   globalForPrisma.prisma = prisma;
 * // }
 *
 * // // 프로세스 종료 시 커넥션 정리(선택)
 * // process.on('SIGINT', async () => {
 * //   await prisma.$disconnect();
 * //   process.exit(0);
 * // });
 * //
 * // process.on('SIGTERM', async () => {
 * //   await prisma.$disconnect();
 * //   process.exit(0);
 * // });
 * //
 * // export default prisma;
 *
 * 사용 예시(컨트롤러/서비스)
 * ------------------------------------------------------------------
 * // import { prisma } from '@/db/prisma';
 * //
 * // // 사용자 생성
 * // await prisma.user.create({
 * //   data: { email, passwordHash },
 * // });
 * //
 * // // 사용자 조회
 * // const user = await prisma.user.findUnique({
 * //   where: { email },
 * // });
 * //
 * // // 트랜잭션 예시
 * // await prisma.$transaction(async (tx) => {
 * //   await tx.user.update({ ... });
 * //   await tx.auditLog.create({ ... });
 * // });
 *
 * 주의 사항 & 팁
 * ------------------------------------------------------------------
 * - PrismaClient를 매 요청마다 new 하지 마세요(싱글톤 유지).
 * - 로그는 개발에서만 상세하게, 운영에서는 최소화하세요.
 * - 세션을 DB에 저장하고 싶다면, 추후 Prisma 기반 세션 스토어를 도입할 수 있습니다.
 *   (예: prisma-session-store 등. 지금은 파일 범위를 넘어가므로 나중에 논의)
 *
 * 정리
 * ------------------------------------------------------------------
 * - 이 파일은 "DB 접근의 단일 진입점"입니다.
 * - 지금은 주석 가이드 상태로 커밋 → 이후 Prisma 도입 시 주석 해제만 하면 됩니다.
 */