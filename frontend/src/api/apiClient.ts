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

// 주어진 path가 'http://' 또는 'https://'로 시작하는 절대 URL인지 여부를 판단
const isAbsolute = (p: string) => /^https?:\/\//i.test(p);
// 값이 FormData 인스턴스인지 확인 (파일 업로드 여부 체크용)
const isFormData = (v: any): v is FormData =>
  typeof FormData !== 'undefined' && v instanceof FormData;
// 일반 객체(순수 JSON 객체)인지 여부 판별
const isPlainObject = (v: any) =>
  Object.prototype.toString.call(v) === '[object Object]';

// 객체 형태의 params를 '?a=1&b=2' 형식의 쿼리스트링으로 변환
export function qs(params?: Record<string, any>): string {
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

// path와 쿼리 파라미터를 합쳐 최종 호출 URL을 생성하는 헬퍼
export function buildUrl(path: string, params?: Record<string, any>): string {
  // 절대 URL이면 그대로 사용 (API_BASE를 붙이지 않음)
  const isAbs = isAbsolute(path);
  const base = isAbs ? '' : API_BASE;

  let normalizedPath: string;

  if (isAbs) {
    normalizedPath = path;
  } else {
    let p = path.trim();

    // ✅ 방어 로직: 호출 시 실수로 '/api/...' 또는 'api/...'를 넘겨도
    //    최종 URL이 '/api/api/...' 가 되지 않도록 '/api' 프리픽스를 제거
    if (p.startsWith('/api/')) {
      p = p.slice(4); // '/api' 길이만큼 잘라서 '/taste-records/...' 형태로 만듦
    } else if (p === '/api' || p === 'api') {
      p = '';
    } else if (p.startsWith('api/')) {
      p = p.slice(3); // 'api/...' -> '/...'
    }

    if (p === '') {
      normalizedPath = '';
    } else {
      normalizedPath = p.startsWith('/') ? p : `/${p}`;
    }
  }

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
 * 공통 fetch 래퍼: 타임아웃, 쿠키 전송, 에러 파싱, JSON/텍스트 응답 처리
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

// GET 요청 전용 헬퍼
export const httpGet = <T>(
  path: string,
  params?: Record<string, any>,
  opt?: Omit<RequestOptions, 'params' | 'data'>
) => request<T>('GET', path, { ...(opt || {}), params });

// POST 요청 전용 헬퍼
export const httpPost = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, 'data'>
) => request<T>('POST', path, { ...(opt || {}), data });

// PUT 요청 전용 헬퍼
export const httpPut = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, 'data'>
) => request<T>('PUT', path, { ...(opt || {}), data });

// PATCH 요청 전용 헬퍼
export const httpPatch = <T>(
  path: string,
  data?: any,
  opt?: Omit<RequestOptions, 'data'>
) => request<T>('PATCH', path, { ...(opt || {}), data });

// DELETE 요청 전용 헬퍼 (주로 쿼리 파라미터 기반)
export const httpDelete = <T>(
  path: string,
  params?: Record<string, any>,
  opt?: Omit<RequestOptions, 'params' | 'data'>
) => request<T>('DELETE', path, { ...(opt || {}), params });

// --------------------------------------------------------------
// 도메인 전용 API 헬퍼 (취향 추천 / 대시보드 등)
//  - 컴포넌트에서 URL 문자열을 직접 쓰지 않고, 타입이 지정된 함수로 사용
// --------------------------------------------------------------

// 내 주변 취향 기반 장소 추천 결과 타입
export interface TasteRecommendation {
  id: number | string;
  name: string;
  address: string;
  category: string;
  distanceMeters: number;
  lat: number;
  lng: number;
  score: number;
}

/**
 * 내 취향 + 현재 좌표 기반 추천 장소 조회
 *  - 백엔드: GET /places/recommend-by-taste?lat=..&lng=..
 */
export const getTasteBasedRecommendations = (
  lat: number,
  lng: number
): Promise<TasteRecommendation[]> => {
  return httpGet<TasteRecommendation[]>('/places/recommend-by-taste', {
    lat,
    lng,
  });
};

// 취향 분석(대시보드) 응답 타입 예시
export interface TasteRecordCategoryStat {
  category: string;
  count: number;
  ratio: number; // 0~1 비율
}

export interface TasteRecordMonthlyStat {
  month: string; // '2025-01' 같은 문자열
  count: number;
}

export interface TasteRecordInsights {
  totalCount: number;
  activeDays: number;
  longestStreak: number;
  categoryStats: TasteRecordCategoryStat[];
  monthlyStats: TasteRecordMonthlyStat[];
}

/**
 * 취향 분석(인사이트) 데이터 조회
 *  - 최종 요청 경로: GET /api/taste-records/insights
 *    (API_BASE가 '/api' 또는 'http://host:port/api' 형태이고,
 *     여기서는 '/taste-records/insights' 상대 경로만 넘깁니다.)
 */
export const getTasteRecordInsights = (): Promise<TasteRecordInsights> => {
  return httpGet<TasteRecordInsights>('/taste-records/insights');
};

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