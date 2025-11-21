/**
 * API 클라이언트 (fetch 기반)
 * ------------------------------------------------------------------
 * ▸ 세션 쿠키(credentials: 'include'), 타임아웃, 에러 파싱, FormData 업로드 지원
 * ▸ 환경변수 우선순위: VITE_API_BASE_URL → VITE_API_URL → VITE_API_BASE → http://localhost:3000 (코드에서 자동으로 /api를 뒤에 붙입니다)
 * ▸ 절대 URL(https://...)과 상대 경로('/auth/me' 또는 'auth/me') 모두 허용
 * ▸ 공통 httpGet/httpPost/httpPut/httpPatch/httpDelete + request(fetch 래퍼) 제공
 */

// --------------------------------------------------------------
// API 기본 URL 설정
//  - 환경변수에서 기본 주소를 읽고 항상 "/api"로 끝나도록 정규화
// --------------------------------------------------------------
const RAW_API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (import.meta as any).env?.VITE_API_URL ??
  (import.meta as any).env?.VITE_API_BASE ??
  'http://localhost:3000';

// 항상 `/api`로 끝나도록 정규화
export const API_BASE: string = (() => {
  // 끝에 붙은 / 제거 (http://localhost:3000/ → http://localhost:3000)
  const trimmed = RAW_API_BASE.replace(/\/+$/, '');
  // 이미 /api 로 끝나면 그대로, 아니면 /api 추가
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
})();

// API_ORIGIN: 이미지와 같은 정적 리소스를 요청할 때 사용할 기본 Origin URL
//  - 예: API_BASE가 "http://localhost:3000/api"라면
//        API_ORIGIN은 "http://localhost:3000"이 됩니다.
export const API_ORIGIN: string = API_BASE.replace(/\/api$/, '');

const DEFAULT_TIMEOUT =
  Number((import.meta as any).env?.VITE_API_TIMEOUT_MS) || 15000;

// HTTP 메서드 타입
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 서버 에러를 담아 던질 때 사용할 에러 타입(상태코드/본문/요청 URL 포함)
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
  timeoutMs?: number; // 기본 15000ms
  withCredentials?: boolean; // 기본 true
};

const isAbsolute = (p: string) => /^https?:\/\//i.test(p);
const isFormData = (v: any): v is FormData =>
  typeof FormData !== 'undefined' && v instanceof FormData;
const isPlainObject = (v: any) =>
  Object.prototype.toString.call(v) === '[object Object]';

// 객체 → ?a=1&b=2 형태로 변환
function qs(params?: Record<string, any>): string {
  if (!params) return '';
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((x) => s.append(k, String(x)));
    else s.append(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : '';
}

// URL builder: path + params → full URL
function buildUrl(path: string, params?: Record<string, any>): string {
  // 절대 URL이면 그대로 사용
  const base = isAbsolute(path) ? '' : API_BASE;

  // 선행 슬래시 보정
  const normalizedPath = isAbsolute(path)
    ? path
    : path.startsWith('/')
      ? path
      : `/${path}`;

  // 쿼리스트링 생성
  const query = qs(params); // '' 또는 '?a=1'

  if (!query) {
    return `${base}${normalizedPath}`;
  }

  // 이미 path에 '?'가 있으면 '&'로 이어붙임
  if (normalizedPath.includes('?')) {
    return `${base}${normalizedPath}&${query.slice(1)}`;
  }

  return `${base}${normalizedPath}${query}`;
}

/**
 * 내부 공통 요청 함수
 * - credentials: 'include' 로 httpOnly 쿠키(세션) 자동 전송 (옵션으로 해제 가능)
 * - AbortController 로 타임아웃 구현 (기본 15초, VITE_API_TIMEOUT_MS로 오버라이드 가능)
 * - JSON 에러 응답 시 {message|error|msg|code} 우선 사용
 * - FormData 업로드 시 Content-Type 자동 처리
 */
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

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const init: RequestInit = {
    method,
    credentials: withCredentials ? 'include' : 'same-origin', // 세션 쿠키 포함 여부
    headers: {
      Accept: 'application/json',
      ...(headers || {}),
    },
    signal: controller.signal,
  };

  if (data && method !== 'GET') {
    if (isFormData(data)) {
      init.body = data; // Content-Type 자동
    } else if (isPlainObject(data) || Array.isArray(data)) {
      init.headers = {
        'Content-Type': 'application/json',
        ...(init.headers as any),
      };
      init.body = JSON.stringify(data);
    } else {
      // Blob/ArrayBuffer/ReadableStream 등
      init.body = data as any;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e: any) {
    clearTimeout(id);
    const err: ApiError =
      e?.name === 'AbortError'
        ? new Error('요청이 시간 초과되었습니다.')
        : new Error(e?.message || '네트워크 오류가 발생했습니다.');
    err.status = 0;
    err.url = url;
    throw err;
  } finally {
    clearTimeout(id);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json')
    || contentType.includes('application/problem+json')
    || contentType.includes('application/ld+json')
    || contentType.endsWith('+json');

  let payload: any = null;
  if (isJson) {
    payload = await res.json().catch(() => null);
  } else if (contentType.startsWith('text/')) {
    payload = await res.text().catch(() => '');
  }

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

// 공개 유틸: GET/POST/PUT/PATCH/DELETE
export const httpGet = <T>(
  path: string,
  params?: Record<string, any>,
  opt?: Omit<RequestOptions, 'params' | 'data'>
) => request<T>('GET', path, { ...(opt || {}), params });

export const httpPost = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, 'data'>
) => request<T>('POST', path, { ...(opt || {}), data });

export const httpPut = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, 'data'>
) => request<T>('PUT', path, { ...(opt || {}), data });

export const httpPatch = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, 'data'>
) => request<T>('PATCH', path, { ...(opt || {}), data });

export const httpDelete = <T>(
  path: string,
  params?: Record<string, any>,
  opt?: Omit<RequestOptions, 'params' | 'data'>
) => request<T>('DELETE', path, { ...(opt || {}), params });

// --------------------------------------------------------------
/** axios처럼 사용하는 얇은 어댑터 */
const apiClient = {
  get: httpGet,
  post: httpPost,
  put: httpPut,
  patch: httpPatch,
  delete: httpDelete,
  base: API_BASE,
  fetch: request, // 필요 시 직접 사용
};

export default apiClient;
export { apiClient };