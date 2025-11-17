/**
 * 타입 보강 파일(session.d.ts)
 * 목적: express-session의 SessionData에 우리 프로젝트에서 쓰는 `user` 필드를 추가해
 *      req.session.user에 타입 안정성을 제공합니다.
 *
 * 사용처: 로그인 성공 시 req.session.user에 최소한의 식별 정보만 저장(민감정보 금지).
 * 예시:
 *   req.session.user = { id: 'u_123', email: 'kim@ex.com', name: 'Kim' };
 *
 * 주의:
 * - 이 파일은 .d.ts(선언) 파일이라 JS로 컴파일되지 않지만, TS 컴파일러의 include 범위에
 *   들어와야(예: tsconfig의 "include": ["src"]) 타입 보강이 적용됩니다.
 * - Session 저장소(Redis 등)를 바꿔도 타입 선언은 동일하게 동작합니다.
 * - 비밀번호, 토큰 등 민감정보는 절대 session.user에 넣지 마세요.
 */
import 'express-session'; // 모듈 보강을 위해 원 모듈을 가져옵니다. (코드 생성 없음)

/**
 * 모듈 보강(module augmentation):
 * 기존 'express-session' 모듈 안의 SessionData 인터페이스에 우리 필드를 합칩니다.
 */
declare module 'express-session' {
  interface SessionData {
    /**
     * 로그인한 사용자 최소 정보.
     * - 선택(optional)인 이유: 비로그인 상태에서는 undefined일 수 있음.
     * - id: 내부 식별자(문자열)
     * - email: 로그인 계정 이메일
     * - name: 사용자 표시 이름(프로필명)
     */
    user?: { id: string; email: string; name: string };
  }
}