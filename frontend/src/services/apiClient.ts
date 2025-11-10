/**
 * 초경량 API 클라이언트 (프론트엔드 전용)
 * -------------------------------------------------
 * ▸ 현재 백엔드 연동이 없어도, "호출 형태"를 맞춰보거나
 *   목서버(json-server/MSW)와 함께 테스트할 때 사용할 수 있는 래퍼입니다.
 * ▸ Vite 환경변수 VITE_API_BASE 가 있으면 그 값 사용,
 *   없으면 기본값으로 http://localhost:4000 을 사용합니다.
 * ▸ 사용 시 path는 반드시 "/"로 시작하세요. (예: "/users/1")
 * ▸ 응답 타입은 제네릭 T로 지정합니다. (예: httpGet<User>("/users/1"))
 * ▸ 주의: 여기서는 타임아웃/토큰/CORS 에러 처리를 하지 않습니다.
 *   프로젝트 진행 중 필요해지면 아래 TODO를 참고해 확장하세요.
 */
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

/**
 * GET 요청 전용 유틸
 * @param path 반드시 "/"로 시작하는 API 경로 (예: "/users/1")
 * @returns 제네릭 T 타입으로 파싱된 JSON 응답
 * @example
 *   type User = { id: number; email: string };
 *   const user = await httpGet<User>("/users/1");
 */
export async function httpGet<T>(path: string): Promise<T> {
  // API_BASE + path 로 최종 URL을 구성합니다.
  const res = await fetch(`${API_BASE}${path}`);

  // HTTP 상태코드가 200~299 범위가 아니면 에러를 던집니다.
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);

  // JSON 본문을 제네릭 T 타입으로 반환합니다.
  return res.json();
}

/**
 * TODO(확장 아이디어)
 * 1) httpPost/httpPut/httpDelete 추가
 * 2) 공통 헤더/인증 토큰 주입 (Authorization: Bearer ...)
 * 3) AbortController로 타임아웃 처리
 * 4) 쿼리스트링 헬퍼 (URLSearchParams) 분리
 * 5) 에러 객체(서버 메시지) 파싱 및 사용자 친화적 에러 메시지 구성
 */
