import { useEffect, useMemo, useState } from "react";
import apiClient from "@/api/apiClient";

// ====== 타입 정의 ======

// 카테고리별 집계
type CategoryInsight = {
  category: string;
  count: number;
};

// 태그별 집계
type TagInsight = {
  tag: string;
  count: number;
};

// 월(혹은 기간)별 집계
type MonthInsight = {
  month: string; // 예: "2025-11"
  count: number;
};

// 최근 기록 요약
type RecentRecord = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  recordedAt: string | null;
};

// 백엔드에서 내려주는 인사이트 응답 데이터
type TasteInsightsData = {
  totalCount: number;
  byCategory: CategoryInsight[];
  byTag: TagInsight[];
  byMonth: MonthInsight[];
  recentRecords: RecentRecord[];
};

type TasteInsightsResponse = {
  ok: boolean;
  data: TasteInsightsData;
};

// ====== 유틸 함수 ======

// YYYY-MM 형식의 문자열을 "2025년 11월" 이런 식으로 포맷팅
function formatMonthLabel(month: string) {
  if (!month.includes("-")) return month;
  const [year, m] = month.split("-");
  return `${year}년 ${parseInt(m, 10)}월`;
}

// 날짜 문자열 → 보기 좋은 포맷
function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// ====== 메인 컴포넌트 ======

/**
 * 대시보드 내 "취향 분석" 화면
 * - 전체 기록 수
 * - 카테고리별 분포
 * - 태그 TOP N
 * - 월별 기록 추이
 * - 최근 기록 리스트
 */
export default function TasteInsights() {
  const [insights, setInsights] = useState<TasteInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // 총 기록 수를 안전하게 계산 (백엔드에서 totalCount가 안 올 경우 대비)
  const totalCount = useMemo(() => {
    if (!insights) return 0;

    if (typeof insights.totalCount === "number" && insights.totalCount > 0) {
      return insights.totalCount;
    }

    // totalCount가 없거나 0이면 카테고리 합계로 보정
    const fromCategory =
      insights.byCategory?.reduce((sum, item) => sum + (item.count ?? 0), 0) ?? 0;

    if (fromCategory > 0) {
      return fromCategory;
    }

    // 그래도 0이면 최근 기록 개수로 대체
    return insights.recentRecords?.length ?? 0;
  }, [insights]);

  // 마운트 시 한 번 인사이트 조회
  useEffect(() => {
    let mounted = true;

    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);
        setUnauthorized(false);

        const res = await apiClient.get<TasteInsightsResponse>(
          "/taste-records/insights",
        );

        if (!res.ok) {
          throw new Error("분석 데이터를 불러오는 데 실패했습니다.");
        }

        if (mounted) {
          setInsights(res.data);
        }
      } catch (err) {
        console.error("[TasteInsights] 분석 조회 실패", err);

        if (!mounted) return;

        const message =
          err instanceof Error
            ? err.message
            : "분석 데이터를 불러오는 중 오류가 발생했습니다.";

        // 로그인하지 않은 상태(401)인 경우: 에러 카드 대신 '로그인 필요' 안내만 보여줌
        if (message.includes("로그인이 필요합니다")) {
          setUnauthorized(true);
          setError(null);
          return;
        }

        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchInsights();

    return () => {
      mounted = false;
    };
  }, []);

  // 카테고리별 퍼센트 계산 (간단한 막대 그래프용) - NaN 방지
  const categoryWithRatio = useMemo(() => {
    if (!insights || totalCount <= 0) return [];

    const total = totalCount;

    return insights.byCategory.map((item) => {
      const safeCount = item.count ?? 0;
      const raw = (safeCount / total) * 100;
      const ratio = Number.isFinite(raw) ? Math.round(raw) : 0;

      return {
        ...item,
        ratio,
      };
    });
  }, [insights, totalCount]);

  // 태그 TOP 8 정도만 사용 (너무 많으면 복잡해지므로)
  const topTags = useMemo(() => {
    if (!insights) return [];
    const sorted = [...insights.byTag].sort((a, b) => b.count - a.count);
    return sorted.slice(0, 8);
  }, [insights]);

  // 로딩/에러/데이터 없음 상태 처리
  if (loading) {
    return (
      <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-6 py-10 text-center relative overflow-hidden">
        {/* 고대 문서 장식 */}
        <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
        <p className="text-base text-[#d4a574] font-medium">취향 분석을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-6 py-6 relative overflow-hidden">
        {/* 고대 문서 장식 */}
        <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
        <p className="text-base font-black text-[#f4d7aa] mb-2">로그인 후 이용 가능한 기능입니다.</p>
        <p className="text-sm text-[#d4a574] font-medium">
          취향 분석은 내 계정에 기록된 데이터를 기반으로 제공돼요. 로그인한 뒤 다시 확인해 주세요.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-red-500 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-6 py-6 relative overflow-hidden">
        {/* 고대 문서 장식 */}
        <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
        <p className="text-base font-black text-red-400 mb-2">분석 로딩 실패</p>
        <p className="text-sm text-red-300 font-medium">{error}</p>
      </div>
    );
  }

  if (!insights || totalCount === 0) {
    return (
      <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-dashed border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-6 py-10 text-center relative overflow-hidden">
        {/* 고대 문서 장식 */}
        <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
        <p className="text-xl font-black text-[#f4d7aa] mb-2 tracking-wide">
          아직 기록된 취향이 없어요.
        </p>
        <p className="text-base text-[#d4a574] font-medium">
          첫 번째 기록을 남기면, 여기에서 나만의 취향 패턴과 분석을 볼 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-5 py-6 relative overflow-hidden">
        {/* 금속 장식 테두리 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#f4d7aa] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">📊 취향 분석</h2>
            <p className="mt-2 text-base text-[#d4a574] font-medium">
              지금까지 기록한 취향들을 바탕으로{" "}
              <span className="font-black text-[#f4d7aa]">나만의 분석 결과</span>를 보여드릴게요.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-4 py-2 text-sm font-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30">
            총 {totalCount}개 기록
          </span>
        </div>
      </header>

      {/* 상단 요약 카드 영역 */}
      <section className="grid gap-5 md:grid-cols-2">
        {/* 가장 많이 기록한 카테고리 */}
        <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative overflow-hidden">
          {/* 고대 문서 장식 */}
          <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
          
          <h3 className="text-lg font-black text-[#f4d7aa] tracking-wide mb-2">⭐ 최애 카테고리</h3>
          <p className="text-sm text-[#d4a574] font-medium mb-4">
            지금까지 가장 많이 기록한 취향 카테고리
          </p>
          <div className="mt-4">
            {categoryWithRatio[0] ? (
              <>
                <p className="text-2xl font-black text-[#f4d7aa] tracking-wide">
                  {categoryWithRatio[0].category}
                </p>
                <p className="mt-2 text-sm text-[#d4a574] font-medium">
                  전체의 {categoryWithRatio[0].ratio}% (
                  {categoryWithRatio[0].count}개)
                </p>
                <div className="mt-4 h-3 rounded-full bg-gradient-to-r from-[#4a3420] to-[#3a2818] border border-[#6b4e2f] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                  <div
                    className="h-3 rounded-full transition-all bg-gradient-to-r from-[#c9a961] to-[#8b6f47] shadow-[0_2px_4px_rgba(201,169,97,0.5)]"
                    style={{
                      width: `${categoryWithRatio[0].ratio}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#8b6f47] font-medium">카테고리 데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 최근 한 달 기록 수 (혹은 가장 최근 월) */}
        <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative overflow-hidden">
          {/* 고대 문서 장식 */}
          <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
          
          <h3 className="text-lg font-black text-[#f4d7aa] tracking-wide mb-2">📅 최근 기록</h3>
          <p className="text-sm text-[#d4a574] font-medium mb-4">
            가장 최근 기간에 기록한 취향 수
          </p>
          <div className="mt-4">
            {insights.byMonth[insights.byMonth.length - 1] ? (
              (() => {
                const last = insights.byMonth[insights.byMonth.length - 1];
                return (
                  <>
                    <p className="text-2xl font-black text-[#f4d7aa] tracking-wide">
                      {last.count}개
                    </p>
                    <p className="mt-2 text-sm text-[#d4a574] font-medium">
                      {formatMonthLabel(last.month)} 기준
                    </p>
                  </>
                );
              })()
            ) : (
              <p className="mt-2 text-sm text-[#8b6f47] font-medium">월별 데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </section>

      {/* 메인 인사이트 영역: 카테고리 분포 + 월별 추이 + 태그 목록 + 최근 기록 */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* 왼쪽 2열: 카테고리 & 월별 추이 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 카테고리 분포 (막대 그래프 느낌) */}
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative overflow-hidden">
            {/* 고대 문서 장식 */}
            <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            
            <h3 className="text-lg font-black text-[#f4d7aa] tracking-wide mb-2">
              📈 카테고리별 취향 분포
            </h3>
            <p className="text-sm text-[#d4a574] font-medium mb-4">
              어떤 종류의 취향을 많이 기록했는지 한눈에 볼 수 있어요.
            </p>

            <div className="mt-4 space-y-3">
              {categoryWithRatio.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-black text-[#f4d7aa] tracking-wide">{item.category}</span>
                    <span className="text-[#d4a574] font-medium">
                      {item.count}개 · {item.ratio}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#4a3420] to-[#3a2818] border border-[#6b4e2f] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                    <div
                      className="h-3 rounded-full transition-all bg-gradient-to-r from-[#c9a961] to-[#8b6f47] shadow-[0_2px_4px_rgba(201,169,97,0.5)]"
                      style={{
                        width: `${item.ratio}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 월별 기록 추이 (간단한 라인/막대 느낌) */}
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative overflow-hidden">
            {/* 고대 문서 장식 */}
            <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            
            <h3 className="text-lg font-black text-[#f4d7aa] tracking-wide mb-2">
              ⏰ 시간 흐름에 따른 기록 추이
            </h3>
            <p className="text-sm text-[#d4a574] font-medium mb-4">
              언제 내가 취향을 많이 기록했는지 볼 수 있어요.
            </p>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {insights.byMonth.map((m) => (
                <div
                  key={m.month}
                  className="flex min-w-[70px] flex-col items-center justify-end gap-1.5"
                >
                  <div className="flex h-20 w-7 items-end justify-center rounded-full bg-gradient-to-t from-[#4a3420] to-[#3a2818] border border-[#6b4e2f] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                    <div
                      className="w-5 rounded-full transition-all bg-gradient-to-t from-[#c9a961] to-[#8b6f47] shadow-[0_2px_4px_rgba(201,169,97,0.5)]"
                      style={{
                        height:
                          !insights || totalCount === 0
                            ? "0%"
                            : `${Math.max(10, (m.count / totalCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="mt-1 text-[10px] text-[#8b6f47] font-medium">
                    {formatMonthLabel(m.month).split(" ").slice(1).join(" ")}
                  </span>
                  <span className="text-xs font-black text-[#f4d7aa]">
                    {m.count}개
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽 1열: 태그 TOP + 최근 기록 */}
        <div className="space-y-6">
          {/* TOP 태그 */}
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative overflow-hidden">
            {/* 고대 문서 장식 */}
            <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            
            <h3 className="text-lg font-black text-[#f4d7aa] tracking-wide mb-2">🏷️ 자주 쓰는 태그</h3>
            <p className="text-sm text-[#d4a574] font-medium mb-4">
              어떤 상황/기분에서 취향을 많이 기록했는지 보여줘요.
            </p>

            {topTags.length === 0 ? (
              <p className="mt-3 text-sm text-[#8b6f47] font-medium">
                아직 태그가 거의 없어요. 기록할 때 상황이나 기분을{" "}
                <span className="font-black text-[#d4a574]">태그로 남겨보는 건 어떨까요?</span>
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <span
                    key={tag.tag}
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-[#4a3420] to-[#3a2818] px-3 py-1.5 text-xs font-bold text-[#d4a574] border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                  >
                    #{tag.tag}
                    <span className="text-[10px] text-[#8b6f47] font-medium">
                      · {tag.count}회
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 최근 기록 5개 */}
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative overflow-hidden">
            {/* 고대 문서 장식 */}
            <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            
            <h3 className="text-lg font-black text-[#f4d7aa] tracking-wide mb-2">📝 최근 기록</h3>
            <p className="text-sm text-[#d4a574] font-medium mb-4">
              가장 최근에 남긴 취향들을 간단히 모아봤어요.
            </p>

            <div className="mt-3 space-y-2.5">
              {insights.recentRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] px-4 py-3 border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex-1">
                    <p className="text-sm font-black text-[#f4d7aa] truncate tracking-wide">
                      {r.title || "(제목 없음)"}
                    </p>
                    <p className="mt-1 text-xs text-[#d4a574] font-medium">
                      {r.category} · {formatDate(r.recordedAt)}
                    </p>
                    {r.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex rounded-full bg-gradient-to-b from-[#4a3420] to-[#3a2818] px-2 py-0.5 text-[10px] text-[#d4a574] font-bold border border-[#6b4e2f]"
                          >
                            #{tag}
                          </span>
                        ))}
                        {r.tags.length > 3 && (
                          <span className="text-[10px] text-[#8b6f47] font-medium">
                            +{r.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}