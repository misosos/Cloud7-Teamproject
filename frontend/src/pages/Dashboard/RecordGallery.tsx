import { useEffect, useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import BookCard from "@/components/BookCard";
import useCategory from "@/store/useCategory";
import { httpGet } from "@/services/apiClient";
import type { TasteRecordItem,TasteRecordListResponse } from "@/types/type";

/**
 * RecordGallery (기록 갤러리 섹션)
 * ─────────────────────────────────────────────────────────
 * 목적: 현재 선택된 카테고리에 해당하는 "실제 기록 데이터"를
 *      그리드 카드 형태로 최대 4개까지 보여줍니다.
 *
 * ▸ 누가 보면 좋나?
 *   - 기획/디자인/QA 동료: 이 섹션이 어떤 방식으로
 *     API → 상태 → 필터링/정렬 → UI 로 이어지는지 이해할 수 있습니다.
 *
 * ▸ 데이터 흐름(중요)
 *   1) 전역 카테고리 상태 `current`를 Zustand 스토어(useCategory)에서 읽습니다.
 *   2) 컴포넌트 마운트 시 `GET /taste-records` API로 전체 기록 목록을 한 번 조회합니다.
 *   3) 가져온 전체 기록 중에서 `category === current` 인 것만 필터링합니다.
 *   4) `createdAt` 기준으로 최신순(내림차순) 정렬합니다.
 *   5) 앞에서부터 4개만 잘라(slice) 노출합니다.
 *
 * ▸ UI/표현
 *   - 상단에 현재 카테고리명을 섹션 제목으로 표시합니다(SectionTitle).
 *   - 로딩 중에는 "불러오는 중" 안내 문구를 표시합니다.
 *   - 에러가 발생하면 에러 안내 문구를 표시합니다.
 *   - 현재 카테고리에 기록이 없으면 빈 상태(안내 문구)를 보여줍니다.
 *   - 기록이 있으면 BookCard(책 프레임 카드)로 1~4열 반응형 그리드로 렌더합니다.
 */


export default function RecordGallery() {
  // ① 현재 선택된 카테고리 읽기 (전역 상태)
  const current = useCategory((s) => s.current);

  // ② 실제 기록 데이터를 담을 로컬 상태
  const [records, setRecords] = useState<TasteRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ③ 컴포넌트 마운트 시 한 번만 전체 기록 목록을 조회
  useEffect(() => {
    let cancelled = false;

    async function fetchRecords() {
      setLoading(true);
      setError(null);

      try {
        // ▸ withCredentials/쿠키 포함 설정은 apiClient 내부에서 처리된다고 가정
        const res = await httpGet<TasteRecordListResponse>("/taste-records");

        if (!res.ok) {
          throw new Error("기록 목록 조회 실패");
        }

        if (!cancelled) {
          setRecords(res.data ?? []);
        }
      } catch (e) {
        console.error("[RecordGallery] 기록 목록 조회 실패:", e);
        if (!cancelled) {
          setError("기록을 불러오는 데 실패했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRecords();

    // 언마운트 시 setState 호출 방지를 위한 플래그
    return () => {
      cancelled = true;
    };
  }, []);

  // ④ 현재 카테고리 기준 필터 + 최신순 정렬 + 최대 4개만 노출
  //    - createdAt이 문자열/숫자/없음(null/undefined)일 수 있어서 안전하게 Date로 변환
  const filtered = records
    .filter((it) => it.category === current)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime; // 최신순(내림차순)
    })
    .slice(0, 4);

  return (
    // 섹션 래퍼: 위/아래 간격을 넉넉히 두고, 내부 컨텐츠를 상대 위치로 배치
    <section className="mt-24 mb-40 relative">
      {/* 현재 선택된 카테고리를 제목으로 표시 */}
      <SectionTitle>{current}</SectionTitle>

      {/* 본문 컨테이너: 좌우 패딩(모바일/데스크톱) */}
      <div className="relative mt-12 px-6 md:px-12">
        {/* 로딩 상태 */}
        {loading && (
          <p className="text-center text-stone-400 mt-20 text-sm">
            기록을 불러오는 중입니다...
          </p>
        )}

        {/* 에러 상태 */}
        {!loading && error && (
          <p className="text-center text-red-400 mt-20 text-sm">{error}</p>
        )}

        {/* 정상 상태(로딩 아님 + 에러 없음) */}
        {!loading && !error && (
          <>
            {/* 빈 상태: 현재 카테고리에 해당하는 기록이 없을 때 안내 문구 */}
            {filtered.length === 0 ? (
              <p className="text-center text-stone-400 mt-20 text-sm">
                아직 이 카테고리에 기록이 없어요. 새로운 기록을 만들어보세요!
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
          </>
        )}
      </div>
    </section>
  );
}