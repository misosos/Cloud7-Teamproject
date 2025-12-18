// src/utils/env.ts
/**
 * [환경변수 로더/검증기]
 * - .env 파일을 읽어 process.env에 등록합니다 (dotenv/config).
 * - 서비스 실행에 필요한 값이 빠진 경우 즉시 에러를 던져 조기에 문제를 발견합니다.
 *
 * 사용 예:
 *   import { env } from '@/utils/env';
 *   app.listen(env.PORT)
 *
 * .env 예:
 *   SESSION_SECRET=your-secret
 *   CORS_ORIGIN=http://localhost:5173
 */
import 'dotenv/config'; // 프로그램 시작 시 .env 자동 로드 (패키지: dotenv). 루트에 .env 파일이 있어야 합니다.

/**
 * 반드시 필요한 환경변수를 읽어오는 헬퍼.
 * - 값이 없으면(빈 문자열 포함) 오류를 던져 앱 부팅을 중단합니다.
 * - fallback 인자를 주면, 값이 없을 때 그 기본값을 사용합니다.
 */
const required = (name: string, fallback?: string) => {
  const v = process.env[name] ?? fallback; // .env → process.env에서 읽기, 없으면 기본값
  if (!v) throw new Error(`Missing env: ${name}`); // 비어있거나 누락되면 바로 실패(조기 실패)
  return v;
};

/**
 * 애플리케이션 전역에서 사용할 환경설정 모음.
 * - 숫자/문자 등 필요한 타입으로 변환해 두어 나중에 안전하게 사용합니다.
 * - 새 항목을 추가할 때는 아래 객체에만 키를 추가하면 됩니다.
 */
export const env = {
  // 실행 환경 (development / production / test). 기본값은 development.
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  // 서버가 바인딩할 포트 번호. 문자열로 들어오므로 미리 숫자로 변환.
  // .env에 PORT가 없으면 3000 사용.
  PORT: parseInt(process.env.PORT ?? '3000', 10),

  // 세션/쿠키 서명에 쓰일 비밀키. 반드시 필요(없으면 서버가 뜨지 않음).
  // 절대 깃에 올리지 말 것! .env(로컬), 배포 환경 변수로만 관리.
  SESSION_SECRET: required('SESSION_SECRET'),

  // 브라우저에서 허용할 프론트엔드 오리진(도메인). 없으면 개발 기본값 사용.
  // 예) http://localhost:5173, https://your-app.com
  CORS_ORIGIN: required('CORS_ORIGIN', 'http://localhost:5173'),

  // ─────────────────────────────────────────────────────────
  // 카카오 소셜 로그인 설정
  // ─────────────────────────────────────────────────────────
  // 카카오 REST API 키 (개발자 콘솔에서 발급)
  KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID ?? '',
  // 카카오 클라이언트 시크릿 (선택사항, 활성화한 경우 필요)
  KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET ?? '',
  // 카카오 로그인 후 돌아올 콜백 URL
  KAKAO_REDIRECT_URI: process.env.KAKAO_REDIRECT_URI ?? 'http://localhost:3000/api/auth/kakao/callback',
};

// [팁] 새 환경변수를 추가하고 싶다면?
// 1) .env에 KEY=VALUE를 추가
// 2) 위 env 객체에 KEY: required('KEY') 또는 가급적 기본값이 있으면 required('KEY', 'default')로 추가
// 3) 사용하는 파일에서 import { env } 후 env.KEY로 접근