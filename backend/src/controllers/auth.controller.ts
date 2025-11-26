/**
 * @file Auth Controller
 * 세션 + 토큰 병행 지원 버전
 */

import { Request, Response } from 'express';
import { createUser, verifyCredentials, findUserById } from '../services/auth.service';
import crypto from "crypto";

// ⭐⭐ NEW: 간단한 토큰 저장소 (DB 없을 경우)
const tokenStore = new Map<string, string | number>();

// ⭐⭐ NEW: 토큰 생성기
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ⭐⭐ NEW: 토큰 저장 / 조회 / 삭제
async function saveToken(userId: string | number, token: string) {
  tokenStore.set(token, userId);
}

async function findUserByToken(token: string) {
  const userId = tokenStore.get(token);
  if (!userId) return null;
  return await findUserById(userId);
}

function deleteToken(token: string) {
  tokenStore.delete(token);
}

//────────────────────────────────────────────
// PublicUser 변환 함수 (기존 그대로)
//────────────────────────────────────────────
type PublicUser = {
  id: string | number;
  email: string;
  name: string;
  role: string;
} & Record<string, any>;

type UserLike = {
  id: string | number;
  email: string;
  name?: string | null;
  role?: string | null;
} & Record<string, any>;

const toPublicUser = (u?: UserLike | null): PublicUser | null => {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name && u.name.length ? u.name : u.email.split("@")[0],
    role: (u.role ?? "user") as string,
  };
};

const isValidEmail = (email?: string) =>
  typeof email === "string" && /.+@.+\..+/.test(email);

//────────────────────────────────────────────
// GET /auth/me (세션 + 토큰 둘 다 지원)
//────────────────────────────────────────────
export const me = async (req: Request, res: Response) => {
  // 🔥 NEW: Authorization 헤더 우선 검사
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.substring(7);
    const user = await findUserByToken(token);
    if (user) {
      return res.status(200).json({
        ok: true,
        authenticated: true,
        user: toPublicUser(user),
      });
    }
  }

  // 🔥 기존 세션 검사
  const sess = (req as any).session;
  const user = sess?.user ? toPublicUser(sess.user) : null;

  return res.status(200).json({
    ok: true,
    authenticated: !!user,
    user,
  });
};

//────────────────────────────────────────────
// POST /auth/register
//────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");
  const name = (req.body?.name as string | undefined)?.trim();

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ ok: false, error: "email and password are required" });
  }

  const sess = (req as any).session;
  if (!sess) {
    return res.status(501).json({ ok: false, error: "Session middleware missing" });
  }

  try {
    const created = await createUser(
      email,
      password,
      name && name.length ? name : email.split("@")[0]
    );

    // ⭐ NEW: 토큰 생성
    const token = generateToken();
    await saveToken(created.id, token);

    // ⭐ 기존 세션 로직 유지
    sess.regenerate?.((err: any) => {
      if (err) return res.status(500).json({ ok: false, error: "Failed to start session" });

      sess.user = toPublicUser(created);

      return res.status(201).json({
        ok: true,
        user: sess.user,
        token, // ⭐⭐ 프론트에서 Zustand에 저장할 token
      });
    });

    if (!sess.regenerate) {
      sess.user = toPublicUser(created);

      return res.status(201).json({
        ok: true,
        user: sess.user,
        token, // ⭐⭐
      });
    }
  } catch (err: any) {
    if (/exist|duplicate|409/i.test(err.message || "")) {
      return res.status(409).json({ ok: false, error: "Email already registered" });
    }
    return res.status(500).json({ ok: false, error: "Registration failed" });
  }
};

//────────────────────────────────────────────
// POST /auth/login
//────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ ok: false, error: "email and password required" });
  }

  const sess = (req as any).session;
  if (!sess) {
    return res.status(501).json({ ok: false, error: "Session middleware missing" });
  }

  try {
    const u = await verifyCredentials(email, password);
    if (!u) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // ⭐ NEW: 토큰 생성
    const token = generateToken();
    await saveToken(u.id, token);

    // ⭐ 기존 세션 유지
    sess.regenerate?.((err: any) => {
      if (err) return res.status(500).json({ ok: false, error: "Failed to start session" });

      sess.user = toPublicUser(u);

      return res.status(200).json({
        ok: true,
        user: sess.user,
        token, // ⭐⭐
      });
    });

    if (!sess.regenerate) {
      sess.user = toPublicUser(u);

      return res.status(200).json({
        ok: true,
        user: sess.user,
        token, // ⭐⭐
      });
    }
  } catch {
    return res.status(500).json({ ok: false, error: "Login failed" });
  }
};

//────────────────────────────────────────────
// POST /auth/logout
//────────────────────────────────────────────
export const logout = (req: Request, res: Response) => {
  const sess = (req as any).session;

  // 🔥 NEW: Authorization 토큰 제거
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.substring(7);
    deleteToken(token);
  }

  if (!sess) {
    res.clearCookie("sid", { path: "/" });
    return res.status(200).json({ ok: true });
  }

  sess.destroy((err: any) => {
    if (err) return res.status(500).json({ ok: false, error: "Fail to destroy session" });

    res.clearCookie("sid", { path: "/" });
    return res.status(200).json({ ok: true });
  });
};
