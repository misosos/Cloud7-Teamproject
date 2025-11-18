// src/services/auth.ts
// ---------------------------------------------------------
// 백엔드 인증 API 래퍼 (팀원용 쉬운 주석 버전)
// - 모든 함수는 프론트에서 쓰기 쉬운 형태로 user만 반환합니다.
// - /auth/me 는 로그인하지 않았을 때 401이 날 수 있으므로
//   여기서는 *예외를 던지지 않고* null을 반환해 UI 루프를 막습니다.
// - 서버 라우트와 일치하도록 회원가입 엔드포인트를 /auth/register 로 사용합니다.
// - 백엔드에서 name/role 이 null 로 올 수 있어 타입을 넓혔습니다.
// - 에러 핸들링을 공통화하고 400/401/409/422 를 사람이 읽기 쉬운 메시지로 변경합니다.
// ---------------------------------------------------------

import { httpGet, httpPost } from "./apiClient";

// 백엔드가 돌려주는 유저 정보 형태 (백엔드 SafeUser 와 호환)
// - id 는 number 일 수 있어 유연하게 수용
// - name/role 은 null 로 올 수 있어 넓은 타입으로 선언
export type User = {
  id: string | number;
  email: string;
  name: string | null;
  role: string | null;
};

// 공통 성공 응답 래퍼: { ok: true, ...payload }
export type ApiOk<T> = { ok: true } & T;

// 이메일 표준화(트림 + 소문자)
const toEmailKey = (email: string) => email.trim().toLowerCase();

// 다양한 클라이언트(fetch/axios/커스텀)에 대응한 상태코드 추출
const getStatus = (err: any): number | undefined => err?.status ?? err?.response?.status;

// 401 여부 유연 판단
function isUnauthorized(err: unknown) {
  const anyErr = err as any;
  const status = getStatus(anyErr);
  return (
    status === 401 ||
    anyErr?.code === "UNAUTHORIZED" ||
    (typeof anyErr?.message === "string" && anyErr.message.includes("401"))
  );
}

// 에러 메시지 사용자 친화적으로 변환해 던지기
function normalizeAndThrow(err: unknown): never {
  const anyErr = err as any;
  const status = getStatus(anyErr);
  const msg =
    anyErr?.message ??
    anyErr?.response?.data?.message ??
    anyErr?.response?.data?.error;

  if (status === 409) {
    const e = new Error(msg || "이미 가입된 이메일입니다.");
    (e as any).code = "CONFLICT";
    (e as any).status = 409;
    throw e;
  }
  if (status === 422) {
    const e = new Error(msg || "입력값을 다시 확인해주세요.");
    (e as any).code = "VALIDATION";
    (e as any).status = 422;
    throw e;
  }
  if (status === 400) {
    const e = new Error(msg || "요청 형식이 올바르지 않습니다.");
    (e as any).code = "BAD_REQUEST";
    (e as any).status = 400;
    throw e;
  }
  if (status === 401) {
    const e = new Error(msg || "이메일 또는 비밀번호가 올바르지 않습니다.");
    (e as any).code = "UNAUTHORIZED";
    (e as any).status = 401;
    throw e;
  }
  throw anyErr;
}

/**
 * 현재 로그인한 사용자 조회
 * - 세션이 없으면 401(Unauthorized)이 떨어질 수 있음
 * - 여기서는 예외를 던지지 않고 `null`을 반환 -> 초기 렌더 무한루프 방지
 */
export async function me(): Promise<User | null> {
  try {
    const res = await httpGet<ApiOk<{ user: User }>>("/auth/me");
    return res.user;
  } catch (err) {
    if (isUnauthorized(err)) return null;
    // 권한 없음(403)도 로그인 안된 상태로 취급
    if (getStatus(err) === 403) return null;
    throw err; // 그 외 에러는 상위에서 처리
  }
}

/**
 * 로그인
 * - 성공 시 서버가 세션/쿠키를 설정한다고 가정
 * - 반환값: 로그인한 사용자
 */
export async function login(body: { email: string; password: string }): Promise<User> {
  try {
    const res = await httpPost<ApiOk<{ user: User }>>("/auth/login", {
      email: toEmailKey(body.email),
      password: body.password,
    });
    return res.user;
  } catch (err) {
    normalizeAndThrow(err);
  }
}

/**
 * 회원가입
 * - 성공 시 바로 로그인 처리되거나(서버 정책) 또는 별도 로그인 필요
 * - 백엔드 라우트는 /auth/register 를 사용합니다.
 * - 반환값: 생성/로그인 된 사용자
 */
export async function signup(body: { email: string; password: string; name?: string }): Promise<User> {
  try {
    const payload = {
      email: toEmailKey(body.email),
      password: body.password,
      name: body.name?.trim() || undefined,
    };
    const res = await httpPost<ApiOk<{ user: User }>>("/auth/register", payload);
    return res.user;
  } catch (err) {
    normalizeAndThrow(err);
  }
}

/**
 * 로그아웃
 * - 서버 세션/쿠키 무효화
 * - 보안상 POST 사용 (CSRF 보호는 서버에서 처리)
 */
export async function logout(): Promise<void> {
  await httpPost<ApiOk<Record<string, never>>>("/auth/logout", {});
}