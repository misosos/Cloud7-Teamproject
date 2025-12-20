// src/components/TasteCategoryDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchTasteDashboard } from "@/api/tasteDashboard";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartPie,
  faFilm,
  faMasksTheater,
  faPalette,
  faLandmark,
  faMountainSun,
  faMugHot,
  faUtensils,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

// Warm Oak tokens
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const BRAND3 = "#4A3420";
const DANGER = "#B42318";

const CATEGORIES = ["영화", "공연", "전시", "문화시설", "관광명소", "카페", "식당"] as const;

const ICON_MAP: Record<(typeof CATEGORIES)[number], any> = {
  영화: faFilm,
  공연: faMasksTheater,
  전시: faPalette,
  문화시설: faLandmark,
  관광명소: faMountainSun,
  카페: faMugHot,
  식당: faUtensils,
};

const TasteCategoryDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchTasteDashboard();
        if (!data.ok) throw new Error("failed");
        setCounts(data.counts);
        setRatios(data.ratios);
        setTotal(data.totalStays);
      } catch (err) {
        console.error(err);
        setError("취향 대시보드를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const safeTotal = Math.max(0, total || 0);

  const summaryText = useMemo(() => {
    if (!safeTotal) return "최근 머문 장소 기록이 아직 없어요.";
    return "최근 머문 장소 기록을 바탕으로 카테고리 비율을 계산했어요.";
  }, [safeTotal]);

  if (loading) {
    return (
      <div className="p-4 text-sm" style={{ color: MUTED }}>
        대시보드를 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="m-4 rounded-2xl p-4 text-sm"
        style={{
          color: DANGER,
          background: SURFACE,
          border: `1px solid rgba(180,35,24,0.25)`,
          boxShadow: "0 18px 44px rgba(0,0,0,0.10)",
          backdropFilter: "blur(10px)",
        }}
      >
        <span className="mr-2" aria-hidden="true">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>
        {error}
      </div>
    );
  }

  return (
    <section
      className="m-4 rounded-2xl p-4"
      style={{
        background: SURFACE,
        border: "1px solid rgba(201,169,97,0.28)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.10)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-wide" style={{ color: TEXT }}>
            <span className="mr-2" aria-hidden="true" style={{ color: BRAND3 }}>
              <FontAwesomeIcon icon={faChartPie} />
            </span>
            나의 취향 대시보드
          </h2>
          <p className="mt-1 text-xs font-medium" style={{ color: MUTED }}>
            {summaryText}
          </p>
        </div>

        <div
          className="shrink-0 rounded-xl px-3 py-2 text-[11px] font-black tracking-wide"
          style={{
            color: BRAND3,
            background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(201,169,97,0.25)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
          }}
          title="총 머문 장소 기록"
        >
          총 <span style={{ color: BRAND2 }}>{safeTotal}</span>개
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const ratio = ratios[cat] ?? 0;
          const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
          const count = counts[cat] ?? 0;

          return (
            <div
              key={cat}
              className="flex flex-col rounded-2xl px-3 py-3"
              style={{
                background: "rgba(255,255,255,0.38)",
                border: "1px solid rgba(107,78,47,0.16)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-2 text-xs font-black tracking-wide"
                  style={{ color: TEXT }}
                >
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(201,169,97,0.14)",
                      border: "1px solid rgba(201,169,97,0.25)",
                      color: BRAND3,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                    }}
                    aria-hidden="true"
                  >
                    <FontAwesomeIcon icon={ICON_MAP[cat]} />
                  </span>
                  {cat}
                </span>

                <span className="text-[11px] font-black" style={{ color: BRAND2 }}>
                  {percent}%
                </span>
              </div>

              <div
                className="mt-2 h-2 overflow-hidden rounded-full"
                style={{
                  background: "rgba(107,78,47,0.16)",
                  border: "1px solid rgba(107,78,47,0.10)",
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: `linear-gradient(90deg, ${BRAND}, ${BRAND2})`,
                    boxShadow: "0 8px 16px rgba(0,0,0,0.10)",
                  }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
                <span style={{ color: MUTED }}>{count}회 방문</span>
                <span style={{ color: "rgba(43,29,18,0.55)" }}>
                  {safeTotal ? `${count}/${safeTotal}` : "0/0"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <div
          className="h-1"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(201,169,97,0.55), transparent)",
            opacity: 0.9,
          }}
        />
        <p className="mt-2 text-[11px] font-medium" style={{ color: "rgba(107,78,47,0.75)" }}>
          * 카테고리 비율은 최근 기록을 기준으로 계산됩니다.
        </p>
      </div>
    </section>
  );
};

export default TasteCategoryDashboard;