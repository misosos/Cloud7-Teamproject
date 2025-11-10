# 취향도감 (Frontend)

> **프론트엔드만 우선 구현한 상태**입니다. 백엔드/DB 연동 전까지는 `src/data/mock.ts`의 목데이터로 UI를 확인합니다. (나중에 README.md 수정)

---

## ✨ 무엇을 만드는 프로젝트인가요?
- 로그인 전에는 랜딩/소개만 보이고, **로그인 후 대시보드**에서
  - 공식도감(업적), 개인도감(챌린지 진행도), 카테고리별 기록 갤러리 등을 확인합니다.
- 상단 헤더에서 **로그인 상태**(이메일+로그아웃 / 로그인·회원가입 버튼)를 즉시 반영합니다.
- 일부 페이지는 **보호 라우트**로 묶여 있어 **로그인 후에만 접근** 가능합니다.

---

## 🧱 기술 스택
- **React + TypeScript** (Vite 기반)
- **React Router v6** (라우팅/보호 라우트)
- **Zustand** (전역 상태: 인증, 카테고리 선택)
- **Tailwind CSS** (스타일)
- (Dev) ESLint/Prettier 설정 권장

> Node.js **>= 18** (권장: 20 LTS)

---

## 📂 프론트엔드 폴더 구조
```
src/
├─ components/            # 공용 컴포넌트(헤더, 모달, 북카드 등)
├─ sections/              # 대시보드 상의 섹션(Hero, OfficialDex, PersonalDex, RecordGallery)
├─ pages/
│  ├─ BeforeLogIn/        # 로그인 전 랜딩 페이지
│  ├─ AfterLogIn/         # 로그인 후 대시보드
│  └─ TasteRecord/        # 취향기록 목록/상세(보호 라우트)
├─ store/                 # Zustand 스토어(auth, useCategory)
├─ data/                  # 목데이터(mock.ts)
├─ types/                 # 전역 타입(type.d.ts)
└─ assets/                # 이미지/아이콘 등 정적 리소스
```

---

## 🚀 빠른 시작
```bash
# 1) 설치
npm install
# 또는
# yarn
# pnpm i

# 2) 개발 서버 실행
npm run dev
# http://localhost:5173 (Vite 기본 포트)

> 패키지 매니저는 `npm` 기준으로 표기했습니다. `yarn`/`pnpm`을 사용해도 무방합니다.

---

## 🔐 인증/라우팅 동작 이해하기 (프론트 단독 구동용)
- 전역 인증 스토어: `src/store/auth.ts` (Zustand + persist)
  - `login({ user, token })` 호출 시 **즉시 리렌더**되어 헤더/홈 분기가 바뀝니다.
  - 상태는 `localStorage`(`auth-storage`)에 보관되어 **새로고침 후에도 유지**됩니다.
- 홈 분기: `src/App.tsx`
  - `/` 경로에서 **로그인 여부**에 따라 `Dashboard` 또는 `BeforeLogin`을 보여줍니다.
- 보호 라우트: `src/components/ProtectedRoute.tsx`
  - 비로그인 시 `/before-login?next=원래경로`로 이동 → 로그인 성공 시 **원래 가려던 경로**로 복귀

> 실제 백엔드 연동 전까지는 **SignupModal에서 성공 콜백**으로 `useAuth.getState().login(...)`을 호출하여 로그인 상태를 흉내냅니다.

---

## 🧪 QA 체크리스트(프론트 단독 시나리오)
- [ ] **헤더 우측**: 비로그인(로그인/회원가입) → 로그인 후(이메일/로그아웃)으로 즉시 전환
- [ ] **/ (홈)**: 로그인 전엔 랜딩, 로그인 후엔 대시보드로 분기
- [ ] **보호 라우트**: `/취향기록`, `/취향기록/:id`는 로그인 후 접근 가능
- [ ] **RecordGallery**: 선택된 카테고리의 최근 4개만 노출(없으면 안내 문구)
- [ ] **반응형**: 모바일에서 좌/우 사이드바 숨김, 데스크톱에서 노출

---

## 🧪 목데이터 사용법
- 파일: `src/data/mock.ts`
  - **기록 레코드**(`records`), **공식도감**(`officialDexLatest`), **개인도감**(`personalChallenges`)
  - **카테고리 집합**: `allCategories` (좌/우 사이드바, 모바일 그리드 공용)
  - **작성 모달 옵션**: `categoryOptions`, `tagOptions`
- 타입 참조: `src/types/type.d.ts`
- 필요 시 데이터 수정/추가 후 저장하면 개발 서버가 즉시 반영합니다.

---

## 🧭 주요 라우트
- `/` : 홈 게이트(로그인 전 → `BeforeLogin`, 로그인 후 → `Dashboard`)
- `/before-login` : 로그인 전 랜딩
- `/취향기록` : 기록 목록(슬라이더/모달)
- `/취향기록/:id` : 기록 상세

---

## 🎨 디자인/컴포넌트 가이드 (간단)
- **Hero**: 상단 배너(풀-블리드). 문구/배경 이미지는 `src/sections/Hero.tsx`에서 교체
- **OfficialDex**: 액자형 업적 카드(최신 n개) `src/sections/OfficialDex.tsx`
- **PersonalDex**: 진행 바(%) `src/sections/PersonalDex.tsx`
- **RecordGallery**: 카테고리 필터 → 최신순 4개 `src/sections/RecordGallery.tsx`
- **HeaderNav**: 로그인 상태/버튼 노출 제어, 잠금 모드(`lockNav`, `lockLogo`) 지원

---

## 🧾 커밋 컨벤션(권장, 한글 OK)
- `feat:` 기능 추가 / `fix:` 버그 수정 / `docs:` 문서 / `style:` 스타일만 / `refactor:` 리팩터 / `chore:` 빌드·환경
- 예시: `feat: 대시보드 RecordGallery 최신 4개 필터 적용`
- 예시: `fix: HeaderNav 로그인 후 즉시 리렌더 안 되던 이슈 해결`

---

## ⚠️ 한계/주의사항 (현재 단계)
- **실제 로그인/회원가입 API 없음** → 모달 성공 콜백에서 상태만 갱신하는 **프론트 시뮬레이션**
- **보안 고려 미적용**(데모 단계): 토큰은 추후 httpOnly 쿠키/서버 세션으로 교체 권장
- **데이터는 모두 목데이터** → API 연동 시 `mock.ts` 제거/대체 예정

---
