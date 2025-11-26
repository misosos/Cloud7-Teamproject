import { httpGet, httpPost } from "./apiClient";

// 사용자 타입
export type User = {
  id: string | number;
  email: string;
  name: string | null;
  role: string | null;
};

// API 응답 타입
export type ApiOk<T> = { ok: true } & T;

// 토큰 저장 키
const TOKEN_KEY = "accessToken";

// 저장된 토큰 가져오기
export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) ?? null;
}

// 토큰 저장
export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// 이메일 정규화
const toEmailKey = (email: string) => email.trim().toLowerCase();

// 에러 status 추출
const getStatus = (err: any): number | undefined =>
  err?.status ?? err?.response?.status;

// 401 감지
function isUnauthorized(err: unknown) {
  const e = err as any;
  const status = getStatus(e);
  return (
    status === 401 ||
    e?.code === "UNAUTHORIZED" ||
    (typeof e?.message === "string" && e.message.includes("401"))
  );
}

// 공통 에러 처리
function normalizeAndThrow(err: unknown): never {
  const e = err as any;
  const status = getStatus(e);
  const msg =
    e?.message ??
    e?.response?.data?.message ??
    e?.response?.data?.error;

  if (status === 409) throw Object.assign(new Error(msg), { code: "CONFLICT", status });
  if (status === 422) throw Object.assign(new Error(msg), { code: "VALIDATION", status });
  if (status === 400) throw Object.assign(new Error(msg), { code: "BAD_REQUEST", status });
  if (status === 401) throw Object.assign(new Error(msg), { code: "UNAUTHORIZED", status });

  throw err;
}

/* --------------------------------------
 * 👍 단기 땜빵 버전 핵심 로직
 * - 요청할 때 항상 Authorization 헤더 자동 추가
 * -------------------------------------- */
async function authorizedGet<T>(url: string): Promise<T> {
  const token = getAccessToken();

  return await httpGet<T>(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function authorizedPost<T>(url: string, body: any): Promise<T> {
  const token = getAccessToken();

  return await httpPost<T>(url, body, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

/**
 * 현재 로그인된 유저 정보 조회
 * - 토큰이 없거나 만료되면 null
 */
export async function me(): Promise<User | null> {
  try {
    const res = await authorizedGet<ApiOk<{ user: User }>>("/auth/me");
    return res.user;
  } catch (err) {
    if (isUnauthorized(err)) return null;
    if (getStatus(err) === 403) return null;
    throw err;
  }
}

/**
 * 로그인
 * - 서버가 { user, token } 내려준다고 가정
 */
export async function login(body: {
  email: string;
  password: string;
}): Promise<User> {
  try {
    const payload = {
      email: toEmailKey(body.email),
      password: body.password,
    };

    const res = await httpPost<ApiOk<{ user: User; token: string }>>(
      "/auth/login",
      payload
    );

    // ⭐ 토큰 저장!
    setAccessToken(res.token);

    return res.user;
  } catch (err) {
    normalizeAndThrow(err);
  }
}

/**
 * 회원가입
 * - 서버가 { user, token } 내려준다고 가정
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
      name: body.name?.trim() || undefined,
    };

    const res = await httpPost<ApiOk<{ user: User; token: string }>>(
      "/auth/register",
      payload
    );

    // ⭐ 회원가입 성공 시 토큰 저장
    setAccessToken(res.token);

    return res.user;
  } catch (err) {
    normalizeAndThrow(err);
  }
}

/**
 * 로그아웃
 * - 서버 세션 지우는 것과 무관하게 프론트 토큰 삭제
 */
export async function logout(): Promise<void> {
  try {
    await authorizedPost("/auth/logout", {});
  } finally {
    setAccessToken(null); // ⭐ 토큰 삭제
  }
}
