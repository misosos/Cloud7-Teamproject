import { useEffect, useMemo, useState } from "react";
import apiClient from "@/services/apiClient";

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
 * 대시보드 내 "취향 인사이트" 화면
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

  // 마운트 시 한 번 인사이트 조회
  useEffect(() => {
    let mounted = true;

    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.get<TasteInsightsResponse>(
          "/taste-records/insights",
        );

        if (!res.ok) {
          throw new Error("인사이트 데이터를 불러오는 데 실패했습니다.");
        }

        if (mounted) {
          setInsights(res.data);
        }
      } catch (err) {
        console.error("[TasteInsights] 인사이트 조회 실패", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "인사이트 데이터를 불러오는 중 오류가 발생했습니다.",
          );
        }
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

  // 카테고리별 퍼센트 계산 (간단한 막대 그래프용)
  const categoryWithRatio = useMemo(() => {
    if (!insights || insights.totalCount === 0) return [];
    return insights.byCategory.map((item) => ({
      ...item,
      ratio: Math.round((item.count / insights.totalCount) * 100),
    }));
  }, [insights]);

  // 태그 TOP 8 정도만 사용 (너무 많으면 복잡해지므로)
  const topTags = useMemo(() => {
    if (!insights) return [];
    const sorted = [...insights.byTag].sort((a, b) => b.count - a.count);
    return sorted.slice(0, 8);
  }, [insights]);

  // 로딩/에러/데이터 없음 상태 처리
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-stone-600">취향 인사이트를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200/80 bg-white p-4 text-sm text-red-700 shadow-sm">
        <p className="font-medium">인사이트 로딩 실패</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (!insights || insights.totalCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-amber-200/70 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-stone-800">
          아직 기록된 취향이 없어요.
        </p>
        <p className="mt-2 text-sm text-stone-500">
          첫 번째 기록을 남기면, 여기에서 나만의 취향 패턴과 인사이트를 볼 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl p-4 md:p-5 shadow-sm">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-amber-200/70 pb-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">취향 인사이트</h2>
          <p className="mt-1 text-sm text-stone-600">
            지금까지 기록한 취향들을 바탕으로{" "}
            <span className="font-medium text-gray-700">나만의 패턴</span>을 보여드릴게요.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          총 {insights.totalCount}개 기록
        </span>
      </header>

      {/* 상단 요약 카드 영역 */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* 가장 많이 기록한 카테고리 */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-amber-100/70">
          <h3 className="text-sm font-semibold text-stone-800">최애 카테고리</h3>
          <p className="mt-1 text-xs text-stone-500">
            지금까지 가장 많이 기록한 취향 카테고리
          </p>
          <div className="mt-4">
            {categoryWithRatio[0] ? (
              <>
                <p className="text-lg font-bold text-stone-900">
                  {categoryWithRatio[0].category}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  전체의 {categoryWithRatio[0].ratio}% (
                  {categoryWithRatio[0].count}개)
                </p>
                <div className="mt-3 h-2 rounded-full bg-amber-100/60">
                  <div
                    className="h-2 rounded-full bg-amber-500 transition-all"
                    style={{ width: `${categoryWithRatio[0].ratio}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-stone-500">카테고리 데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 최근 한 달 기록 수 (혹은 가장 최근 월) */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-amber-100/70">
          <h3 className="text-sm font-semibold text-stone-800">최근 기록</h3>
          <p className="mt-1 text-xs text-stone-500">
            가장 최근 기간에 기록한 취향 수
          </p>
          <div className="mt-4">
            {insights.byMonth[insights.byMonth.length - 1] ? (
              (() => {
                const last = insights.byMonth[insights.byMonth.length - 1];
                return (
                  <>
                    <p className="text-lg font-bold text-stone-900">
                      {last.count}개
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatMonthLabel(last.month)} 기준
                    </p>
                  </>
                );
              })()
            ) : (
              <p className="mt-2 text-sm text-stone-500">월별 데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 태그 다양성 (사용한 태그 수) */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-amber-100/70">
          <h3 className="text-sm font-semibold text-stone-800">태그 다양성</h3>
          <p className="mt-1 text-xs text-stone-500">
            지금까지 사용한 고유 태그 개수
          </p>
          <div className="mt-4">
            <p className="text-lg font-bold text-stone-900">
              {insights.byTag.length}개
            </p>
            <p className="mt-1 text-xs text-stone-500">
              감정 / 상황 / 컨텍스트를 태그로 더 많이 남길수록{" "}
              <span className="font-medium text-stone-700">인사이트가 더 풍부해져요.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 메인 인사이트 영역: 카테고리 분포 + 월별 추이 + 태그 목록 + 최근 기록 */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* 왼쪽 2열: 카테고리 & 월별 추이 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 카테고리 분포 (막대 그래프 느낌) */}
          <div className="rounded-xl bg-white p-4 shadow-sm border border-amber-100/70">
            <h3 className="text-sm font-semibold text-stone-800">
              카테고리별 취향 분포
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              어떤 종류의 취향을 많이 기록했는지 한눈에 볼 수 있어요.
            </p>

            <div className="mt-4 space-y-2">
              {categoryWithRatio.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-700">{item.category}</span>
                    <span className="text-stone-500">
                      {item.count}개 · {item.ratio}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-amber-100/60">
                    <div
                      className="h-2 rounded-full bg-amber-500 transition-all"
                      style={{ width: `${item.ratio}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 월별 기록 추이 (간단한 라인/막대 느낌) */}
          <div className="rounded-xl bg-white p-4 shadow-sm border border-amber-100/70">
            <h3 className="text-sm font-semibold text-stone-800">
              시간 흐름에 따른 기록 추이
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              언제 내가 취향을 많이 기록했는지 볼 수 있어요.
            </p>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {insights.byMonth.map((m) => (
                <div
                  key={m.month}
                  className="flex min-w-[70px] flex-col items-center justify-end gap-1"
                >
                  <div className="flex h-16 w-6 items-end justify-center rounded-full bg-amber-100/70">
                    <div
                      className="w-4 rounded-full bg-amber-500/90 transition-all"
                      style={{
                        height:
                          insights.totalCount === 0
                            ? "0%"
                            : `${Math.max(
                                10,
                                (m.count / insights.totalCount) * 100,
                              )}%`,
                      }}
                    />
                  </div>
                  <span className="mt-1 text-[10px] text-stone-500">
                    {formatMonthLabel(m.month).split(" ").slice(1).join(" ")}
                  </span>
                  <span className="text-[10px] font-medium text-stone-700">
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
          <div className="rounded-xl bg-white p-4 shadow-sm border border-amber-100/70">
            <h3 className="text-sm font-semibold text-stone-800">자주 쓰는 태그</h3>
            <p className="mt-1 text-xs text-stone-500">
              어떤 상황/기분에서 취향을 많이 기록했는지 보여줘요.
            </p>

            {topTags.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">
                아직 태그가 거의 없어요. 기록할 때 상황이나 기분을{" "}
                <span className="font-medium">태그로 남겨보는 건 어떨까요?</span>
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <span
                    key={tag.tag}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800"
                  >
                    {tag.tag}
                    <span className="text-[10px] text-amber-700">
                      · {tag.count}회
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 최근 기록 5개 */}
          <div className="rounded-xl bg-white p-4 shadow-sm border border-amber-100/70">
            <h3 className="text-sm font-semibold text-stone-800">최근 기록</h3>
            <p className="mt-1 text-xs text-stone-500">
              가장 최근에 남긴 취향들을 간단히 모아봤어요.
            </p>

            <div className="mt-3 space-y-2">
              {insights.recentRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between rounded-lg bg-white px-3 py-2 border border-amber-100/70"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {r.title || "(제목 없음)"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {r.category} · {formatDate(r.recordedAt)}
                    </p>
                    {r.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-stone-600"
                          >
                            {tag}
                          </span>
                        ))}
                        {r.tags.length > 3 && (
                          <span className="text-[10px] text-stone-400">
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