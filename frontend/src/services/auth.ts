// src/services/auth.ts
import { httpGet, httpPost } from "./apiClient";

export type User = {
  id: string;
  email: string;
  name?: string;
};

type Ok<T> = { ok: true; } & T;

export async function me(): Promise<User> {
  const res = await httpGet<Ok<{ user: User }>>("/auth/me");
  return res.user;
}

export async function login(body: { email: string; password: string }): Promise<User> {
  const res = await httpPost<Ok<{ user: User }>>("/auth/login", body);
  return res.user;
}

export async function signup(body: { email: string; password: string }): Promise<User> {
  const res = await httpPost<Ok<{ user: User }>>("/auth/signup", body);
  return res.user;
}

export async function logout(): Promise<void> {
  await httpPost<Ok<{}>>("/auth/logout");
}