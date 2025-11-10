import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * 🔐 전역 인증 상태 Store (useAuth)
 * ─────────────────────────────────────────────────────────
 * 목적
 *  - 앱 어디서나 "로그인 여부 + 사용자 정보 + 토큰"을 읽고/바꾸기 위한 전역 저장소입니다.
 *  - Zustand + persist 미들웨어로 브라우저 저장소(localStorage)에 **일부 상태만** 저장합니다.
 *    → 새로고침/재접속 시에도 사용자/토큰은 복원되지만, isLoggedIn은 **파생 값**으로 다시 계산합니다.
 *
 * 핵심 변경점(로그인 전인데 대시보드가 뜨던 이슈 해결)
 *  - 저장 키를 `auth-storage` → `auth-v2` 로 교체(구 잔여값 무시)
 *  - 저장 범위를 **user/token만**으로 제한(partialize)
 *  - 스토리지 복원 완료 시 `isLoggedIn`을 **user && token 존재 여부로 재계산**
 *
 * ⚠️ 보안 메모(실서비스 전 확인)
 *  - localStorage는 자바스크립트로 접근 가능한 영역입니다. XSS 취약점이 있으면 토큰이 유출될 수 있습니다.
 *  - 가능하면 민감 토큰은 httpOnly 쿠키(서버 세션)로 관리하고, 여기에는 최소 정보만 보관하는 것을 권장합니다.
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
  /** 액세스 토큰(JWT 등). 데모에서는 문자열로만 관리 */
  token: string | null;

  /** 로그인 처리: 서버 응답으로 받은 { user, token }을 저장 */
  login: (payload: { user: User; token: string }) => void;
  /** 로그아웃 처리: 상태 초기화 +(선택) 로컬 스토리지 정리 */
  logout: () => void;
};

const initialAuth: Pick<AuthState, "isLoggedIn" | "user" | "token"> = {
  isLoggedIn: false,
  user: null,
  token: null,
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialAuth,

      // ▸ 로그인: 전달받은 사용자/토큰을 저장하고 isLoggedIn=true로 전환
      login: ({ user, token }) =>
        set({
          isLoggedIn: true,
          user,
          token,
        }),

      // ▸ 로그아웃: 모든 인증 관련 상태를 비웁니다 + 구 키까지 정리(안전)
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
 *  - user && token 이 모두 있을 때만 true
 *  - 과거 잔여값으로 인한 오판(앱 첫 실행인데 대시보드가 뜨는 등)을 방지
 */
// onFinishHydration: persist가 스토리지에서 값을 모두 불러온 직후 호출
(useAuth as any).persist?.onFinishHydration?.((state: AuthState) => {
  const authed = !!state?.user && !!state?.token;
  useAuth.setState({ isLoggedIn: authed });
});

// 모듈 최초 로드 시 한 번 보정(SSR/초기 깜빡임 최소화)
try {
  const s = useAuth.getState();
  if (!!s.user && !!s.token) {
    useAuth.setState({ isLoggedIn: true });
  }
} catch {}

/*
 * ─────────────────────────────────────────────────────────
 * 사용 예시(개발자 참고)
 *
 * // 로그인 성공 시(예: SignupModal onSuccess에서):
 * useAuth.getState().login({
 *   user: { id: "u1", name: "김미소", email: "miso@example.com" },
 *   token: "FAKE_JWT_TOKEN",
 * });
 *
 * // 로그아웃 버튼 클릭 시:
 * useAuth.getState().logout();
 *
 * // 헤더에서 로그인 상태/이메일 표시:
 * const { isLoggedIn, user } = useAuth();
 *
 * // 보호 라우트(ProtectedRoute)에서의 사용:
 * const authed = useAuth.getState().isLoggedIn;
 */