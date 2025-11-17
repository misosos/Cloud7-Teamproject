import { Request, Response } from 'express';

/**
 * Auth Controller (개발용 간이 구현)
 *
 * - GET /auth/me  : 세션 로그인 상태를 "항상 200"으로 응답 (authenticated 플래그 제공)
 * - POST /auth/login  : 데모 로그인(세션에 사용자 저장)
 * - POST /auth/logout : 세션 파괴 및 쿠키 삭제
 *
 * 프론트 부트스트랩 시 401 스팸/무한루프를 방지하기 위해 /auth/me는
 * 로그인 전에도 200으로 { authenticated: false, user: null }을 반환합니다.
 */

/**
 * GET /auth/me
 * 현재 세션에 저장된 사용자 정보를 반환합니다.
 * 로그인 전이라면 authenticated=false, user=null 로 200 응답합니다.
 */
export const me = (req: Request, res: Response) => {
  const sess: any = (req as any).session;
  const user = sess?.user ?? null;

  return res.status(200).json({
    ok: true,
    authenticated: !!user,
    user, // 로그인 전이면 null
  });
};

/**
 * POST /auth/login
 * 초기 세팅용 플레이스홀더 로그인 핸들러입니다.
 * 실제 인증 로직(비밀번호 검증/DB 조회)은 이후에 구현하며, 지금은 세션에 user를 넣어 연결만 확인합니다.
 * body: { email, password }
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = (req.body ?? {}) as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'email and password required' });
  }

  const sess: any = (req as any).session;
  if (!sess) {
    // express-session 미들웨어가 아직 설정되지 않은 경우 친절한 에러 반환
    return res.status(501).json({ ok: false, error: 'Session middleware not configured on server' });
  }

  // TODO: 실제 구현 시 DB 조회 및 패스워드 검증 후 user 생성
  const user = { id: 'demo-1', email, name: 'Demo User', role: 'user' as const };
  sess.user = user;

  return res.status(200).json({ ok: true, user });
};

/**
 * POST /auth/logout
 * 세션을 파괴하고 세션 쿠키를 제거합니다.
 * 세션 미들웨어가 없어도 멱등적으로 ok:true 를 반환합니다.
 */
export const logout = (req: Request, res: Response) => {
  const sess: any = (req as any).session;

  // 세션 미들웨어가 없거나 세션이 없으면 쿠키만 정리 시도 후 성공 처리
  if (!sess) {
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });
    return res.status(200).json({ ok: true });
  }

  sess.destroy((err: any) => {
    if (err) {
      return res.status(500).json({ ok: false, error: 'Failed to destroy session' });
    }
    // 세션 쿠키 제거 (미들웨어에서 name:'sid'를 쓰든 기본 connect.sid 를 쓰든 둘 다 제거 시도)
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });
    return res.status(200).json({ ok: true });
  });
};