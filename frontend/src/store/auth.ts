import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * 🔐 전역 인증 상태 Store (useAuth)
 * ─────────────────────────────────────────────────────────
 * 백엔드 연동 시에도 그대로 재사용 가능한 형태로 정리했습니다.
 * - 로컬스토리지에는 **user / token 만 부분 저장**(isLoggedIn은 매번 파생)
 * - 앱 시작 시 persist 복원 후, **user && token** 존재 시 isLoggedIn=true 로 재계산
 * - 과거 잔여값 이슈 방지 위해 저장 키를 `auth-v2` 로 변경
 * - 로그아웃 시 구 키(`auth-storage`)까지 함께 제거(안전)
 *
 * ※ 실서비스에선 토큰을 httpOnly 쿠키(서버 세션)로 관리하는 걸 권장합니다.
 *   이 경우 token 필드는 빈 문자열/ null 이어도 되고,
 *   로그인 성공 시 서버에서 세션만 세팅하고, 프론트는 /auth/me 응답의 user 로 상태를 갱신하세요.
 */

// ▸ 사용자 정보 형태(아이디/이름/이메일)
export type User = {
  id: string;
  name: string;
  email: string;
};

// ▸ 전역 인증 상태와 메서드 정의
export type AuthState = {
  /** 현재 로그인 여부 (파생 값: user && token 존재 여부) */
  isLoggedIn: boolean;
  /** 로그인한 사용자 정보 (없으면 null) */
  user: User | null;
  /** 액세스 토큰(JWT 등). 세션 방식이면 null/빈 값 유지 가능 */
  token: string | null;

  /**
   * 로그인 처리 함수
   * - 서버 로그인 성공 후 받은 값을 넣습니다.
   * - 세션/쿠키 방식이면 token 없이 user 만 전달해도 됩니다.
   */
  login: (payload: { user: User; token?: string | null }) => void;

  /** 로그아웃 처리: 상태 초기화 + (옵션) 로컬 스토리지 키 정리 */
  logout: () => void;
};

const initialAuth: Pick<AuthState, "isLoggedIn" | "user" | "token"> = {
  isLoggedIn: false,
  user: null,
  token: null,
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      ...initialAuth,

      // ▸ 로그인: 전달받은 사용자/토큰을 저장하고 isLoggedIn=true로 전환
      login: ({ user, token = null }) =>
        set({
          isLoggedIn: true,
          user,
          token,
        }),

      // ▸ 로그아웃: 인증 상태 초기화 + 구 키까지 정리(안전)
      logout: () => {
        set({ ...initialAuth });
        try {
          localStorage.removeItem("auth-v2");
          localStorage.removeItem("auth-storage"); // 과거 버전 잔여값 정리
        } catch {}
      },
    }),
    {
      // ▸ 새 브라우저 저장 키 (구버전과 분리)
      name: "auth-v2",
      storage: createJSONStorage(() => localStorage),
      // ▸ 저장 범위를 user/token만으로 제한 (isLoggedIn은 저장하지 않음)
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);

/**
 * ✅ persist 복원 완료 시점에 isLoggedIn 파생 값 재계산
 *  - user && token 이 모두 있을 때만 true (세션 방식이면 token 없이 user만으로도 OK하도록 바꾸려면 여기 로직 조절)
 */
(useAuth as any).persist?.onFinishHydration?.(() => {
  const { user, token } = useAuth.getState();
  const authed = !!user && (token === null ? true : !!token);
  useAuth.setState({ isLoggedIn: authed });
});

// 모듈 최초 로드 시 한 번 보정(SSR/초기 깜빡임 최소화)
try {
  const { user, token } = useAuth.getState();
  const authed = !!user && (token === null ? true : !!token);
  if (authed) useAuth.setState({ isLoggedIn: true });
} catch {}

/*
 * ─────────────────────────────────────────────────────────
 * 사용 예시(개발자 참고)
 *
 * // (세션 쿠키 방식) 로그인 성공 후:
 * // 1) 서버가 쿠키로 세션을 세팅
 * // 2) 프론트는 /auth/me 로 user를 받아서 저장
 * useAuth.getState().login({ user: { id: "u1", name: "김미소", email: "miso@example.com" }, token: null });
 *
 * // (JWT 응답 방식) 로그인 성공 후:
 * useAuth.getState().login({ user: { id: "u1", name: "김미소", email: "miso@example.com" }, token: "ACCESS_TOKEN" });
 *
 * // 로그아웃 버튼 클릭 시:
 * useAuth.getState().logout();
 *
 * // 헤더에서 로그인 상태/이메일 표시:
 * const { isLoggedIn, user } = useAuth();
 *
 * // 보호 라우트에서의 사용:
 * const authed = useAuth.getState().isLoggedIn;
 */