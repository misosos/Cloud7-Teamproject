/**
 * API 클라이언트 (fetch 기반, 웹/Capacitor 앱 호환)
 * ------------------------------------------------------------------
 * ▸ 세션 쿠키(credentials: include), 타임아웃, 에러 파싱
 * ▸ FormData 지원
 * ▸ 환경변수 우선순위: VITE_API_BASE_URL → VITE_API_URL → VITE_API_BASE → http://210.117.134.80:3000
 * ▸ 항상 /api 로 끝나는 API_BASE 생성
 * ▸ httpGet/httpPost/httpPut/httpPatch/httpDelete export
 */

console.log("[DEBUG] import.meta.env =", (import.meta as any).env);

// --------------------------------------------------------------
// API 기본 주소 설정
// --------------------------------------------------------------
const RAW_API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (import.meta as any).env?.VITE_API_URL ??
  (import.meta as any).env?.VITE_API_BASE ??
  "http://210.117.134.80:3000";

// 항상 /api로 끝나도록 정규화
export const API_BASE: string = (() => {
  const trimmed = RAW_API_BASE.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
})();

// origin (정적 파일 등)
export const API_ORIGIN: string = API_BASE.replace(/\/api$/, "");

console.log("[DEBUG] API_BASE =", API_BASE);

const DEFAULT_TIMEOUT =
  Number((import.meta as any).env?.VITE_API_TIMEOUT_MS) || 15000;

// HTTP 메서드 타입
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type ApiError = Error & {
  status?: number;
  data?: any;
  url?: string;
  code?: string | number;
};

export type RequestOptions = {
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
  withCredentials?: boolean; // 기본 true
};

// --------------------------------------------------------------
// 유틸
// --------------------------------------------------------------
const isAbsolute = (p: string) => /^https?:\/\//i.test(p);
const isFormData = (v: any): v is FormData =>
  typeof FormData !== "undefined" && v instanceof FormData;
const isPlainObject = (v: any) =>
  Object.prototype.toString.call(v) === "[object Object]";

export function qs(params?: Record<string, any>): string {
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

export function buildUrl(path: string, params?: Record<string, any>): string {
  const base = isAbsolute(path) ? "" : API_BASE;
  const normalized = isAbsolute(path)
    ? path
    : path.startsWith("/")
    ? path
    : `/${path}`;

  const query = qs(params);
  if (!query) return `${base}${normalized}`;
  if (normalized.includes("?"))
    return `${base}${normalized}&${query.slice(1)}`;
  return `${base}${normalized}${query}`;
}

// --------------------------------------------------------------
// fetch wrapper
// --------------------------------------------------------------
export async function request<T>(
  method: HttpMethod,
  path: string,
  options?: RequestOptions
): Promise<T> {
  const {
    params,
    data,
    headers,
    timeoutMs = DEFAULT_TIMEOUT,
    withCredentials = true,
  } = options || {};

  const url = buildUrl(path, params);

  console.log(`[DEBUG fetch] ${method} ${url}`);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const init: RequestInit = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(headers || {}),
    },
    signal: controller.signal,
  };

  if (data && method !== "GET") {
    if (isFormData(data)) {
      init.body = data;
    } else if (isPlainObject(data) || Array.isArray(data)) {
      init.headers = {
        "Content-Type": "application/json",
        ...(init.headers as any),
      };
      init.body = JSON.stringify(data);
    } else {
      init.body = data as any;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e: any) {
    clearTimeout(id);
    console.log("[DEBUG fetch ERROR]", e);
    const err: ApiError =
      e?.name === "AbortError"
        ? new Error("Request timeout")
        : new Error(e?.message || "Network error");
    err.status = 0;
    err.url = url;
    throw err;
  } finally {
    clearTimeout(id);
  }

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const isJson =
    ct.includes("application/json") ||
    ct.includes("application/problem+json") ||
    ct.includes("json");

  let payload: any = null;
  if (isJson) payload = await res.json().catch(() => null);
  else if (ct.startsWith("text/"))
    payload = await res.text().catch(() => "");

  if (!res.ok) {
    const err: ApiError = new Error(
      (payload && (payload.message || payload.error || payload.msg)) ||
        `HTTP ${res.status}`
    );
    err.status = res.status;
    err.data = payload;
    err.url = url;
    if (payload?.code !== undefined) err.code = payload.code;
    throw err;
  }

  return payload as T;
}

// --------------------------------------------------------------
// 메서드 헬퍼들
// --------------------------------------------------------------
export const httpGet = <T>(
  path: string,
  params?: Record<string, any>,
  opt?: Omit<RequestOptions, "params" | "data">
) => request<T>("GET", path, { ...(opt || {}), params });

export const httpPost = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, "data">
) => request<T>("POST", path, { ...(opt || {}), data });

export const httpPut = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, "data">
) => request<T>("PUT", path, { ...(opt || {}), data });

export const httpPatch = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, "data">
) => request<T>("PATCH", path, { ...(opt || {}), data });

export const httpDelete = <T>(
  path: string,
  params?: Record<string, any>,
  opt?: Omit<RequestOptions, "params" | "data">
) => request<T>("DELETE", path, { ...(opt || {}), params });

// --------------------------------------------------------------
// axios 스타일 어댑터
// --------------------------------------------------------------
const apiClient = {
  get: httpGet,
  post: httpPost,
  put: httpPut,
  patch: httpPatch,
  delete: httpDelete,
  fetch: request,
  base: API_BASE,
};

export default apiClient;
export { apiClient };
