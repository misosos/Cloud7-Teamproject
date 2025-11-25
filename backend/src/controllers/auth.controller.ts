/**
 * @file Auth Controller
 *
 * 이 파일은 인증(회원가입/로그인/로그아웃/세션조회) API 엔드포인트를 제공합니다.
 *
 * - 라우트 개요
 *   - GET    /auth/me        : 세션 로그인 상태 조회 (항상 200, 로그인 전이면 user = null)
 *   - POST   /auth/register  : 회원가입 → 성공 시 세션에 사용자 저장 (세션 재생성으로 고정화 공격 방지)
 *   - POST   /auth/login     : 로그인(자격 검증) → 성공 시 세션에 사용자 저장 (세션 재생성 적용)
 *   - POST   /auth/logout    : 로그아웃(세션 파괴 + 쿠키 정리, 멱등)
 *
 * 전반 흐름(중요)
 * 1) 프론트엔드가 이메일/비밀번호로 /auth/register 또는 /auth/login 호출
 * 2) 서비스 레이어(auth.service)에서 사용자 생성/검증
 * 3) 컨트롤러가 **세션 재생성(regenerate)** 후 `req.session.user`에 공개 사용자 정보 저장
 * 4) 프론트는 이후 요청에서 세션 쿠키를 함께 보내며, /auth/me로 자신의 상태를 확인
 *
 * 세션/쿠키 주의
 * - CORS 환경에서는 서버의 `cors({ origin, credentials: true })`와
 *   프론트의 `fetch(..., { credentials: 'include' })` 또는 Axios의 `withCredentials: true`
 *   설정이 반드시 필요합니다.
 * - 프록시/도메인 설정에 따라 `cookie`의 `domain`, `sameSite`, `secure`를 운영 환경에서 조정하세요.
 *
 * 현재 저장소
 * - DB(Prisma) 연동 버전으로 가정합니다. (팀 상황에 따라 인메모리 저장을 사용할 수도 있음)
 * - DB 스키마/비밀번호 해시는 service 레이어가 책임지며,
 *   컨트롤러는 세션 및 응답 포맷만 담당합니다.
 */

import { Request, Response } from 'express';
import { createUser, verifyCredentials } from '../services/auth.service';

/** ──────────────────────────────────────────────────────────────────────
 *  타입 정의 (팀원 이해용 설명 주석)
 *
 *  - PublicUser: 클라이언트/세션에 저장되는 공개 가능한 최소 사용자 정보
 *  - UserLike  : 서비스 레이어에서 넘어오는 원시 사용자(이름/역할이 null일 수 있음)
 *
 *  ⚠️ 비밀번호/해시 등 민감정보는 절대 포함하지 않습니다.
 *  ──────────────────────────────────────────────────────────────────────
 */

/** 세션/응답에 저장될 공개 사용자 타입 (널 없는 보장된 값) */
type PublicUser = {
  id: string | number;
  email: string;
  name: string;
  role: string;
} & Record<string, any>;

/** 서비스에서 넘어오는 원시 사용자 타입(이름/역할이 null일 수 있음) */
type UserLike = {
  id: string | number;
  email: string;
  name?: string | null;
  role?: string | null;
} & Record<string, any>;

/**
 * 비밀번호/해시 등 민감정보를 제거하고
 * 프론트로 내려보낼 **안전한 사용자 객체**로 변환하는 함수입니다.
 *
 * - name 이 없으면 email 앞부분을 name 으로 사용
 * - role 기본값은 'user'
 *
 * 사용 이유:
 * 1) DB 레코드에는 passwordHash 등 민감정보가 포함될 수 있으므로,
 * 2) 컨트롤러는 항상 "안전한(민감정보 제거된) 구조"로만 프론트에 응답하기 위해
 *    이 변환을 거치도록 강제합니다.
 */
const toPublicUser = (u?: UserLike | null): PublicUser | null => {
  if (!u) return null;

  return {
    id: u.id,
    email: u.email,
    // 이름이 없으면 이메일의 @ 앞부분을 기본 닉네임으로 사용
    name:
      typeof u.name === 'string' && u.name.length
        ? u.name
        : (u.email?.split?.('@')?.[0] ?? ''),
    // 역할 정보가 없으면 기본값 'user'
    role: (u.role ?? 'user') as string,
  };
};

/**
 * 간단 이메일 형식 체크(백엔드 최소 유효성)
 *
 * - 프론트에서도 유효성 검사를 하더라도,
 *   백엔드에서 한 번 더 방어적으로 검사하는 것이 안전합니다.
 */
const isValidEmail = (email?: string) =>
  typeof email === 'string' && /.+@.+\..+/.test(email);

// ────────────────────────────────────────────────────────────────────────
//  GET /auth/me : 현재 세션 로그인 상태 조회
// ────────────────────────────────────────────────────────────────────────

/**
 * GET /auth/me
 *
 * 현재 세션의 로그인 상태를 반환합니다.
 * 로그인 전이라면 { ok: true, authenticated: false, user: null } 로 200 응답합니다.
 *
 * 예시 응답(로그인 전):
 *  { ok: true, authenticated: false, user: null }
 *
 * 예시 응답(로그인 후):
 *  { ok: true, authenticated: true, user: { id, email, name, role } }
 */
export const me = (req: Request, res: Response) => {
  // (선택) 인증 미들웨어가 req.currentUser 를 주입했다면 우선 사용,
  // 그렇지 않다면 세션에 저장된 user 사용
  const sess = (req as any).session as { user?: PublicUser } | undefined;
  const current = (req as any).currentUser ?? sess?.user ?? null;
  const user = toPublicUser(current);

  return res.status(200).json({
    ok: true,
    authenticated: !!user,
    user,
  });
};

// ────────────────────────────────────────────────────────────────────────
//  POST /auth/register : 회원가입
// ────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 *
 * body: { email: string, password: string, name?: string }
 * 성공 시 세션에 user 저장 후 201 반환
 *
 * 보안 포인트:
 * - 세션 고정화 방지(session fixation): 가입 직후 `req.session.regenerate()`로 세션ID 재발급.
 * - name 값이 비어있으면 이메일 앞부분을 기본 표시명으로 사용.
 */
export const register = async (req: Request, res: Response) => {
  // 기본적인 파라미터 파싱 및 공백/형 변환
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');
  const name = (req.body?.name as string | undefined)?.trim();

  // 이메일 혹은 비밀번호가 비어 있으면 400
  if (!isValidEmail(email) || !password) {
    return res
      .status(400)
      .json({ ok: false, error: 'email and password are required' });
  }

  // express-session 으로 주입되는 객체.
  // 이 값이 없다면 서버 쪽에서 세션 미들웨어 설정 누락, CORS 설정 문제일 수 있음.
  const sess = (req as any).session as
    | {
        user?: PublicUser;
        regenerate?: (cb: (err?: any) => void) => void;
      }
    | undefined;

  if (!sess) {
    return res
      .status(501)
      .json({ ok: false, error: 'Session middleware not configured on server' });
  }

  try {
    // 서비스 레이어: 이미 존재하는 이메일이면 에러 throw (409/duplicate)
    const created = await createUser(
      email,
      password,
      name && name.length ? name : email.split('@')[0],
    );

    // 세션 고정화 방지: 가입 시 세션을 재생성한 뒤 user를 세팅
    sess.regenerate?.((regenErr) => {
      if (regenErr) {
        return res
          .status(500)
          .json({ ok: false, error: 'Failed to start session' });
      }

      // 세션에 공개 가능한 사용자 정보 저장
      (req as any).session.user = toPublicUser(created)!;

      return res.status(201).json({
        ok: true,
        user: (req as any).session.user,
      });
    });

    // regenerate 가 없는 환경(메모리스토어 등)에서는 재생성 없이 바로 세팅
    if (!sess.regenerate) {
      (req as any).session.user = toPublicUser(created)!;

      return res.status(201).json({
        ok: true,
        user: (req as any).session.user,
      });
    }
  } catch (err: any) {
    const message = String(err?.message || '');

    // 이메일 중복 에러 패턴 (서비스 레이어에서 던지는 메시지 기준으로 추정)
    if (/exist/i.test(message) || /duplicate/i.test(message) || /409/.test(message)) {
      return res
        .status(409)
        .json({ ok: false, error: 'Email already registered' });
    }

    // 그 외 모든 에러는 500 (내부 서버 오류)
    return res.status(500).json({ ok: false, error: 'Registration failed' });
  }
};

// ────────────────────────────────────────────────────────────────────────
//  POST /auth/login : 로그인
// ────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 *
 * body: { email: string, password: string }
 * 성공 시 세션에 user 저장 후 200 반환
 *
 * 보안 포인트:
 * - 세션 고정화 방지(session fixation): 로그인 직후 `req.session.regenerate()`로 세션ID 재발급.
 * - 인증 실패 시(자격 불일치) 401, 기타 서버 오류 500.
 */
export const login = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');

  // 이메일/비밀번호 유효성 체크 (기본 수준)
  if (!isValidEmail(email) || !password) {
    return res
      .status(400)
      .json({ ok: false, error: 'email and password required' });
  }

  const sess = (req as any).session as
    | {
        user?: PublicUser;
        regenerate?: (cb: (err?: any) => void) => void;
      }
    | undefined;

  if (!sess) {
    return res
      .status(501)
      .json({ ok: false, error: 'Session middleware not configured on server' });
  }

  try {
    // 서비스 레이어에서 이메일/비밀번호 검증 → 실패 시 null 반환
    const u = await verifyCredentials(email, password);
    if (!u) {
      // 자격 증명 실패 → 401 Unauthorized
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    // 세션 고정화 방지: 로그인 시 세션 재생성
    sess.regenerate?.((regenErr) => {
      if (regenErr) {
        return res
          .status(500)
          .json({ ok: false, error: 'Failed to start session' });
      }

      (req as any).session.user = toPublicUser(u)!;

      return res.status(200).json({
        ok: true,
        user: (req as any).session.user,
      });
    });

    // regenerate 없는 환경일 경우 즉시 세팅
    if (!sess.regenerate) {
      (req as any).session.user = toPublicUser(u)!;

      return res.status(200).json({
        ok: true,
        user: (req as any).session.user,
      });
    }
  } catch {
    // 서비스/DB 예외 등 기타 서버 내부 오류
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
};

// ────────────────────────────────────────────────────────────────────────
//  POST /auth/logout : 로그아웃
// ────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/logout
 *
 * 세션을 파괴하고 세션 쿠키를 제거합니다. (멱등적: 여러 번 호출해도 항상 ok:true)
 *
 * 운영 팁:
 * - 리버스 프록시/도메인 구성에 따라 `res.clearCookie` 의 옵션(domain/sameSite/secure)
 *   조정이 필요할 수 있습니다.
 * - 프론트는 로그아웃 후 즉시 클라이언트 상태(zustand/recoil 등)도 초기화하세요.
 */
export const logout = (req: Request, res: Response) => {
  const sess = (req as any).session as
    | {
        destroy: (cb: (err?: any) => void) => void;
      }
    | undefined;

  // 세션이 없다면 쿠키만 정리하고 성공 처리
  // (서버 설정에 따라 세션 미들웨어가 없을 수도 있으므로 방어 로직)
  if (!sess) {
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });

    return res.status(200).json({ ok: true });
  }

  // 세션이 있다면 안전하게 파괴
  sess.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ ok: false, error: 'Failed to destroy session' });
    }

    // 주요 세션 쿠키 제거 (실제 키 이름은 서버 설정에 맞춰 조정 가능)
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });

    return res.status(200).json({ ok: true });
  });
};