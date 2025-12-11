// src/components/TasteCategoryDashboard.tsx
import React, { useEffect, useState } from "react";
import { fetchTasteDashboard } from "@/api/tasteDashboard";

const CATEGORIES = ["영화", "공연", "전시", "문화시설", "관광명소", "카페", "식당"];

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

  if (loading) return <div className="p-4 text-sm">대시보드를 불러오는 중...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;

  return (
    <section className="m-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">나의 취향 대시보드</h2>
      <p className="mt-1 text-xs text-stone-500">
        최근 머문 장소 기록을 바탕으로 카테고리 비율을 계산했어요.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const ratio = ratios[cat] ?? 0;
          const percent = Math.round(ratio * 100);
          const count = counts[cat] ?? 0;
          return (
            <div
              key={cat}
              className="flex flex-col rounded-xl border border-stone-100 bg-stone-50 px-3 py-2"
            >
              <span className="text-xs font-medium text-stone-700">{cat}</span>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-stone-800"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                <span>{percent}%</span>
                <span>{count}회 방문</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-stone-400">
        총 머문 장소 기록: {total}개
      </p>
    </section>
  );
};

export default TasteCategoryDashboard;
