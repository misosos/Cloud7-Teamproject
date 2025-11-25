// ============================================================
// session.d.ts
// ------------------------------------------------------------
// 이 파일은 Express + express-session용 "전역 타입 보강(augmentation)"만 담당합니다.
// - 실제 런타임 동작(세션 생성/저장/삭제)은 바꾸지 않습니다.
// - 오직 TypeScript 타입 정보를 추가/정교화해서
//   IDE 자동완성과 타입 추론을 더 풍부하게 만들어 주는 역할만 합니다.
// - 비즈니스 로직, 미들웨어 로직은 여기에 두지 않습니다.
// ============================================================

export {}; // 이 파일을 모듈로 취급하여 선언이 전역으로 무분별하게 새지 않도록 함

// express-session 에서 제공하는 Session / SessionData 타입을 가져와서
// req.session 의 타입을 정확하게 보강할 때 재사용합니다.
import type { Session, SessionData } from 'express-session';

// -------------------------------------------------------------
// Auth 네임스페이스
// -------------------------------------------------------------
// - 이 프로젝트 내부에서 "세션에 저장되는 사용자 정보"를 표현하기 위한 타입입니다.
// - Auth.SessionUser 는 세션에 들어가는 최소 정보 스냅샷이며,
//   비밀번호 해시, 토큰 등 민감한 정보는 절대 포함하지 않습니다.
// -------------------------------------------------------------
declare namespace Auth {
  /**
   * SessionUser
   * - 서버 세션(req.session.user)에 저장되는 "최소한의 사용자 정보" 스냅샷입니다.
   * - 컨트롤러/미들웨어는 req.currentUser 를 통해서도 동일한 정보를 조회할 수 있습니다.
   */
  interface SessionUser {
    /** 고유 사용자 ID (DB의 PK를 문자열로 맞춰 사용) */
    id: string;
    /** 로그인에 사용되는 이메일 (표시용 포함) */
    email: string;
    /** UI에서 표시할 수 있는 이름(선택) */
    name?: string;
    /** 간단한 권한 구분용 역할(선택) */
    role?: 'user' | 'admin';
  }
}

// -------------------------------------------------------------
// 1) express-session 모듈 보강
// -------------------------------------------------------------
// - SessionData 인터페이스에 user 필드를 추가해서
//   req.session.user 사용 시 타입 에러 없이 자동완성되도록 합니다.
// - "있을 수도, 없을 수도 있는" 필드이므로 Optional(?) 로 정의합니다.
// -------------------------------------------------------------
declare module 'express-session' {
  interface SessionData {
    /** 세션에 저장되는 최소 사용자 정보 (로그인하지 않은 경우 undefined) */
    user?: Auth.SessionUser;
  }
}

// -------------------------------------------------------------
// 2) Express.Request 보강
// -------------------------------------------------------------
// - 인증 미들웨어가 req.currentUser 에 세션 사용자 정보를 복사해서 넣도록 할 것이므로,
//   Express.Request 타입에 currentUser 를 추가합니다.
// - req.session 에 대해서도 Session & Partial<SessionData> 형태로 타입을 명시해
//   IDE가 더 정확하게 추론할 수 있도록 합니다.
// -------------------------------------------------------------
declare global {
  namespace Express {
    interface Request {
      /**
       * 인증 미들웨어가 주입하는 현재 로그인 사용자 정보
       * - 일반적으로 req.session.user 의 스냅샷을 그대로 복사해서 사용합니다.
       * - 로그인하지 않은 경우에는 undefined 입니다.
       */
      currentUser?: Auth.SessionUser;

      /**
       * express-session 미들웨어가 제공하는 세션 객체
       * - SessionData 를 부분적으로(Partial) 사용할 수 있도록 설정했습니다.
       * - 실제 구현에서는 req.session.user 등에 안전하게 접근할 수 있습니다.
       */
      session: Session & Partial<SessionData>;
    }
  }
}

// -------------------------------------------------------------
// 3) 선택형 헬퍼 타입
// -------------------------------------------------------------
// - 전역 보강이 IDE/TS에서 바로 반영되지 않을 때(혹은 테스트 코드 등에서),
//   아래 타입들을 직접 import 해서 사용할 수 있습니다.
//
//   예)
//     import type { AuthedRequest } from '../types/session';
//     function handler(req: AuthedRequest, res: Response) { … }
//
// -------------------------------------------------------------
export type AuthedRequest = Express.Request & {
  currentUser?: Auth.SessionUser;
};

export type SessionWithUser = Session & Partial<SessionData>;