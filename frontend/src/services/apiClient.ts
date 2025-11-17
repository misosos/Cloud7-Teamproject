/**
 * API 클라이언트 (fetch 기반, 세션 쿠키/타임아웃/에러 파싱 지원)
 * ------------------------------------------------------------------
 * ▸ 실서버 연동 전/후 모두 재사용 가능한 초경량 래퍼입니다.
 * ▸ 기본값: VITE_API_URL → VITE_API_BASE → http://localhost:3000 순으로 사용.
 * ▸ 서버 세션(httpOnly 쿠키) 기반 인증을 고려해 credentials: 'include' 적용.
 * ▸ 공통 httpGet/httpPost/httpPut/httpDelete 제공 + 쿼리스트링/타임아웃/에러 파싱.
 */
export const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_API_BASE ||
  "http://localhost:3000";

// HTTP 메서드 타입
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// 서버 에러를 담아 던질 때 사용할 에러 타입(상태코드/본문 포함)
export type ApiError = Error & {
  status?: number;
  data?: any;
};

// 객체 → ?a=1&b=2 형태로 변환
function qs(params?: Record<string, any>): string {
  if (!params) return "";
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((x) => s.append(k, String(x)));
    else s.append(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

/**
 * 내부 공통 요청 함수
 * - credentials: 'include' 로 httpOnly 쿠키(세션) 자동 전송
 * - AbortController 로 타임아웃 구현 (기본 15초)
 * - JSON 에러 응답 시 {message|error|msg} 우선 사용
 */
async function request<T>(
  method: HttpMethod,
  path: string,
  options?: {
    params?: Record<string, any>;
    data?: any;
    headers?: Record<string, string>;
    timeoutMs?: number; // 기본 15000ms
  }
): Promise<T> {
  const { params, data, headers, timeoutMs = 15000 } = options || {};
  if (!path.startsWith("/")) throw new Error('path는 "/"로 시작해야 합니다.');

  const url = `${API_BASE}${path}${qs(params)}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const init: RequestInit = {
    method,
    credentials: "include", // 세션 쿠키 포함
    headers: {
      Accept: "application/json",
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    signal: controller.signal,
  };

  if (data && method !== "GET") {
    init.body = JSON.stringify(data);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e: any) {
    clearTimeout(id);
    if (e?.name === "AbortError") {
      const err: ApiError = new Error("요청이 시간 초과되었습니다.");
      err.status = 0;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(id);
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  if (!res.ok) {
    const err: ApiError = new Error(
      (payload && (payload.message || payload.error || payload.msg)) ||
        `HTTP ${res.status}`
    );
    err.status = res.status;
    err.data = payload;
    throw err;
  }

  return payload as T;
}

// 공개 유틸: GET/POST/PUT/DELETE
export const httpGet = <T>(
  path: string,
  params?: Record<string, any>,
  opt?: Omit<Parameters<typeof request<T>>[2], "params" | "data">
) => request<T>("GET", path, { ...(opt as any), params });

export const httpPost = <T>(
  path: string,
  data?: any,
  opt?: Omit<Parameters<typeof request<T>>[2], "data">
) => request<T>("POST", path, { ...(opt as any), data });

export const httpPut = <T>(
  path: string,
  data?: any,
  opt?: Omit<Parameters<typeof request<T>>[2], "data">
) => request<T>("PUT", path, { ...(opt as any), data });

export const httpDelete = <T>(
  path: string,
  params?: Record<string, any>,
  opt?: Omit<Parameters<typeof request<T>>[2], "params" | "data">
) => request<T>("DELETE", path, { ...(opt as any), params });

/**
 * 사용 예시
 * ------------------------------------------------------------------
 * type User = { id: string; email: string; name: string };
 * const me = await httpGet<User>("/auth/me");
 * const u  = await httpPost<User>("/auth/login", { email, password });
 * await httpPost<void>("/auth/logout");
 */

// --------------------------------------------------------------
// 기본(default) export: axios처럼 사용하는 얇은 어댑터
//  - apiClient.get('/auth/me')
//  - apiClient.post('/auth/login', { email, password })
// --------------------------------------------------------------
const apiClient = {
  get: httpGet,
  post: httpPost,
  put: httpPut,
  delete: httpDelete,
  base: API_BASE,
};

export default apiClient;
export { apiClient };
