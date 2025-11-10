import hero from "@/assets/ui/bg-parchment.png";

/**
 * Hero (히어로 섹션)
 * ─────────────────────────────────────────────────────────
 * 목적: 페이지 맨 위에서 큰 배경 이미지와 핵심 문구(타이틀)를 보여주는 영역입니다.
 *      랜딩/소개/대시보드 등에서 첫인상을 만드는 역할을 합니다.
 *
 * ▸ 어디에 쓰나요?
 *   - 메인 홈의 상단 배너, 각 페이지의 소개 영역 등
 *
 * ▸ 디자이너/기획자용 편집 가이드
 *   - 배경 이미지 바꾸기: 맨 위 `import hero from ...` 경로를 교체하거나, 해당 파일을 다른 이미지로 바꾸세요.
 *   - 높이/여백 조정    : 아래 `className`의 `min-h-[480px]`, `py-24` 값을 바꾸면 됩니다.
 *   - 정렬/배경 표시    : `bg-cover bg-center bg-no-repeat`(배경 채우기)와
 *                         `flex ... items-center justify-center`(가운데 정렬)로 제어합니다.
 *   - 타이틀 문구/스타일: `<h1>` 텍스트와 Tailwind 클래스(`text-3xl`, `text-amber-900` 등)를 바꾸세요.
 *   - 대비/가독성      : 배경이 너무 진하면 텍스트 가독성이 떨어질 수 있습니다.
 *                         필요 시 텍스트 색을 바꾸거나, 얕은 그림자(`drop-shadow`)를 조절하세요.
 *
 * ▸ 접근성 메모
 *   - `<h1>`은 보통 페이지의 최상위 제목입니다. 페이지에 이미 다른 `<h1>`이 있다면
 *     여기의 `h1`을 `h2`로 낮추는 것이 좋습니다(시맨틱 구조 유지).
 */
export default function Hero() {
  return (
    <header
      // 섹션 전체 스타일: 풀폭 + 최소 높이 + 배경 이미지 배치 + 중앙 정렬
      className="
        w-full min-h-[480px]    /* 화면 위에서 일정 높이 확보 (필요시 400~600px 선에서 조정) */
        py-24                   /* 상/하 여백: 타이틀 주변 공간 확보 */
        bg-cover bg-center bg-no-repeat /* 배경 이미지 표시 방식: 꽉 채우고 가운데 정렬 */
        flex flex-col items-center justify-center /* 텍스트/버튼을 수직·수평 중앙 정렬 */
      "
      style={{
        backgroundImage: `url(${hero})`, // 배경 이미지 적용: 위에서 import한 파일을 사용
      }}
    >
      {/* 히어로 타이틀(가장 중요한 한 줄) — 문구/크기/색상은 아래 클래스만 수정하세요 */}
      <h1 className="text-3xl font-bold text-amber-900 drop-shadow-[0_1px_4px_rgba(255,255,255,0.65)]">
        히어로 섹션 영역 임시 이미지
      </h1>

      {/**
       * ▸ 필요 시, 보조 문구/버튼을 여기 추가할 수 있습니다 (현재는 예시만 주석으로 안내).
       *   예)
       *   <p className="mt-3 text-stone-700">간단한 소개 문구가 들어갑니다.</p>
       *   <button className="mt-6 px-5 py-2 rounded-md bg-amber-700 text-white hover:bg-amber-800">시작하기</button>
       *   (실제 버튼/문구는 디자인 확정 후 추가하세요)
       */}
    </header>
  );
}