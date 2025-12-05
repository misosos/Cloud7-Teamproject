// frontend/src/components/TasteDashboard.tsx
import React, { useEffect, useState } from "react";

type WeightMap = {
  영화: number;
  공연: number;
  전시: number;
  문화시설: number;
  관광명소: number;
  카페: number;
  식당: number;
};

interface ApiResponse {
  ok: boolean;
  totalStays: number;
  weights: WeightMap;
  tasteRecordId: string;
}

const CATEGORY_ORDER: { key: keyof WeightMap; label: string }[] = [
  { key: "영화", label: "영화" },
  { key: "공연", label: "공연" },
  { key: "전시", label: "전시" },
  { key: "문화시설", label: "문화시설" },
  { key: "관광명소", label: "관광명소" },
  { key: "카페", label: "카페" },
  { key: "식당", label: "식당" },
];

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

const TasteDashboard: React.FC = () => {
  const [weights, setWeights] = useState<WeightMap | null>(null);
  const [totalStays, setTotalStays] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/taste-dashboard/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("대시보드 조회 실패");
        }

        const json: ApiResponse = await res.json();
        if (!json.ok) {
          throw new Error("대시보드 조회 실패");
        }

        setWeights(json.weights);
        setTotalStays(json.totalStays);
      } catch (err) {
        console.error(err);
        setError("취향 대시보드를 불러오는 데 실패했어요.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) return <p>취향 대시보드를 불러오는 중...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  if (!weights || totalStays === 0) {
    return (
      <div
        style={{
          padding: "1rem",
          borderRadius: 16,
          border: "1px solid #eee",
          maxWidth: 480,
        }}
      >
        <h2 style={{ marginBottom: "0.5rem" }}>나의 취향 대시보드</h2>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          아직 머문 장소가 없어서 취향 데이터를 만들 수 없어요.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: 16,
        border: "1px solid #eee",
        maxWidth: 480,
      }}
    >
      <h2 style={{ marginBottom: "0.5rem" }}>나의 취향 대시보드</h2>
      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1rem" }}>
        분석된 머문 장소 수: <b>{totalStays}</b>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {CATEGORY_ORDER.map(({ key, label }) => {
          const v = weights[key] ?? 0;
          const percent = v * 100;
          return (
            <div key={key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                  marginBottom: "0.15rem",
                }}
              >
                <span>{label}</span>
                <span>{percent.toFixed(1)}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderRadius: 999,
                  background: "#f0f0f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "#2f80ed",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TasteDashboard;
