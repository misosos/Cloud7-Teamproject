// src/components/UnifiedRecommendationsPage.tsx
import React, { useEffect, useState } from "react";
import {
  rebuildRecommendations,
  fetchRecommendationsList,
  type RecommendationRow,
} from "@/api/recommendations";

const CATEGORY_FILTERS = [
  { label: "전체", value: "ALL" },
  { label: "영화", value: "영화" },
  { label: "공연", value: "공연" },
  { label: "전시", value: "전시" },
  { label: "문화시설", value: "문화시설" },
  { label: "관광명소", value: "관광명소" },
  { label: "카페", value: "카페" },
  { label: "식당", value: "식당" },
] as const;

type CategoryFilterValue = (typeof CATEGORY_FILTERS)[number]["value"];

const UnifiedRecommendationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [hasTasteData, setHasTasteData] = useState(false);
  const [items, setItems] = useState<RecommendationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterValue>("ALL");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) 현재 위치 얻기
        const pos = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 20_000,
              maximumAge: 60_000,
            }),
        );

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // 2) 현재 위치 기준으로 추천 재계산 & DB 저장
        const rebuild = await rebuildRecommendations(lat, lng, 3000);
        setHasTasteData(rebuild.hasTasteData);

        // 3) DB에 저장된 추천 목록 조회
        const listRes = await fetchRecommendationsList();
        setItems(listRes.recommendations ?? []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "추천지를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredItems = items.filter((p) =>
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
        <p className="mt-1 text-xs text-stone-500">
          내 머문 기록과 취향을 바탕으로, 현재 위치 기준 반경 3km 안의 장소를 추천해요.
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.value}
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

      {/* ✅ 머문 기록은 없지만, 추천 리스트는 있을 때 안내 배너 */}
      {!loading && !error && !hasTasteData && items.length > 0 && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          아직 머문 기록은 없어서, 일단 7개 카테고리를 골고루 추천해 줄게요 ☕
        </div>
      )}

      {/* ✅ 진짜로 추천할 장소 자체가 없을 때만 empty state */}
      {!loading && !error && items.length === 0 && (
        <p className="mt-2 text-sm text-stone-500">
          주변 3km 안에서 추천할 수 있는 장소를 찾지 못했어요.
          <br />
          위치를 옮겨 보거나, 나중에 다시 시도해 주세요.
        </p>
      )}

      {/* 추천 리스트 */}
      <ul className="mt-3 space-y-2">
        {filteredItems.map((p) => (
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
              {p.mappedCategory ?? "기타"} · {p.categoryName}
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
    </div>
  );
};

export default UnifiedRecommendationsPage;
