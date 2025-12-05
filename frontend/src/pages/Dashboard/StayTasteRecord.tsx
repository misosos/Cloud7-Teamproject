// frontend/src/components/taste/StayTasteDashboard.tsx

import React, { useEffect, useState } from "react";

type TrackedCategory =
  | "영화"
  | "공연"
  | "전시"
  | "문화시설"
  | "관광명소"
  | "카페"
  | "식당";

interface DashboardResponse {
  ok: boolean;
  totalStays: number;
  weights: Record<TrackedCategory, number>; // 0~1 비율
  // dashboardRecord 같은 다른 필드가 있어도 무시해도 됨
}

const CATEGORY_META: { key: TrackedCategory; label: string; emoji: string }[] = [
  { key: "영화", label: "영화", emoji: "🎬" },
  { key: "공연", label: "공연/라이브", emoji: "🎤" },
  { key: "전시", label: "전시/미술", emoji: "🖼️" },
  { key: "문화시설", label: "문화시설", emoji: "🏛️" },
  { key: "관광명소", label: "관광명소", emoji: "🗺️" },
  { key: "카페", label: "카페", emoji: "☕" },
  { key: "식당", label: "식당", emoji: "🍽️" },
];

const StayTasteRecord: React.FC = () => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/taste-records/dashboard", {
          method: "GET",
          credentials: "include", // 세션 연동
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "대시보드 정보를 불러오지 못했습니다.");
        }

        const json = (await res.json()) as DashboardResponse;

        if (!json.ok) {
          throw new Error("대시보드 응답이 올바르지 않습니다.");
        }

        setData(json);
      } catch (err: any) {
        console.error("stay taste dashboard error", err);
        setError(err.message ?? "대시보드 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ───────────────── UI ─────────────────

  if (loading && !data) {
    return (
      <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow p-4">
        <p className="text-sm text-stone-600">취향 대시보드를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow p-4">
        <p className="text-sm text-red-600">⚠ {error}</p>
      </div>
    );
  }

  if (!data) {
    return null; // 아직 아무것도 없는 초기 상태
  }

  const { totalStays, weights } = data;

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-stone-800">
          머문 장소 기반 취향 대시보드
        </h2>
        <span className="text-xs text-stone-500">
          총 머문 장소 수: <strong>{totalStays}</strong>
        </span>
      </div>

      {totalStays === 0 ? (
        <p className="text-sm text-stone-500">
          아직 머문 장소가 없어요. 밖에 나가서 놀다가 10분 이상 머문 장소가 생기면,
          여기에서 취향 비율을 볼 수 있어요 😊
        </p>
      ) : (
        <div className="space-y-3">
          {CATEGORY_META.map(({ key, label, emoji }) => {
            const ratio = weights[key] ?? 0;
            const percent = Math.round(ratio * 100);

            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>
                    {emoji} {label}
                  </span>
                  <span>{percent}%</span>
                </div>
                <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StayTasteRecord;
