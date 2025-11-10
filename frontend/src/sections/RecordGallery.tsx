import SectionTitle from "@/components/SectionTitle";
import BookCard from "@/components/BookCard";
import { records } from "@/data/mock";
import useCategory from "@/store/useCategory";

/**
 * RecordGallery (기록 갤러리 섹션)
 * ─────────────────────────────────────────────────────────
 * 목적: 현재 선택된 카테고리에 해당하는 "기록 카드"들을 그리드로 보여줍니다.
 *      최근에 만든 기록부터 최대 4개까지만 노출합니다.
 *
 * ▸ 누가 보면 좋나?
 *   - 기획/디자인/QA 동료: 이 섹션이 어떤 데이터 흐름으로 필터링/정렬/표시되는지 한눈에 이해할 수 있습니다.
 *
 * ▸ 데이터 흐름(중요)
 *   1) 전역 카테고리 상태 `current`를 Zustand 스토어(useCategory)에서 읽습니다.
 *   2) 전체 더미 데이터(records)에서 `category === current` 인 것만 남겨 필터링합니다.
 *   3) `createdAt` 기준으로 최신순(내림차순) 정렬합니다. (값이 없으면 0으로 취급)
 *   4) 앞에서부터 4개만 잘라(slice) 노출합니다.
 *
 * ▸ UI/표현
 *   - 상단에 현재 카테고리명을 섹션 제목으로 표시합니다(SectionTitle).
 *   - 해당 카테고리에 기록이 없으면 안내 문구(빈 상태)를 보여줍니다.
 *   - 기록이 있으면 BookCard(책 프레임 카드)로 1~4열 반응형 그리드로 렌더합니다.
 */
export default function RecordGallery() {
  // ① 현재 선택된 카테고리 읽기 (전역 상태)
  const current = useCategory((s) => s.current);

  // ② 현재 카테고리 기준 필터 + 최신순 정렬 + 최대 4개만 노출
  //    - createdAt은 숫자(타임스탬프)라고 가정하며, 없을 경우 0으로 취급하여 뒤로 밀립니다.
  const filtered = records
    .filter((it) => it.category === current)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 4);

  return (
    // 섹션 래퍼: 위/아래 간격을 넉넉히 두고, 내부 컨텐츠를 상대 위치로 배치
    <section className="mt-24 mb-40 relative">
      {/* 현재 선택된 카테고리를 제목으로 표시 */}
      <SectionTitle>{current}</SectionTitle>

      {/* 본문 컨테이너: 좌우 패딩(모바일/데스크톱) */}
      <div className="relative mt-12 px-6 md:px-12">
        {/* 빈 상태: 현재 카테고리에 해당하는 기록이 없을 때 안내 문구 */}
        {filtered.length === 0 ? (
          <p className="text-center text-stone-400 mt-20 text-sm">
            기록을 보려면 카테고리를 클릭하세요!
          </p>
        ) : (
          // 기록이 있을 때: 반응형 그리드로 카드 렌더링
          // - grid-cols-1 : 모바일 1열
          // - sm:grid-cols-2 : 작은 태블릿에서 2열
          // - md:grid-cols-3 : 태블릿/작은 데스크톱에서 3열
          // - lg:grid-cols-4 : 큰 데스크톱에서 4열
          // - gap-x-16 / gap-y-24 : 카드 사이 가로/세로 간격
          // - justify-items-center : 각 그리드 칸 안에서 카드 가운데 정렬
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-16 gap-y-24 justify-items-center relative z-10">
            {/* BookCard: 단일 기록 카드(클릭 시 상세로 이동하도록 구현되어 있음) */}
            {filtered.map((it) => (
              <BookCard key={it.id} item={it} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}