import { useEffect, useMemo, useState } from "react";
import apiClient from "@/api/apiClient";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartPie,
  faStar,
  faCalendarDays,
  faChartColumn,
  faTags,
  faPenNib,
  faTriangleExclamation,
  faLock,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

// ====== 타입 정의 ======

type CategoryInsight = {
  category: string;
  count: number;
};

type TagInsight = {
  tag: string;
  count: number;
};

type MonthInsight = {
  month: string; // 예: "2025-11"
  count: number;
};

type RecentRecord = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  recordedAt: string | null;
};

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

// ====== 유틸 ======

function formatMonthLabel(month: string) {
  if (!month.includes("-")) return month;
  const [year, m] = month.split("-");
  return `${year}년 ${parseInt(m, 10)}월`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * TasteInsights (대시보드: 취향 분석)
 * - 로직 유지
 * - ✅ Warm Oak 테마 적용
 * - ✅ (상위 페이지에서 타이틀 관리) → 컴포넌트 내부 타이틀 제거
 * - ✅ 이모지 제거 → FontAwesome(solid)
 */
export default function TasteInsights() {
  const [insights, setInsights] = useState<TasteInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const totalCount = useMemo(() => {
    if (!insights) return 0;

    if (typeof insights.totalCount === "number" && insights.totalCount > 0) {
      return insights.totalCount;
    }

    const fromCategory =
      insights.byCategory?.reduce((sum, item) => sum + (item.count ?? 0), 0) ?? 0;

    if (fromCategory > 0) return fromCategory;
    return insights.recentRecords?.length ?? 0;
  }, [insights]);

  useEffect(() => {
    let mounted = true;

    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);
        setUnauthorized(false);

        const res = await apiClient.get<TasteInsightsResponse>("/taste-records/insights");

        if (!res.ok) {
          throw new Error("분석 데이터를 불러오는 데 실패했습니다.");
        }

        if (mounted) setInsights(res.data);
      } catch (err) {
        console.error("[TasteInsights] 분석 조회 실패", err);
        if (!mounted) return;

        const message =
          err instanceof Error
            ? err.message
            : "분석 데이터를 불러오는 중 오류가 발생했습니다.";

        if (message.includes("로그인이 필요합니다")) {
          setUnauthorized(true);
          setError(null);
          return;
        }

        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchInsights();
    return () => {
      mounted = false;
    };
  }, []);

  const categoryWithRatio = useMemo(() => {
    if (!insights || totalCount <= 0) return [];
    const total = totalCount;

    return insights.byCategory.map((item) => {
      const safeCount = item.count ?? 0;
      const raw = (safeCount / total) * 100;
      const ratio = Number.isFinite(raw) ? Math.round(raw) : 0;

      return { ...item, ratio };
    });
  }, [insights, totalCount]);

  const topTags = useMemo(() => {
    if (!insights) return [];
    const sorted = [...insights.byTag].sort((a, b) => b.count - a.count);
    return sorted.slice(0, 8);
  }, [insights]);

  // ====== Warm Oak UI Helper ======

  const Card = ({
    title,
    icon,
    desc,
    children,
  }: {
    title: string;
    icon?: any;
    desc?: string;
    children: React.ReactNode;
  }) => (
    <div
      className="
        relative overflow-hidden rounded-3xl
        bg-[rgba(255,255,255,0.55)]
        backdrop-blur-sm
        border border-[#C9A961]/25
        shadow-[0_18px_36px_rgba(80,50,0,0.10)]
        p-5 md:p-6
      "
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A961]/60 to-transparent" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#C9A961]/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#6B4E2F]/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-black text-[#2B1D12] flex items-center gap-2">
              {icon ? <FontAwesomeIcon icon={icon} className="text-[#8B6F47]" /> : null}
              {title}
            </h3>
            {desc ? <p className="mt-1 text-sm text-[#6B4E2F]">{desc}</p> : null}
          </div>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );

  const StatePanel = ({
    tone,
    title,
    desc,
    icon,
  }: {
    tone: "normal" | "danger";
    title: string;
    desc?: string;
    icon?: any;
  }) => (
    <div
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-[rgba(255,255,255,0.55)] backdrop-blur-sm",
        "shadow-[0_18px_36px_rgba(80,50,0,0.10)]",
        "p-6 md:p-8",
        tone === "danger" ? "border border-[#B42318]/35" : "border border-[#C9A961]/25",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A961]/60 to-transparent" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#C9A961]/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#6B4E2F]/10 blur-3xl" />

      {tone === "danger" ? (
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[#B42318]/[0.06]" />
      ) : null}

      <div className="relative text-center">
        {icon ? (
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/40 border border-[#C9A961]/25">
            <FontAwesomeIcon
              icon={icon}
              className={tone === "danger" ? "text-[#B42318]" : "text-[#8B6F47]"}
            />
          </div>
        ) : null}

        <p className="text-base md:text-lg font-black text-[#2B1D12]">{title}</p>
        {desc ? <p className="mt-2 text-sm text-[#6B4E2F]">{desc}</p> : null}
      </div>
    </div>
  );

  // ====== 상태 렌더 ======

  if (loading) {
    return (
      <section className="space-y-6">
        <StatePanel
          tone="normal"
          title="취향 분석을 불러오는 중..."
          desc="잠시만 기다려 주세요."
          icon={faSpinner}
        />
      </section>
    );
  }

  if (unauthorized) {
    return (
      <section className="space-y-6">
        <StatePanel
          tone="normal"
          title="로그인 후 이용 가능한 기능입니다."
          desc="내 계정에 기록된 데이터를 기반으로 분석을 제공해요."
          icon={faLock}
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <StatePanel
          tone="danger"
          title="분석 로딩 실패"
          desc={error}
          icon={faTriangleExclamation}
        />
      </section>
    );
  }

  if (!insights || totalCount === 0) {
    return (
      <section className="space-y-6">
        <StatePanel
          tone="normal"
          title="아직 기록된 취향이 없어요"
          desc="첫 기록을 남기면, 여기에서 취향 패턴과 분석을 볼 수 있어요."
          icon={faChartPie}
        />
      </section>
    );
  }

  // ====== 본문 ======

  return (
    <section className="space-y-6">
      {/* 헤더 카드 */}
      <div
        className="
          relative overflow-hidden rounded-3xl
          bg-[rgba(255,255,255,0.55)]
          backdrop-blur-sm
          border border-[#C9A961]/25
          shadow-[0_18px_36px_rgba(80,50,0,0.10)]
          px-5 py-6 md:px-6 md:py-7
        "
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A961]/60 to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#C9A961]/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#6B4E2F]/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[#2B1D12] flex items-center gap-2">
              <FontAwesomeIcon icon={faChartPie} className="text-[#8B6F47]" />
              취향 분석
            </h2>
            <p className="mt-2 text-sm md:text-base text-[#6B4E2F]">
              지금까지의 기록을 바탕으로{" "}
              <span className="font-black text-[#2B1D12]">나만의 패턴</span>을 요약해요.
            </p>
          </div>

          <span
            className="
              inline-flex items-center justify-center rounded-full
              bg-white/40 border border-[#C9A961]/25
              px-4 py-2 text-sm font-black text-[#2B1D12]
              shadow-[0_10px_22px_rgba(80,50,0,0.08)]
            "
          >
            총 {totalCount}개 기록
          </span>
        </div>
      </div>

      {/* 상단 요약 2개 */}
      <section className="grid gap-5 md:grid-cols-2">
        <Card title="최애 카테고리" icon={faStar} desc="가장 많이 기록한 취향 카테고리">
          {categoryWithRatio[0] ? (
            <>
              <p className="text-2xl font-black text-[#2B1D12]">
                {categoryWithRatio[0].category}
              </p>
              <p className="mt-2 text-sm text-[#6B4E2F]">
                전체의{" "}
                <span className="font-black text-[#2B1D12]">
                  {categoryWithRatio[0].ratio}%
                </span>{" "}
                · {categoryWithRatio[0].count}개
              </p>

              <div className="mt-4 h-3 rounded-full bg-[rgba(74,52,32,0.12)] border border-[#6B4E2F]/20 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all bg-[linear-gradient(90deg,#C9A961,#8B6F47)]"
                  style={{ width: `${categoryWithRatio[0].ratio}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6B4E2F]">카테고리 데이터가 없습니다.</p>
          )}
        </Card>

        <Card title="최근 기록" icon={faCalendarDays} desc="가장 최근 기간에 기록한 취향 수">
          {insights.byMonth[insights.byMonth.length - 1] ? (
            (() => {
              const last = insights.byMonth[insights.byMonth.length - 1];
              return (
                <>
                  <p className="text-2xl font-black text-[#2B1D12]">{last.count}개</p>
                  <p className="mt-2 text-sm text-[#6B4E2F]">
                    {formatMonthLabel(last.month)} 기준
                  </p>
                </>
              );
            })()
          ) : (
            <p className="text-sm text-[#6B4E2F]">월별 데이터가 없습니다.</p>
          )}
        </Card>
      </section>

      {/* 메인 3열 */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* 왼쪽 2열 */}
        <div className="space-y-6 lg:col-span-2">
          <Card
            title="카테고리별 취향 분포"
            icon={faChartColumn}
            desc="어떤 취향을 많이 기록했는지 한눈에"
          >
            <div className="space-y-3">
              {categoryWithRatio.map((item) => (
                <div key={item.category}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-black text-[#2B1D12]">{item.category}</span>
                    <span className="text-[#6B4E2F]">
                      {item.count}개 ·{" "}
                      <span className="font-black text-[#2B1D12]">{item.ratio}%</span>
                    </span>
                  </div>

                  <div className="h-3 rounded-full bg-[rgba(74,52,32,0.12)] border border-[#6B4E2F]/20 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all bg-[linear-gradient(90deg,#C9A961,#8B6F47)]"
                      style={{ width: `${item.ratio}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="시간 흐름에 따른 기록 추이"
            icon={faChartColumn}
            desc="언제 기록이 많았는지"
          >
            <div className="flex gap-3 overflow-x-auto pb-1">
              {insights.byMonth.map((m) => (
                <div
                  key={m.month}
                  className="flex min-w-[70px] flex-col items-center justify-end gap-1.5"
                >
                  <div className="flex h-20 w-7 items-end justify-center rounded-full bg-[rgba(74,52,32,0.12)] border border-[#6B4E2F]/20 overflow-hidden">
                    <div
                      className="w-5 rounded-full transition-all bg-[linear-gradient(180deg,#C9A961,#8B6F47)]"
                      style={{
                        height:
                          !insights || totalCount === 0
                            ? "0%"
                            : `${Math.max(10, (m.count / totalCount) * 100)}%`,
                      }}
                    />
                  </div>

                  <span className="mt-1 text-[10px] text-[#6B4E2F]">
                    {formatMonthLabel(m.month).split(" ").slice(1).join(" ")}
                  </span>
                  <span className="text-xs font-black text-[#2B1D12]">{m.count}개</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 오른쪽 1열 */}
        <div className="space-y-6">
          <Card title="자주 쓰는 태그" icon={faTags} desc="상황/기분 태그 TOP">
            {topTags.length === 0 ? (
              <p className="text-sm text-[#6B4E2F]">
                아직 태그가 거의 없어요. 기록할 때 상황/기분을{" "}
                <span className="font-black text-[#2B1D12]">태그로</span> 남겨보세요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <span
                    key={tag.tag}
                    className="
                      inline-flex items-center gap-1 rounded-full
                      bg-white/40 border border-[#C9A961]/20
                      px-3 py-1.5 text-xs font-bold text-[#2B1D12]
                      shadow-[0_10px_18px_rgba(80,50,0,0.08)]
                    "
                  >
                    #{tag.tag}
                    <span className="text-[10px] text-[#6B4E2F]">· {tag.count}회</span>
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card title="최근 기록" icon={faPenNib} desc="가장 최근에 남긴 취향들">
            <div className="space-y-2.5">
              {insights.recentRecords.map((r) => (
                <div
                  key={r.id}
                  className="
                    rounded-2xl
                    bg-white/40 border border-[#C9A961]/20
                    px-4 py-3
                    shadow-[0_10px_18px_rgba(80,50,0,0.08)]
                  "
                >
                  <p className="text-sm font-black text-[#2B1D12] truncate">
                    {r.title || "(제목 없음)"}
                  </p>
                  <p className="mt-1 text-xs text-[#6B4E2F]">
                    {r.category} · {formatDate(r.recordedAt)}
                  </p>

                  {r.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="
                            inline-flex rounded-full
                            bg-[rgba(255,255,255,0.45)]
                            border border-[#C9A961]/18
                            px-2 py-0.5 text-[10px] font-bold
                            text-[#2B1D12]
                          "
                        >
                          #{tag}
                        </span>
                      ))}
                      {r.tags.length > 3 ? (
                        <span className="text-[10px] text-[#6B4E2F]">
                          +{r.tags.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </section>
  );
}