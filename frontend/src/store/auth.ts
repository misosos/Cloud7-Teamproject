// frontend/src/store/auth.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import apiClient from "@/services/apiClient";

// 로컬스토리지 키를 상수로 관리
const PERSIST_KEY = "auth-v2";

/**
 * 🔐 전역 인증 Store (useAuth)
 * ─────────────────────────────────────────────────────────────────────
 * - 서버 세션/쿠키 인증을 기본으로 가정 (프론트는 user만 저장)
 * - isLoggedIn은 user 파생(!!user)
 * - 앱 부팅 시 /auth/me로 세션 존재 확인 → ready로 초기 깜빡임 제어
 * - 로컬스토리지에는 user/token만 저장(partialize)
 * - bootstrap 재호출/루프 방지용 bootstrapping 플래그 + 변경 없을 땐 set 최소화
 * - persist onRehydrateStorage에서 파생값 재계산 + ready=true (필요할 때만)
 *
 * ⚠️ 무한 렌더/루프 방지를 위해:
 *  - 컴포넌트에선 반드시 primitive selector(ready, isLoggedIn, user 등 개별 값)만 구독하세요.
 *  - useAuth(s =&gt; s)처럼 전체 객체를 구독하면 snapshot이 매 렌더마다 새로 생성되어 경고가 발생할 수 있습니다.
 */

// ===== 타입 =====
export type User = {
  id: string | number;
  email: string;
  name?: string | null;
  role?: string | null;
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
  /** (호환용) setSession: login과 동일 동작 */
  setSession: (payload: { user: User; token?: string | null }) => void;
  /** 로그인 API를 직접 호출하고 상태까지 세팅 (편의 메서드) */
  loginWithCredentials: (email: string, password: string) => Promise<User | null>;
  /** 회원가입 API를 직접 호출하고 상태까지 세팅 (편의 메서드) */
  registerWithCredentials: (email: string, password: string, name?: string) => Promise<User | null>;
  /** 로그아웃: 상태 초기화 + 로컬 키 정리 (서버 /auth/logout은 화면/서비스에서 호출) */
  logout: () => void;
  /** /auth/me 응답으로 user만 갱신할 때 유용 */
  setUser: (user: User | null) => void;
};

// ===== 내부 유틸 =====
const sameUser = (a: User | null | undefined, b: User | null | undefined) =>
  (!a && !b) ||
  (!!a &&
    !!b &&
    String(a.id) === String(b.id) &&
    a.email === b.email &&
    (a.name ?? null) === (b.name ?? null) &&
    (a.role ?? null) === (b.role ?? null));

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

// ===== Store =====
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialAuth,

      /**
       * 앱 첫 진입 시 세션 존재 여부 확인
       * - 성공: { user } 수신 → 로그인 상태로 전환
       * - 실패/401: 비로그인 상태 + ready=true
       * - 재호출/루프 방지: ready/bootstrapping 가드
       * - 변경 없으면 set 최소화(불필요한 리렌더 감소)
       */
      bootstrap: async () => {
        const { ready, bootstrapping, user: prevUser, isLoggedIn: prevIsLoggedIn } = get();
        if (ready || bootstrapping) return;

        set({ bootstrapping: true });

        try {
          // apiClient.get는 "본문 data"를 직접 반환하는 어댑터라고 가정
          type MeResponse = { ok?: boolean; user?: User | null };
          const me = (await apiClient.get("/auth/me")) as MeResponse;

          const nextUser: User | null = me?.user ?? null;
          const nextIsLoggedIn = !!nextUser;

          // 사용자/로그인 상태가 이전과 동일하면 최소 변경만 반영
          if (sameUser(prevUser, nextUser) && prevIsLoggedIn === nextIsLoggedIn) {
            set({ ready: true, bootstrapping: false });
          } else {
            set({
              user: nextUser,
              isLoggedIn: nextIsLoggedIn,
              ready: true,
              bootstrapping: false,
            });
          }
        } catch {
          // 401/네트워크 등 → 비로그인 상태로 간주
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
       * - (세션쿠키 방식) 서버가 세션만 세팅 → 응답 user 저장
       * - (JWT 방식) token도 함께 저장 가능
       */
      login: ({ user, token = null }) => {
        const nextIsLoggedIn = !!user;
        set({
          user,
          token,
          isLoggedIn: nextIsLoggedIn,
          ready: true,
        });
      },

      /**
       * 편의 메서드: 백엔드 로그인 API와 전역 상태 세팅을 한 번에
       * - 성공 시 user 저장 + ready=true
       * - 실패 시 null 반환(에러는 상위에서 핸들)
       */
      loginWithCredentials: async (email, password) => {
        try {
          const res = await apiClient.post("/auth/login", { email, password });
          // services/auth.ts가 { user } 또는 { data: { user } } 등으로 반환하는 케이스를 모두 허용
          const user = (res as any)?.user ?? (res as any)?.data?.user ?? null;
          if (user) {
            set({ user, token: null, isLoggedIn: true, ready: true });
            return user as User;
          }
          return null;
        } catch {
          return null;
        }
      },

      /**
       * 편의 메서드: 백엔드 회원가입 API와 전역 상태 세팅을 한 번에
       * - 성공 시 user 저장 + ready=true
       */
      registerWithCredentials: async (email, password, name) => {
        try {
          const res = await apiClient.post("/auth/register", { email, password, name });
          const user = (res as any)?.user ?? (res as any)?.data?.user ?? null;
          if (user) {
            set({ user, token: null, isLoggedIn: true, ready: true });
            return user as User;
          }
          return null;
        } catch {
          return null;
        }
      },

      setSession: ({ user, token = null }) => {
        const nextIsLoggedIn = !!user;
        set({
          user,
          token,
          isLoggedIn: nextIsLoggedIn,
          ready: true,
        });
      },

      /**
       * 로컬 상태 정리(서버 세션 종료는 서비스/화면 단에서 /auth/logout 호출)
       * - ready는 true로 유지해 부팅 루프 방지
       */
      logout: () => {
        set({ ...initialAuth, ready: true });
        try {
          localStorage.removeItem(PERSIST_KEY);
          localStorage.removeItem("auth-storage"); // 구버전 잔여값 정리
        } catch {
          /* noop */
        }
      },

      setUser: (user) =>
        set((prev) =>
          sameUser(prev.user, user)
            ? prev
            : {
                user,
                isLoggedIn: !!user, // 파생 갱신
              }
        ),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      // 저장은 user/token만 (isLoggedIn/ready/bootstrapping은 파생/런타임)
      partialize: (s) => ({ user: s.user, token: s.token }),
      /**
       * persist 복원 완료 시: 파생값 재계산 + ready=true
       * - 상태가 이미 동일하면 set 생략 → 불필요한 리렌더 방지
       */
      onRehydrateStorage: () => (state) => {
        const hydratedUser = state?.user ?? null;
        const curr = useAuth.getState();
        const needSet =
          !sameUser(curr.user, hydratedUser) || curr.ready === false || curr.isLoggedIn !== !!hydratedUser;

        if (needSet) {
          useAuth.setState({
            user: hydratedUser,
            isLoggedIn: !!hydratedUser,
            ready: true,
          });
        } else {
          // 값 동일: ready 보정만 보수적으로 수행
          if (!curr.ready) useAuth.setState({ ready: true });
        }
      },
      // (선택) 버전 마이그레이션 훅 자리
      // version: 1,
      // migrate: async (persisted, version) => persisted,
    }
  )
);

// ===== Selector (primitive만 노출하여 안정성 확보) =====
export type { AuthState };
export const selectReady = (s: AuthState) => s.ready;
export const selectIsLoggedIn = (s: AuthState) => s.isLoggedIn;
export const selectUser = (s: AuthState) => s.user;
export const selectBootstrap = (s: AuthState) => s.bootstrap;
export const selectLogout = (s: AuthState) => s.logout;
export const selectLogin = (s: AuthState) => s.login;
export const selectSetSession = (s: AuthState) => s.setSession;
export const selectLoginWithCredentials = (s: AuthState) => s.loginWithCredentials;
export const selectRegisterWithCredentials = (s: AuthState) => s.registerWithCredentials;

/**
 * 모듈 최초 로드시 1차 보정(SSR/초기 깜빡임 완화)
 * - 저장소에서 이미 user가 있었다면 isLoggedIn만 즉시 true로 맞춤
 * - setState 호출은 필요시에만 수행
 */
try {
  const { user, isLoggedIn } = useAuth.getState();
  if (user && !isLoggedIn) useAuth.setState({ isLoggedIn: true });
} catch {
  /* noop (예: SSR) */
}

// ==== Helper Hooks (primitive selector 합성: 무한 루프/경고 방지) ====
export const useAuthSession = () => {
  const ready = useAuth(selectReady);
  const isLoggedIn = useAuth(selectIsLoggedIn);
  const user = useAuth(selectUser);
  return { ready, isLoggedIn, user };
};

// ===== Helper Hooks (권장: 컴포넌트에서 이들만 사용하여 무한 루프 방지) =====
export const useAuthReady = () => useAuth(selectReady);
export const useAuthLoggedIn = () => useAuth(selectIsLoggedIn);
export const useAuthUser = () => useAuth(selectUser);
export const useAuthBootstrap = () => useAuth(selectBootstrap);
export const useAuthLogout = () => useAuth(selectLogout);
export const useAuthLogin = () => useAuth(selectLogin);
export const useAuthSetSession = () => useAuth(selectSetSession);
export const useAuthLoginWithCredentials = () => useAuth(selectLoginWithCredentials);
export const useAuthRegisterWithCredentials = () => useAuth(selectRegisterWithCredentials);
