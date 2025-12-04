import React, { useEffect, useState } from "react";
import type { Place, MappedCategory } from "../api/places";
import { getUnifiedRecommendations } from "../api/recommendations";

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

const UnifiedRecommendationsPage: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [achieved, setAchieved] = useState<Place[]>([]);
  const [mode, setMode] = useState<"PERSONAL" | "GUILD">("PERSONAL");
  const [guildName, setGuildName] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<MappedCategory | "ALL">("ALL");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const res = await getUnifiedRecommendations();

        if (!res.ok) {
          setError(res.error || "추천 정보를 불러오는 데 실패했어요.");
          return;
        }

        setMode(res.mode);
        setGuildName(res.guildName || undefined);
        setPlaces(res.places || []);
        setAchieved(res.achieved || []);
      } catch (err) {
        console.error(err);
        setError("추천 정보를 불러오는 데 실패했어요.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filtered = places.filter((p) =>
    selectedCategory === "ALL"
      ? true
      : p.mappedCategory === selectedCategory
  );

  return (
    <div style={{ padding: "1rem" }}>
      <h2>
        {mode === "PERSONAL"
          ? "내 취향 기반 추천"
          : guildName
          ? `연맹 "${guildName}" 함께 가볼 곳`
          : "연맹 추천 가볼 곳"}
      </h2>

      <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
        {mode === "PERSONAL"
          ? "최근 머문 장소와 취향을 바탕으로, 혼자 가도 좋은 곳들을 골라봤어요."
          : "근처에 같은 연맹원이 있어서, 같이 가기 좋은 장소를 추천해드려요."}
      </p>

      {/* 카테고리 필터 버튼 */}
      <div
        style={{
          marginTop: "0.75rem",
          marginBottom: "0.75rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.label}
            onClick={() => setSelectedCategory(c.value)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border:
                selectedCategory === c.value
                  ? "1px solid #333"
                  : "1px solid #ccc",
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
        <p>추천할 장소가 없어요 😢 조금 더 돌아다니면 새로운 곳을 찾아볼게요.</p>
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
            <div
              style={{
                fontSize: "0.8rem",
                color: "#777",
                marginTop: "0.25rem",
              }}
            >
              {place.roadAddress || place.address}
            </div>
            {place.phone && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#777",
                  marginTop: "0.15rem",
                }}
              >
                {place.phone}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* 달성 리스트도 보고 싶으면 아래처럼 섹션 추가 */}
      {achieved.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>
            이미 다녀온 장소들
          </h3>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
            {achieved.map((place) => (
              <li
                key={place.id}
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: "10px",
                  padding: "0.6rem",
                  marginBottom: "0.4rem",
                  opacity: 0.7,
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  {place.name}
                </div>
                <div
                  style={{ fontSize: "0.75rem", color: "#777", marginTop: 2 }}
                >
                  {place.roadAddress || place.address}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UnifiedRecommendationsPage;
