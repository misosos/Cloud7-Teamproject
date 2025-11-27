import React, { useEffect, useState } from "react";
import { getNearbyPlaces } from "../api/places";
import type { Place, MappedCategory } from "../api/places";

interface PlacesListProps {
  x: number; // 현재 위치 경도
  y: number; // 현재 위치 위도
  radius?: number;
}

const CATEGORY_FILTERS: { label: string; value: MappedCategory | "ALL" }[] = [
  { label: "전체", value: "ALL" },
  { label: "영화", value: "영화" },
  { label: "공연", value: "공연" },
  { label: "전시", value: "전시" },
  { label: "문화시설", value: "문화시설" },
  { label: "관광명소", value: "관광명소" },
  { label: "카페", value: "카페" },
  { label: "식당", value: "식당" },
];

const PlacesList: React.FC<PlacesListProps> = ({ x, y, radius = 2000 }) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<MappedCategory | "ALL">("ALL");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getNearbyPlaces({ x, y, radius });
        setPlaces(data);
      } catch (err) {
        console.error(err);
        setError("주변 놀거리 불러오는 데 실패했어요.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [x, y, radius]);

  const filtered = places.filter((p) =>
    selectedCategory === "ALL" ? true : p.mappedCategory === selectedCategory
  );

  return (
    <div style={{ padding: "1rem" }}>
      <h2>주변 놀거리 추천</h2>

      {/* 카테고리 필터 버튼 */}
      <div style={{ marginBottom: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.label}
            onClick={() => setSelectedCategory(c.value)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border:
                selectedCategory === c.value ? "1px solid #333" : "1px solid #ccc",
              background:
                selectedCategory === c.value ? "#333" : "#fff",
              color: selectedCategory === c.value ? "#fff" : "#333",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <p>불러오는 중...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>주변에 추천할 장소가 없어요 😢</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {filtered.map((place) => (
          <li
            key={place.id}
            style={{
              border: "1px solid #eee",
              borderRadius: "12px",
              padding: "0.8rem",
              marginBottom: "0.6rem",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              {place.name}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#555" }}>
              {place.mappedCategory} · {place.categoryName}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#777", marginTop: "0.25rem" }}>
              {place.roadAddress || place.address}
            </div>
            {place.phone && (
              <div style={{ fontSize: "0.8rem", color: "#777", marginTop: "0.15rem" }}>
                {place.phone}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlacesList;
