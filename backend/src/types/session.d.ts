// ============================================================
// session.d.ts
// ------------------------------------------------------------
// Express + express-session용 전역 타입 보강(augmentation)을 담당합니다.
// - 런타임 동작(세션 생성/저장/삭제)을 바꾸지 않습니다.
// - 오직 TypeScript 타입 정보를 추가/정교화하는 역할만 합니다.
// - 비즈니스 로직, 미들웨어 로직은 여기에 두지 않습니다.
// ============================================================

import type { Session, SessionData } from 'express-session';
import type { Request } from 'express';

// -------------------------------------------------------------
// SessionUser 타입
// -------------------------------------------------------------
// - 세션/인증에서 사용하는 최소 사용자 정보 스냅샷입니다.
// - 비밀번호, 토큰 등 민감한 정보는 절대 포함하지 않습니다.
// -------------------------------------------------------------
export interface SessionUser {
  /** 고유 사용자 ID (DB의 PK - Prisma User.id 가 Int 이므로 number 로 맞춤) */
  id: number;
  /** 로그인에 사용되는 이메일 (표시용 포함) */
  email: string;
  /** UI에서 표시할 수 있는 이름(선택) */
  name?: string;
  /** 간단한 권한 구분용 역할(선택) */
  role?: 'user' | 'admin';
}

// -------------------------------------------------------------
// 1) express-session 모듈 보강
// -------------------------------------------------------------
// - SessionData 인터페이스에 user 필드를 추가해서
//   req.session.user 사용 시 타입 에러 없이 자동완성되도록 합니다.
// -------------------------------------------------------------
declare module 'express-session' {
  interface SessionData {
    /** 세션에 저장되는 최소 사용자 정보 (로그인하지 않은 경우 undefined) */
    user?: SessionUser;
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
      currentUser?: SessionUser;

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
// - 다른 파일에서 명시적으로 import 해서 쓰고 싶을 때 사용합니다.
//
//   예)
//     import type { AuthedRequest } from '../types/session';
//     function handler(req: AuthedRequest, res: Response) { … }
// -------------------------------------------------------------

/**
 * 인증이 "이미 통과된" Request 를 명시적으로 표현할 때 사용하는 헬퍼 타입
 * - authRequired 미들웨어 이후의 핸들러에서 사용하면,
 *   req.currentUser 가 항상 존재한다고 타입이 보장됩니다.
 */
export type AuthedRequest = Request & {
  currentUser: SessionUser;
};

/**
 * 세션 객체를 별도로 다룰 때 사용할 수 있는 헬퍼 타입
 */
export type SessionWithUser = Session & Partial<SessionData>;