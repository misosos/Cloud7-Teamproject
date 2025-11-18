/**
 * Auth Controller (초기 세팅용)
 * ------------------------------------------------------
 * 역할: 세션 쿠키 기반의 간단한 인증 API 집합입니다.
 *  - GET    /auth/me      : 현재 로그인 사용자 조회 (부팅 시 확인)
 *  - POST   /auth/login   : 로그인 (데모 계정 검증)
 *  - POST   /auth/logout  : 로그아웃 (세션 파기 + 쿠키 제거)
 *
 * 팀원을 위한 간단 설명:
 *  - 이 서버는 로그인 성공 시 서버 메모리/스토어에 "세션"을 만들고,
 *    브라우저에 세션ID가 담긴 쿠키(sid)를 내려보냅니다.
 *  - 이후 요청마다 브라우저는 쿠키를 자동으로 보내고, 서버는 그 쿠키로
 *    누가 보냈는지 식별하여 req.session.user에 사용자 정보를 보관합니다.
 *  - 프론트는 "Zustand"에 user만 저장하고, isLoggedIn = !!user 로 파생해 씁니다.
 *
 * 현재 상태(데모):
 *  - 실제 DB 대신 `verifyDemoUser()`로 하드코딩된 데모 계정을 확인합니다.
 *  - 추후 실제 로그인 붙일 때, 이 부분을 DB 조회/비밀번호 해시검증으로 교체하면 됩니다.
 *
 * 보안/쿠키 옵션 참고:
 *  - 쿠키 이름은 'sid' (server.ts의 express-session 설정과 동일해야 함)
 *  - 프로덕션(배포)에서는 `sameSite: 'none'`, `secure: true`로 설정하여
 *    다른 도메인(예: 프론트: Vercel, 백엔드: Render) 간 쿠키가 전송되도록 합니다.
 *  - 로컬 개발에서는 sameSite: 'lax', secure: false 로 동작합니다.
 */

import { Request, Response } from 'express'; // Express가 제공하는 요청/응답 타입
import { verifyDemoUser, DEMO_USER } from '../services/auth.service'; // 데모 유저 검증 함수/상수(설명용)

/**
 * GET /auth/me
 * - 프론트 부팅 시 실행: "이미 로그인된 상태인지"를 확인합니다.
 * - 세션에 user가 있으면 그대로 반환, 없으면 401(로그인 필요) 응답.
 */
export const me = (req: Request, res: Response) => {
  // req.session.user는 로그인에 성공했을 때 서버가 저장해 둔 현재 사용자 정보입니다.
  if (req.session.user) return res.json({ user: req.session.user });
  return res.status(401).json({ error: 'UNAUTHENTICATED' }); // 아직 로그인되지 않음
};

/**
 * POST /auth/login
 * - body: { email: string, password: string }
 * - 데모 계정을 검증하고 성공 시 req.session.user에 저장, 이후 요청부터 인증됨.
 * - 실제 구현에서는 DB 조회 + 비밀번호 해시 비교(bcrypt 등)로 교체합니다.
 */
export const login = (req: Request, res: Response) => {
  // 프론트에서 JSON으로 { email, password }를 보냅니다.
  const { email, password } = req.body ?? {};

  // 데모 검증: 이메일/비밀번호가 맞으면 사용자 객체를, 아니면 null/undefined를 돌려줍니다.
  const user = verifyDemoUser(email, password);
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' }); // 계정 정보 불일치

  // 로그인 성공: 현재 요청의 세션에 사용자 정보를 저장합니다.
  // 세션 미들웨어가 응답에 쿠키(sid)를 내려보내고, 브라우저는 이를 저장합니다.
  req.session.user = user;
  return res.json({ user });
};

/**
 * POST /auth/logout
 * - 현재 세션을 파기하고 브라우저의 세션 쿠키(sid)도 제거합니다.
 * - 쿠키 제거 옵션은 server.ts(세션 설정)과 동일하게 맞춰야 제대로 지워집니다.
 */
export const logout = (req: Request, res: Response) => {
  // 배포 환경에서는 sameSite/secure가 다르므로 분기합니다.
  const PROD = process.env.NODE_ENV === 'production';

  // 서버 쪽 세션 데이터를 먼저 파기합니다.
  req.session.destroy(() => {
    // 클라이언트(브라우저)에 있는 세션 쿠키도 삭제합니다.
    // sameSite/secure 옵션은 생성 시와 동일해야 삭제가 확실히 이뤄집니다.
    res.clearCookie('sid', {
      httpOnly: true, // JS로 접근 불가 (XSS 완화)
      sameSite: PROD ? 'none' : 'lax', // 크로스 사이트 전송 허용(배포 시)
      secure: PROD, // HTTPS에서만 쿠키 전송(배포 시)
    });
    res.json({ ok: true });
  });
};