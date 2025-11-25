// services/auth.service.ts
// ============================================================
// 인증 서비스 (실사용): Prisma + bcryptjs 기반 사용자 저장/검증
// ------------------------------------------------------------
// - 인메모리 스토어를 제거하고 실제 DB(User 테이블) 사용
// - 비밀번호는 bcrypt 해시로 안전하게 저장/검증
// - 컨트롤러/미들웨어에서 재사용할 수 있는 "순수 서비스 로직"만 모아둠
// - 팀원이 빠르게 이해할 수 있도록 모든 설명은 한글로 적고,
//   구현 로직은 건드리지 않은 상태로 가독성만 개선합니다.
// ============================================================

import bcrypt from 'bcryptjs'; // 비밀번호를 안전하게 처리하기 위한 해시/검증 라이브러리
import { prisma } from '../lib/prisma'; // Prisma Client (DB ORM). `prisma.user` 등으로 테이블 접근

// ============================================================
// 프론트/외부로 내보낼 때 사용할 "안전한 사용자 타입" (비밀번호 해시 제거)
// ------------------------------------------------------------
// - 실제 DB(User 테이블)에는 passwordHash 필드가 포함되어 있지만,
//   API 응답, 세션 저장 등 외부로 나가는 객체에는 절대 포함되면 안 됩니다.
// - 따라서 SafeUser 타입에는 인증에 불필요한 민감 정보(비밀번호 해시)를 포함하지 않습니다.
// ============================================================
export type SafeUser = {
  id: number; // PK (정수)
  email: string; // 이메일(고유)
  name?: string | null; // 유저명 (nullable)
};

// ============================================================
// DB에서 조회되는 기본 사용자 모양 (비밀번호 해시 포함 가능)
// ------------------------------------------------------------
// - Prisma의 User 모델 전체를 이 파일에 끌어오기보다는,
//   여기서 필요한 필드만 "형태"로 정의해 사용합니다.
// - toSafeUser 변환 과정에서 passwordHash 등 민감 필드는 자동으로 제외됩니다.
// ============================================================
type DbUserShape = {
  id: number;
  email: string;
  name: string | null;
  // passwordHash는 Prisma에서 가져오지만, SafeUser 변환 시 제외합니다.
};

// ============================================================
// DB 사용자 → SafeUser 변환기
// ------------------------------------------------------------
// - 외부(컨트롤러, 라우터, 프론트 응답 등)에 노출할 때
//   비밀번호 관련 필드를 제거하여 안전한 형태로 만들어 줍니다.
// - SafeUser를 일관되게 사용하면, 실수로 passwordHash를 응답에 포함시키는 사고를 예방할 수 있습니다.
// ============================================================
function toSafeUser(u: DbUserShape): SafeUser {
  return { id: u.id, email: u.email, name: u.name };
}

// ============================================================
// 이메일로 유저 단건 조회 (원본 전체 레코드 반환)
// ------------------------------------------------------------
//   - 주의: passwordHash가 포함될 수 있으므로, 외부 응답으로 직접 사용 금지
//   - 사용 예시:
//     - 로그인 검증 시 비밀번호 해시 비교
//     - 중복 가입 여부 체크 (이미 가입한 이메일인지 확인)
//   - 이 함수는 "서비스 내부에서만" 사용하는 것을 권장합니다.
// ============================================================
export async function findUserByEmail(email: string) {
  const key = email.trim().toLowerCase(); // 이메일 표준화(공백 제거 + 소문자)
  return prisma.user.findUnique({ where: { email: key } });
}

// ============================================================
// ID로 유저 조회 후 SafeUser로 변환하여 반환
// ------------------------------------------------------------
//   - 프로필 조회 같은 API에서 안전하게 사용 가능
//   - passwordHash 같은 민감 필드는 노출되지 않도록 toSafeUser를 거칩니다.
// ============================================================
export async function findUserByIdSafe(id: number): Promise<SafeUser | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? toSafeUser(u) : null;
}

// ============================================================
// 회원가입 로직
// ------------------------------------------------------------
//   1) 이메일 중복 체크 (DB에서 고유성 보장)
//   2) 비밀번호 bcrypt 해시 생성
//   3) User 레코드 생성 (passwordHash 저장)
//   4) SafeUser로 변환하여 반환
//
//   - 오류 케이스:
//     - 이미 존재하는 이메일인 경우 Error('EMAIL_ALREADY_EXISTS') throw
//       → 컨트롤러에서 409 Conflict 등으로 매핑해서 응답 처리
// ============================================================
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<SafeUser> {
  const key = email.trim().toLowerCase();

  // 1) 중복 이메일 방지
  const exists = await prisma.user.findUnique({ where: { email: key } });
  if (exists) {
    // 컨트롤러에서 409 Conflict로 매핑하여 응답
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  // 2) 비밀번호 해시 (saltRounds=12 권장)
  const passwordHash = await bcrypt.hash(password, 12);

  // 3) 사용자 생성 (DB에는 passwordHash만 저장, 원문 password 저장 금지)
  const user = await prisma.user.create({
    data: { email: key, name: name ?? null, passwordHash },
  });

  // 4) 외부로 안전한 형태 반환
  return toSafeUser(user as DbUserShape);
}

// ============================================================
// 로그인 검증 로직
// ------------------------------------------------------------
//   - 입력된 이메일/비밀번호가 유효하면 SafeUser 반환, 아니면 null
//   - 흐름:
//     1) 이메일로 유저 조회
//     2) bcrypt.compare로 비밀번호 검증
//     3) 성공 → SafeUser 반환, 실패 → null 반환
//
//   - 이 함수는 "존재 여부 + 비밀번호 일치 여부"만 판단하고,
//     실제 세션/토큰 설정은 컨트롤러/미들웨어에서 처리합니다.
// ============================================================
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<SafeUser | null> {
  const key = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: key } });
  if (!user) return null; // 존재하지 않는 이메일

  const ok = await bcrypt.compare(password, (user as any).passwordHash);
  if (!ok) return null; // 비밀번호 불일치

  return toSafeUser(user as DbUserShape);
}

// ============================================================
// 호환용 별칭 (기존 코드에서 verifyCredentials/verifyDemoUser 명칭을 사용했을 경우)
// ------------------------------------------------------------
//   - 기존 레거시 코드가 `verifyCredentials` 또는 `verifyDemoUser`를 사용하더라도,
//     내부적으로는 모두 `verifyUserCredentials` 로 합쳐서 동작하도록 맞춥니다.
//   - 중복 정의를 피하기 위해 여기서 1회만 정의해 두었습니다.
// ============================================================
export const verifyCredentials = verifyUserCredentials;
export function verifyDemoUser(email: string, password: string) {
  // 실제로는 동일한 검증 로직을 호출
  return verifyUserCredentials(email, password);
}

// ============================================================
// 개발 편의용 데모 계정 시드 함수
// ------------------------------------------------------------
//   - 로컬 개발에서 테스트 계정이 없으면 자동으로 하나 생성해 줍니다.
//   - 운영 배포 시에는 이 함수를 자동 실행하지 않도록 주의해야 합니다.
//     (예: dev 전용 seed 스크립트에서만 호출하는 것이 안전)
// ------------------------------------------------------------
//   사용 예시:
//
//   // dev 환경 부팅 시
//   await seedDemoUser({
//     email: 'dev@example.com',
//     name: '개발용 계정',
//     password: '1234',
//   });
// ============================================================
export async function seedDemoUser(
  opts: { email?: string; name?: string; password?: string } = {}
) {
  const email = (opts.email ?? 'test@example.com').toLowerCase();
  const name = opts.name ?? '테스트';
  const password = opts.password ?? '1234';

  const existing = await findUserByEmail(email);
  if (!existing) {
    await createUser(email, password, name);
  }
}