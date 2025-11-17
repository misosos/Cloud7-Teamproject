// frontend/src/store/auth.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import apiClient from "@/services/apiClient";

/**
 * 🔐 전역 인증 Store (useAuth)
 * ─────────────────────────────────────────────────────────────────────
 * - 서버 세션/쿠키 인증을 기본으로 가정 (프론트는 user만 저장)
 * - isLoggedIn은 user 파생(!!user)
 * - 앱 부팅 시 /auth/me로 세션 존재 확인 → ready로 초기 깜빡임 제어
 * - 로컬스토리지에는 user/token만 저장(partialize)
 * - bootstrap 재호출/루프 방지용 bootstrapping 플래그 추가
 * - persist onRehydrateStorage로 복원 완료 시 파생값 재계산 + ready=true
 */

export type User = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  /** 하이드레이션/부팅 체크 완료 플래그 */
  ready: boolean;
  /** 파생 로그인 상태: !!user */
  isLoggedIn: boolean;
  /** 로그인 사용자 (없으면 null) */
  user: User | null;
  /** 액세스 토큰(옵션, 세션쿠키면 null 유지 가능) */
  token: string | null;
  /** 부팅 중 중복 호출 방지 */
  bootstrapping: boolean;

  /** 앱 부팅 시 세션 확인 → user 세팅 → ready=true */
  bootstrap: () => Promise<void>;
  /** 로그인 후 상태 반영 (세션이면 token 없이 user만 넣어도 됨) */
  login: (payload: { user: User; token?: string | null }) => void;
  /** 로그아웃: 상태 초기화 + 로컬 키 정리 (서버 /auth/logout은 화면/서비스에서 호출) */
  logout: () => void;
  /** /auth/me 응답으로 user만 갱신할 때 유용 */
  setUser: (user: User | null) => void;
};

const initialAuth: Pick<
  AuthState,
  "ready" | "isLoggedIn" | "user" | "token" | "bootstrapping"
> = {
  ready: false,
  isLoggedIn: false,
  user: null,
  token: null,
  bootstrapping: false,
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialAuth,

      /**
       * 앱 첫 진입 시 세션 존재 여부 확인
       * - 성공: { user } 수신 → 로그인 상태로 전환
       * - 실패/401: 비로그인 상태 + ready=true
       * - 재호출/루프 방지: ready/bootstrapping 가드
       */
      bootstrap: async () => {
        const { ready, bootstrapping } = get();
        if (ready || bootstrapping) return;
        set({ bootstrapping: true });
        try {
          // apiClient.get는 AxiosResponse가 아니라 "data 본문"을 직접 반환하는 어댑터라고 가정
          type MeResponse = { user: User | null };
          const me = (await apiClient.get("/auth/me", {
            withCredentials: true,
          })) as MeResponse;
          const user: User | null = me?.user ?? null;
          set({ user, isLoggedIn: !!user, ready: true, bootstrapping: false });
        } catch {
          set({
            user: null,
            isLoggedIn: false,
            ready: true,
            bootstrapping: false,
          });
        }
      },

      /**
       * 로그인 직후 화면에서 호출(선호하는 방식으로 사용)
       * - (세션쿠키 방식) 서버가 세션만 세팅 → 응답 user가 있으면 그걸 저장, 없으면 /auth/me로 확인
       * - (JWT 방식) token도 함께 저장 가능
       */
      login: ({ user, token = null }) =>
        set({
          user,
          token,
          isLoggedIn: !!user, // user 파생
          ready: true,
        }),

      /**
       * 로컬 상태 정리(서버 세션 종료는 서비스/화면 단에서 /auth/logout 호출)
       * - ready는 true로 유지해 부팅 루프 방지
       */
      logout: () => {
        set({ ...initialAuth, ready: true });
        try {
          localStorage.removeItem("auth-v2");
          localStorage.removeItem("auth-storage"); // 구버전 잔여값 정리
        } catch {}
      },

      setUser: (user) =>
        set({
          user,
          isLoggedIn: !!user, // 파생 갱신
        }),
    }),
    {
      name: "auth-v2",
      storage: createJSONStorage(() => localStorage),
      // 저장은 user/token만 (isLoggedIn/ready/bootstrapping은 파생/런타임)
      partialize: (s) => ({ user: s.user, token: s.token }),
      /**
       * persist 복원 완료 시: 파생값 재계산 + ready=true
       * - 하이드레이션 타이밍에 한 번만 실행되므로 안전
       */
      onRehydrateStorage: () => (state) => {
        const user = state?.user ?? null;
        useAuth.setState({
          isLoggedIn: !!user,
          ready: true,
        });
      },
    }
  )
);

/** ✅ 안전한 primitive selector들을 외부에서 사용하세요(객체 selector 금지 권장) */
export const selectReady = (s: AuthState) => s.ready;
export const selectIsLoggedIn = (s: AuthState) => s.isLoggedIn;
export const selectUser = (s: AuthState) => s.user;
export const selectBootstrap = (s: AuthState) => s.bootstrap;
export const selectLogout = (s: AuthState) => s.logout;
export const selectLogin = (s: AuthState) => s.login;

/** 모듈 최초 로드시 1차 보정(SSR/초기 깜빡임 완화) */
try {
  const { user } = useAuth.getState();
  if (user) useAuth.setState({ isLoggedIn: true });
} catch {}