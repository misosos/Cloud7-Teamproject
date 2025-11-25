import { httpGet, httpPost } from "./apiClient";

// 서버에서 내려오는 사용자 정보 타입
export type User = {
  id: string | number; // 백엔드에서 number/ string 둘 다 올 수 있어 유연하게 처리
  email: string;       // 사용자 이메일(로그인 ID)
  name: string | null; // 사용자 이름 (없을 수 있음)
  role: string | null; // 권한/역할 정보 (ex. 'admin', 'user' 등)
};

// API 응답이 항상 { ok: true, ... } 형태로 내려온다고 가정한 유틸 타입
export type ApiOk<T> = { ok: true } & T;

// 이메일을 소문자 + 양쪽 공백 제거한 형태로 통일하는 유틸
// → 대소문자/공백 차이로 인한 로그인 오류 방지
const toEmailKey = (email: string) => email.trim().toLowerCase();

// 에러 객체에서 HTTP status 코드 추출
// - fetch, axios 등 구현체가 바뀌더라도 최대한 대응하기 위해 안전하게 파싱
const getStatus = (err: any): number | undefined =>
  err?.status ?? err?.response?.status;

// 이 에러가 "인증 실패(401)" 상황인지 판별하는 유틸
function isUnauthorized(err: unknown) {
  const anyErr = err as any;
  const status = getStatus(anyErr);
  return (
    status === 401 ||
    anyErr?.code === "UNAUTHORIZED" ||
    (typeof anyErr?.message === "string" && anyErr.message.includes("401"))
  );
}

/**
 * 공통 에러 정규화 함수
 * - HTTP status 코드에 따라 프론트에서 처리하기 쉬운 형태의 Error를 만들어 throw
 * - 모든 인증/회원 관련 API에서 동일한 에러 메시지/코드를 쓰도록 맞춰줌
 */
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
  // 위에서 어떤 케이스에도 해당되지 않으면, 원본 에러 그대로 던짐
  throw anyErr;
}

/**
 * 현재 로그인한 사용자 조회
 *
 * - 세션이 없거나 로그인하지 않은 상태라면 401(Unauthorized)이 떨어질 수 있음
 * - 이 함수에서는 401/403을 "로그인 안 됨"으로 보고 `null`을 반환
 *   → 최초 앱 부팅(bootstrap) 과정에서 불필요한 에러 토스트/무한 루프 방지
 */
export async function me(): Promise<User | null> {
  try {
    const res = await httpGet<ApiOk<{ user: User }>>("/auth/me");
    return res.user;
  } catch (err) {
    if (isUnauthorized(err)) return null;
    // 권한 없음(403)도 사실상 로그인 안 된 상태로 취급
    if (getStatus(err) === 403) return null;
    // 그 외 에러는 상위에서 공통 처리(에러 바운더리, 토스트 등)
    throw err;
  }
}

/**
 * 로그인
 *
 * - 성공 시 서버가 세션/쿠키를 설정한다고 가정 (쿠키 기반 인증)
 * - 파라미터:
 *   - email: 사용자가 입력한 이메일
 *   - password: 비밀번호
 * - 반환값:
 *   - 로그인에 성공한 사용자 정보(User)
 */
export async function login(body: {
  email: string;
  password: string;
}): Promise<User> {
  try {
    const res = await httpPost<ApiOk<{ user: User }>>("/auth/login", {
      // 이메일은 항상 소문자 + trim 처리해서 서버로 전달
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
 *
 * - 백엔드 라우트: POST /auth/register
 * - 성공 시:
 *   - 바로 로그인된 세션을 만들어 줄 수도 있고(서버 정책)
 *   - 단순히 계정만 만들고 로그인은 별도로 할 수도 있음
 * - 여기서는 응답으로 내려오는 `user` 객체를 그대로 반환
 */
export async function signup(body: {
  email: string;
  password: string;
  name?: string;
}): Promise<User> {
  try {
    const payload = {
      email: toEmailKey(body.email),
      password: body.password,
      // name이 공백뿐인 경우는 undefined로 보내서 서버에서 optional로 처리
      name: body.name?.trim() || undefined,
    };
    const res = await httpPost<ApiOk<{ user: User }>>(
      "/auth/register",
      payload
    );
    return res.user;
  } catch (err) {
    normalizeAndThrow(err);
  }
}

/**
 * 로그아웃
 *
 * - 서버 세션/쿠키를 무효화하는 API
 * - 보안상 GET보다는 POST 사용 (CSRF 방어 등은 서버에서 처리)
 * - 프론트에서는 단순히 호출만 하고, 상태 초기화는 store에서 담당
 */
export async function logout(): Promise<void> {
  await httpPost<ApiOk<Record<string, never>>>("/auth/logout", {});
}