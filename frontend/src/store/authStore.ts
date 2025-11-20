import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import apiClient from "@/services/apiClient";

// 로컬스토리지에 저장할 때 사용할 키 이름
const PERSIST_KEY = "auth-v2";

/**
 *  전역 인증 Store (useAuth)
 * ------------------------------------------------------------------
 * 이 스토어는 "로그인 상태"와 관련된 모든 전역 상태를 관리합니다.
 *
 * - 서버는 세션/쿠키 인증을 사용한다고 가정
 * - 프론트에서는 user(사용자 정보)와 token(선택)을 관리
 * - isLoggedIn은 user 존재 여부(!!user)로 자동 계산
 * - 앱 부팅 시 /auth/me 요청으로 세션이 살아있는지 확인 후 ready 플래그 설정
 * - Zustand persist를 사용해 user/token만 로컬스토리지에 저장
 * - 부트스트랩 중복 호출 및 불필요한 렌더를 줄이기 위해 여러 가드 사용
 *
 *  성능/무한 렌더 방지 주의사항
 *  - 컴포넌트에서는 반드시 primitive selector(ready, isLoggedIn, user 등)만 구독하세요.
 *  - useAuth((s) => s)처럼 스토어 전체를 구독하면
 *    매 렌더마다 새로운 객체가 생겨 불필요한 렌더링과 경고가 발생할 수 있습니다.
 */

// ===== 타입 정의 =====
export type User = {
  /** 백엔드에서 내려오는 사용자 ID (숫자/문자열 모두 대응) */
  id: string | number;
  /** 로그인 ID로 사용하는 이메일 */
  email: string;
  /** 화면에 보여줄 이름 (없을 수 있음) */
  name?: string | null;
  /** 권한/역할 정보 (ex. 'admin', 'user' 등, 없을 수 있음) */
  role?: string | null;
};

type AuthState = {
  /** 로그인/세션 체크(부트스트랩 + 하이드레이션)가 끝났는지 여부 (true일 때만 isLoggedIn을 신뢰할 수 있음) */
  ready: boolean;
  /** 로그인 여부 (user 존재 여부로 파생) */
  isLoggedIn: boolean;
  /** 현재 로그인한 사용자 정보 (없으면 null) */
  user: User | null;
  /** 액세스 토큰(선택, 세션 쿠키 방식이면 null 유지 가능) */
  token: string | null;
  /** 부팅 중인지 여부 (중복 bootstrap 호출 방지용 플래그) */
  bootstrapping: boolean;

  /** 앱 첫 진입 시 세션 확인 → user 세팅 → ready=true */
  bootstrap: () => Promise<void>;
  /** 로그인 후 상태 반영 (세션 방식이면 user만, JWT면 token도 함께 세팅) */
  login: (payload: { user: User; token?: string | null }) => void;
  /** (호환용) setSession: login과 같은 역할, 네이밍만 다른 메서드 */
  setSession: (payload: { user: User; token?: string | null }) => void;
  /** 로그인 API를 직접 호출하고 결과를 스토어에 반영하는 편의 메서드 */
  loginWithCredentials: (email: string, password: string) => Promise<User | null>;
  /** 회원가입 API를 직접 호출하고 결과를 스토어에 반영하는 편의 메서드 */
  registerWithCredentials: (email: string, password: string, name?: string) => Promise<User | null>;
  /** 로그아웃 시 스토어 상태 초기화 (서버 /auth/logout 호출은 화면/서비스 단에서 처리) */
  logout: () => void;
  /** /auth/me 응답으로 user만 갱신하는 용도 */
  setUser: (user: User | null) => void;
};

// ===== 내부 유틸 함수 =====
/**
 * 두 user 객체가 "사실상 동일한지" 비교하는 함수
 * - id, email, name, role을 비교
 * - 모두 동일하면 true, 하나라도 다르면 false
 * - null/undefined 모두 "없음"으로 취급
 */
const sameUser = (a: User | null | undefined, b: User | null | undefined) =>
  (!a && !b) ||
  (!!a &&
    !!b &&
    String(a.id) === String(b.id) &&
    a.email === b.email &&
    (a.name ?? null) === (b.name ?? null) &&
    (a.role ?? null) === (b.role ?? null));

/**
 * 스토어 초기 상태
 * - 앱이 처음 로드되면 이 값으로 시작
 */
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

// ===== Zustand Store 정의 =====
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialAuth,

      /**
       * 앱 첫 진입(새로고침 포함) 시 세션 존재 여부 확인
       *
       * 동작 요약:
       *  1. 이미 ready거나, bootstrapping 중이면 아무 작업도 하지 않음
       *  2. /auth/me 호출
       *     - 세션이 살아있으면 user 정보 수신 → 로그인 상태로 세팅
       *     - 세션이 없거나 401 등 에러 → 비로그인 상태로 세팅
       *  3. 이전 상태와 동일하면 최소한으로만 set 호출 → 렌더링 최적화
       */
      bootstrap: async () => {
        const { ready, bootstrapping, user: prevUser, isLoggedIn: prevIsLoggedIn } = get();
        if (ready || bootstrapping) return;

        set({ bootstrapping: true });

        try {
          // /auth/me 응답 형태를 최대한 유연하게 처리
          // 예시 허용 형태:
          // 1) { ok: true, user: { ... } }
          // 2) { ok: true, data: { user: { ... } } }
          // 3) { ok: true, data: { ...userFields } }
          // 4) { id, email, ... } (user 객체 자체)
          const raw = await apiClient.get("/auth/me");

          let nextUser: User | null = null;

          if (raw && typeof raw === "object") {
            const anyRaw = raw as any;

            if ("user" in anyRaw) {
              // { ok, user }
              nextUser = (anyRaw.user ?? null) as User | null;
            } else if ("data" in anyRaw && anyRaw.data && typeof anyRaw.data === "object") {
              const data = anyRaw.data as any;
              if ("user" in data) {
                // { ok, data: { user } }
                nextUser = (data.user ?? null) as User | null;
              } else {
                // { ok, data: { ...userFields } } 라고 가정
                nextUser = data as User;
              }
            } else {
              // 바로 user 객체라고 가정
              nextUser = anyRaw as User;
            }
          }

          const nextIsLoggedIn = !!nextUser;

          // 사용자/로그인 상태가 이전과 동일하면 ready/bootstrapping만 보정
          if (sameUser(prevUser, nextUser) && prevIsLoggedIn === nextIsLoggedIn) {
            set({ ready: true, bootstrapping: false });
          } else {
            // 상태가 달라졌을 때만 실제로 user/isLoggedIn 변경
            set({
              user: nextUser,
              isLoggedIn: nextIsLoggedIn,
              ready: true,
              bootstrapping: false,
            });
          }
        } catch {
          // 401/네트워크 에러 등 어떤 이유든 간에 "비로그인 상태"로 간주
          set({
            user: null,
            isLoggedIn: false,
            ready: true,
            bootstrapping: false,
          });
        }
      },

      /**
       * 로그인 직후(로그인 폼 submit 성공 후 등)에 호출하는 메서드
       *
       * 사용 예:
       *  - 서버가 세션 쿠키만 설정하고 user 정보만 내려줄 때
       *  - 또는 JWT 토큰을 같이 내려줄 때
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
       * 편의 메서드: 로그인 API 요청 + 스토어 업데이트를 한 번에 수행
       *
       * - 성공 시:
       *   - user를 스토어에 저장
       *   - isLoggedIn=true, ready=true
       * - 실패 시:
       *   - null 반환 (에러 토스트 등은 호출한 쪽에서 처리)
       */
      loginWithCredentials: async (email, password) => {
        try {
          const raw = await apiClient.post("/auth/login", { email, password });

          let user: User | null = null;

          if (raw && typeof raw === "object") {
            const anyRaw = raw as any;

            if ("user" in anyRaw) {
              // { ok, user }
              user = (anyRaw.user ?? null) as User | null;
            } else if ("data" in anyRaw && anyRaw.data && typeof anyRaw.data === "object") {
              const data = anyRaw.data as any;
              if ("user" in data) {
                // { ok, data: { user } }
                user = (data.user ?? null) as User | null;
              } else {
                // { ok, data: { ...userFields } } 라고 가정
                user = data as User;
              }
            }
          }

          if (user) {
            set({ user, token: null, isLoggedIn: true, ready: true });
            return user;
          }

          return null;
        } catch {
          // 에러 내용은 상위(컴포넌트/서비스)에서 처리하도록 null만 반환
          return null;
        }
      },

      /**
       * 편의 메서드: 회원가입 API 요청 + 스토어 업데이트를 한 번에 수행
       *
       * - 성공 시:
       *   - 회원가입과 동시에 로그인 상태로 전환하는 UX를 상정
       *   - user를 스토어에 저장하고 isLoggedIn=true, ready=true로 세팅
       */
      registerWithCredentials: async (email, password, name) => {
        try {
          const raw = await apiClient.post("/auth/register", { email, password, name });

          let user: User | null = null;

          if (raw && typeof raw === "object") {
            const anyRaw = raw as any;

            if ("user" in anyRaw) {
              // { ok, user }
              user = (anyRaw.user ?? null) as User | null;
            } else if ("data" in anyRaw && anyRaw.data && typeof anyRaw.data === "object") {
              const data = anyRaw.data as any;
              if ("user" in data) {
                // { ok, data: { user } }
                user = (data.user ?? null) as User | null;
              } else {
                // { ok, data: { ...userFields } } 라고 가정
                user = data as User;
              }
            }
          }

          if (user) {
            set({ user, token: null, isLoggedIn: true, ready: true });
            return user;
          }

          return null;
        } catch {
          return null;
        }
      },

      /**
       * setSession
       *
       * - login과 동일한 기능을 하는 메서드
       * - 이름만 다르게 제공하여, "세션 설정"이라는 의도로도 사용할 수 있음
       */
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
       * 로그아웃 처리
       *
       * - Zustand 스토어 상태를 초기화
       * - 로컬스토리지에 남아 있는 auth 관련 키를 제거
       * - ready는 true로 유지하여 부트스트랩 루프 방지
       * - 실제 서버 세션 종료(/auth/logout)는 화면/서비스 단에서 호출하는 것을 권장
       */
      logout: () => {
        set({ ...initialAuth, ready: true });
        try {
          localStorage.removeItem(PERSIST_KEY);
          // 구 버전에서 사용하던 key까지 함께 제거
          localStorage.removeItem("auth-storage");
        } catch {
          /* 로컬스토리지를 사용할 수 없는 환경(SSR 등)은 조용히 무시 */
        }
      },

      /**
       * user 필드만 부분적으로 갱신할 때 사용하는 메서드
       * - sameUser로 비교해서 변경 사항이 없으면 이전 상태를 그대로 반환
       *   → 불필요한 렌더링 방지
       */
      setUser: (user) =>
        set((prev) =>
          sameUser(prev.user, user)
            ? prev
            : {
                user,
                isLoggedIn: !!user, // user 유무에 맞춰 isLoggedIn도 함께 갱신
              }
        ),
    }),
    {
      // 로컬스토리지 key 이름
      name: PERSIST_KEY,
      // 어떤 스토리지를 쓸지 정의 (여기서는 window.localStorage)
      storage: createJSONStorage(() => localStorage),
      /**
       * 어떤 값만 저장할지 결정
       * - user, token만 저장
       * - ready / isLoggedIn / bootstrapping은 "런타임에서 계산되는 값"이므로 저장하지 않음
       */
      partialize: (s) => ({ user: s.user, token: s.token }),
      /**
       * persist 복원(리하이드레이션) 완료 시 호출되는 훅
       *
       * - 저장된 user 기반으로 isLoggedIn/ready 값을 다시 계산
       * - 현재 스토어 상태와 동일하다면 setState를 생략해 불필요한 렌더링을 줄임
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
          // 값이 완전히 동일하다면 ready 값만 보수적으로 true로 맞춰줌
          if (!curr.ready) useAuth.setState({ ready: true });
        }
      },
      // (선택) 버전 마이그레이션 훅 자리
      // version: 1,
      // migrate: async (persisted, version) => persisted,
    }
  )
);

// ===== Selector (primitive selector만 노출하여 안정성/성능 확보) =====
export type { AuthState };
export const selectReady = (s: AuthState) => s.ready;
export const selectIsLoggedIn = (s: AuthState) => s.isLoggedIn;
export const selectUser = (s: AuthState) => s.user;
export const selectBootstrap = (s: AuthState) => s.bootstrap;
export const selectLogout = (s: AuthState) => s.logout;
export const selectLogin = (s: AuthState) => s.login;
export const selectSetSession = (s: AuthState) => s.setSession;
export const selectLoginWithCredentials = (s: AuthState) => s.loginWithCredentials;
export const selectRegisterWithCredentials = (s: AuthState) =>
  s.registerWithCredentials;

/**
 * 모듈이 최초로 로드될 때 한 번 실행되는 보정 로직
 *
 * - 이미 user는 있는데 isLoggedIn이 false인 경우,
 *   isLoggedIn을 true로 맞춰 초기 깜빡임을 줄여줌
 */
try {
  const { user, isLoggedIn } = useAuth.getState();
  if (user && !isLoggedIn) useAuth.setState({ isLoggedIn: true });
} catch {
  /* SSR 등 window 없는 환경에서 에러가 날 수 있으므로 조용히 무시 */
}

// ==== Helper Hooks (여기 나오는 훅들만 컴포넌트에서 사용하면 가장 안전함) ====
/**
 * ready / isLoggedIn / user를 한 번에 가져오는 편의 훅
 * - 여러 컴포넌트에서 동일하게 쓰는 패턴이 있을 때 유용
 */
export const useAuthSession = () => {
  const ready = useAuth(selectReady);
  const isLoggedIn = useAuth(selectIsLoggedIn);
  const user = useAuth(selectUser);
  return { ready, isLoggedIn, user };
};

// ===== Helper Hooks (권장: 컴포넌트에서 이 훅들만 직접 사용) =====
export const useAuthReady = () => useAuth(selectReady);
export const useAuthLoggedIn = () => useAuth(selectIsLoggedIn);
export const useAuthUser = () => useAuth(selectUser);
export const useAuthBootstrap = () => useAuth(selectBootstrap);
export const useAuthLogout = () => useAuth(selectLogout);
export const useAuthLogin = () => useAuth(selectLogin);
export const useAuthSetSession = () => useAuth(selectSetSession);
export const useAuthLoginWithCredentials = () =>
  useAuth(selectLoginWithCredentials);
export const useAuthRegisterWithCredentials = () =>
  useAuth(selectRegisterWithCredentials);

/**
 * 라우팅/화면 전환 시 사용할 인증 게이트 훅
 *
 * - checking === true 인 동안에는 "아직 로그인 체크 중" 상태
 *   → 이때는 로그인 전/후 화면 대신 로딩 스피너나 깜빡임 방지용 화면을 보여주는 것이 좋습니다.
 * - checking === false 가 된 이후에만 isLoggedIn 값을 보고
 *   로그인 전/후 화면을 판별하면, 초기 진입시 깜빡이거나
 *   여러 번 로그인 시도해야 되는 문제를 줄일 수 있습니다.
 *
 * 사용 예시:
 *   const { checking, isLoggedIn } = useAuthGate();
 *   if (checking) return <LoadingScreen />;
 *   return isLoggedIn ? <Dashboard /> : <BeforeLogin />;
 */
export const useAuthGate = () => {
  const ready = useAuth(selectReady);
  const isLoggedIn = useAuth(selectIsLoggedIn);
  const bootstrap = useAuth(selectBootstrap);
  const bootstrapping = useAuth((s) => s.bootstrapping);

  // 처음 진입 시, 아직 ready가 아니고 bootstrapping도 아니라면 /auth/me로 세션 동기화 시도
  useEffect(() => {
    if (!ready && !bootstrapping) {
      bootstrap();
    }
  }, [ready, bootstrapping, bootstrap]);

  return {
    // ready가 아니거나 bootstrapping 중이면 "아직 로그인 체크 중"으로 간주
    checking: !ready || bootstrapping,
    isLoggedIn,
  };
};
