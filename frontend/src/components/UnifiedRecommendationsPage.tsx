// src/components/UnifiedRecommendationsPage.tsx
import React, { useEffect, useState } from "react";
import { fetchUnifiedRecommendations } from "@/api/recommendations";

const CATEGORY_FILTERS = [
  { label: "전체", value: "ALL" },
  { label: "영화", value: "영화" },
  { label: "공연", value: "공연" },
  { label: "전시", value: "전시" },
  { label: "문화시설", value: "문화시설" },
  { label: "관광명소", value: "관광명소" },
  { label: "카페", value: "카페" },
  { label: "식당", value: "식당" },
];

const UnifiedRecommendationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"PERSONAL" | "GUILD">("PERSONAL");
  const [guildName, setGuildName] = useState<string | null>(null);
  const [nearbyGuildCount, setNearbyGuildCount] = useState<number>(0);
  const [pending, setPending] = useState<any[]>([]);
  const [achieved, setAchieved] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUnifiedRecommendations();
        if (!data.ok) throw new Error("failed");
        setMode(data.mode);
        setGuildName(data.guildName ?? null);
        setNearbyGuildCount(data.nearbyGuildMemberCount ?? 0);
        setPending(data.pending || []);
        setAchieved(data.achieved || []);
      } catch (err) {
        console.error(err);
        setError("추천지를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredPending = pending.filter((p) =>
    selectedCategory === "ALL"
      ? true
      : p.mappedCategory === selectedCategory,
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-stone-900">
          내 주변 놀거리 추천
        </h1>
        {mode === "PERSONAL" ? (
          <p className="mt-1 text-xs text-stone-500">
            내 머문 기록과 취향을 바탕으로, 현재 위치 기준 반경 3km 안의 장소를
            추천해요.
          </p>
        ) : (
          <p className="mt-1 text-xs text-stone-500">
            지금 같은 공간에 있는 연맹원들과의 공통 취향을 바탕으로 추천했어요.
            {guildName && <span> (연맹: {guildName})</span>}
            {nearbyGuildCount > 0 && (
              <span> · 함께 있는 연맹원 {nearbyGuildCount}명</span>
            )}
          </p>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.label}
            onClick={() => setSelectedCategory(c.value)}
            className={[
              "rounded-full border px-3 py-1 text-xs",
              selectedCategory === c.value
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-800",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-stone-600">추천지를 불러오는 중...</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && filteredPending.length === 0 && (
        <p className="mt-2 text-sm text-stone-500">
          아직 추천할 장소가 없어요. 조금 더 돌아다니면 취향을 파악해볼게요 ☕
        </p>
      )}

      {/* 추천 리스트 */}
      <ul className="mt-3 space-y-2">
        {filteredPending.map((p) => (
          <li
            key={p.id ?? p.kakaoPlaceId}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-stone-900">
                {p.name}
              </div>
              {typeof p.distanceMeters === "number" && (
                <div className="text-[11px] text-stone-400">
                  {Math.round(p.distanceMeters)} m
                </div>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-stone-500">
              {p.mappedCategory} · {p.categoryName}
            </div>
            <div className="mt-0.5 text-[11px] text-stone-500">
              {p.roadAddress || p.address}
            </div>
            {p.phone && (
              <div className="mt-0.5 text-[11px] text-stone-400">
                {p.phone}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* 달성된 도감 섹션 (개인/연맹 상관없이 보여줘도 됨) */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-stone-900">
          달성된 도감
        </h2>
        <p className="mt-1 text-[11px] text-stone-500">
          추천 리스트 중 실제로 방문해본 장소들이에요.
        </p>

        {achieved.length === 0 && (
          <p className="mt-2 text-xs text-stone-400">
            아직 달성된 도감이 없어요. 추천지를 하나씩 방문해보면 자동으로
            채워져요.
          </p>
        )}

        <ul className="mt-2 space-y-2">
          {achieved.map((p) => (
            <li
              key={p.id ?? p.kakaoPlaceId}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-900">
                  {p.name}
                </span>
                {p.stay?.endTime && (
                  <span className="text-[10px] text-emerald-700">
                    방문: {new Date(p.stay.endTime).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-800">
                {p.mappedCategory} · {p.categoryName}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-800">
                {p.roadAddress || p.address}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default UnifiedRecommendationsPage;
