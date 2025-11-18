// services/auth.service.ts
// ------------------------------------------------------------
// ✅ 인증 서비스 (실사용): Prisma + bcryptjs 기반 사용자 저장/검증
// - 인메모리 스토어를 제거하고 실제 DB(User 테이블) 사용
// - 비밀번호는 bcrypt 해시로 안전하게 저장/검증
// - 모든 주석은 팀원이 빠르게 이해할 수 있도록 한글로 상세히 작성
// ------------------------------------------------------------

import bcrypt from 'bcryptjs'; // 비밀번호를 안전하게 처리하기 위한 해시/검증 라이브러리
import { prisma } from '../lib/prisma'; // Prisma Client (DB ORM). `prisma.user` 등으로 테이블 접근

// ------------------------------------------------------------
// 🔹 프론트/외부로 내보낼 때 사용할 안전한 사용자 타입 (비밀번호 해시 제거)
// - 실제 DB에는 passwordHash 필드가 있지만, 외부 응답에는 절대 포함되면 안 됨
// ------------------------------------------------------------
export type SafeUser = {
  id: number; // PK (정수)
  email: string; // 이메일(고유)
  name?: string | null; // 유저명 (nullable)
};

// ------------------------------------------------------------
// 🔹 DB에서 조회되는 기본 사용자 모양(비밀번호 해시 포함 가능)
//   - Prisma의 `User` 모델을 전부 명시하지 않고, 여기서 필요한 필드만 정의해 사용
// ------------------------------------------------------------
type DbUserShape = {
  id: number;
  email: string;
  name: string | null;
  // passwordHash는 Prisma에서 가져오지만, SafeUser 변환 시 제외합니다.
};

// ------------------------------------------------------------
// 🔹 DB 사용자 → SafeUser 변환기
//   - 외부로 내보낼 때 비밀번호 관련 필드를 제거하여 안전한 형태로 만듦
// ------------------------------------------------------------
function toSafeUser(u: DbUserShape): SafeUser {
  return { id: u.id, email: u.email, name: u.name };
}

// ------------------------------------------------------------
// 🔹 이메일로 유저 단건 조회 (원본 전체 레코드 반환)
//   - 주의: passwordHash가 포함될 수 있으므로, 외부 응답으로 직접 사용 금지
//   - 사용처: 로그인 검증, 중복 체크 등 내부 로직에서만 사용
// ------------------------------------------------------------
export async function findUserByEmail(email: string) {
  const key = email.trim().toLowerCase(); // 이메일 표준화(공백 제거 + 소문자)
  return prisma.user.findUnique({ where: { email: key } });
}

// ------------------------------------------------------------
// 🔹 ID로 유저 조회 후 SafeUser로 변환하여 반환
//   - 프로필 조회 같은 API에서 안전하게 사용 가능
// ------------------------------------------------------------
export async function findUserByIdSafe(id: number): Promise<SafeUser | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? toSafeUser(u) : null;
}

// ------------------------------------------------------------
// 🔹 회원가입 로직
//   1) 이메일 중복 체크(고유 보장)
//   2) 비밀번호 bcrypt 해시 생성
//   3) User 레코드 생성 (passwordHash 저장)
//   4) SafeUser로 변환하여 반환
//   - 오류: 이미 존재하는 이메일인 경우 'EMAIL_ALREADY_EXISTS' throw
// ------------------------------------------------------------
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
  return toSafeUser(user);
}

// ------------------------------------------------------------
// 🔹 로그인 검증 로직
//   - 입력된 이메일/비밀번호가 유효하면 SafeUser 반환, 아니면 null
//   - 흐름: 이메일로 유저 조회 → bcrypt.compare로 비밀번호 검증
// ------------------------------------------------------------
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<SafeUser | null> {
  const key = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: key } });
  if (!user) return null; // 존재하지 않는 이메일

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null; // 비밀번호 불일치

  return toSafeUser(user);
}

// ------------------------------------------------------------
// 🔹 호환용 별칭 (기존 코드에서 verifyCredentials/verifyDemoUser 명칭을 사용했을 경우)
//   - 중복 정의를 피하기 위해 여기서 1회만 정의
// ------------------------------------------------------------
export const verifyCredentials = verifyUserCredentials;
export function verifyDemoUser(email: string, password: string) {
  // 실제로는 동일한 검증 로직을 호출
  return verifyUserCredentials(email, password);
}

// ------------------------------------------------------------
// 🔹 개발 편의용 데모 계정 시드
//   - 로컬 개발에서 테스트 계정이 없으면 만들어줌
//   - 운영 배포 시 자동 실행하지 않도록 주의 (seed 호출 위치를 dev 전용 스크립트로 분리 권장)
// ------------------------------------------------------------
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