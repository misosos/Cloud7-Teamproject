// ✅ 이 파일은 전역 타입 보강(augmentation)을 위한 .d.ts 입니다.
// - Express + express-session에 "세션 사용자 스냅샷" 타입을 추가합니다.
// - 팀원이 보기 쉽도록 한글 주석을 충분히 넣었습니다.
// - 모듈 경계(`export {}`)를 선언해 전역 오염을 막고, 필요한 부분만 명시적으로 보강합니다.

export {}; // 이 파일을 모듈로 취급하여 선언이 전역으로 새지 않도록 함

// express-session의 Session/SessionData 타입을 가져와서 정확한 세션 타입을 보장합니다.
import type { Session, SessionData } from 'express-session';

// -------------------------------------------------------------
// Auth 네임스페이스: 프로젝트 내부에서만 쓰는 세션 사용자 타입 모음
// -------------------------------------------------------------
declare namespace Auth {
  /**
   * SessionUser
   * - 서버 세션(req.session.user)에 저장되는 "최소한의 사용자 정보" 스냅샷입니다.
   * - 비밀번호 해시 등 민감 정보는 절대 포함하지 않습니다.
   * - 컨트롤러/미들웨어가 req.currentUser로도 접근할 수 있습니다.
   */
  interface SessionUser {
    id: string;
    email: string;
    name?: string;
    role?: 'user' | 'admin';
  }
}

// -------------------------------------------------------------
// 1) express-session 모듈 보강
//    req.session.user 속성을 타입 차원에서 인지시키기 위해 SessionData를 확장합니다.
// -------------------------------------------------------------
declare module 'express-session' {
  interface SessionData {
    /** 세션에 저장되는 최소 사용자 정보 (있을 수도, 없을 수도 있음) */
    user?: Auth.SessionUser;
  }
}

// -------------------------------------------------------------
// 2) Express.Request 보강
//    인증 미들웨어가 req.currentUser에 세션 사용자 정보를 복사해 넣을 수 있도록 타입을 추가합니다.
//    또한 req.session 타입을 구체화하여 IDE/TS가 정적 검사를 더 잘 하도록 돕습니다.
// -------------------------------------------------------------
declare global {
  namespace Express {
    interface Request {
      /** 인증 미들웨어가 주입하는 현재 로그인 사용자(세션에서 복사) */
      currentUser?: Auth.SessionUser;
      /** express-session 미들웨어가 제공하는 세션 객체 (선언을 명시적으로 유지) */
      session: Session & Partial<SessionData>;
    }
  }
}

// -------------------------------------------------------------
// 3) 선택형 헬퍼 타입
//    전역 보강을 IDE가 일시적으로 놓칠 때, 아래 타입을 직접 임포트해서 사용할 수 있습니다.
// -------------------------------------------------------------
export type AuthedRequest = Express.Request & { currentUser?: Auth.SessionUser };
export type SessionWithUser = Session & Partial<SessionData>;