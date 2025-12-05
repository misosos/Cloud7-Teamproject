// frontend/src/components/RecommendationNames.tsx
import React, { useEffect, useState } from "react";

interface RecommendationRow {
  id: number;          // Prisma Recommendation의 PK (number라고 가정)
  kakaoPlaceId: string;
  name: string;
  // 나머지 필드는 지금 안 써서 생략해도 됨
}

const Missions: React.FC = () => {
  const [items, setItems] = useState<RecommendationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/recommendations", {
          credentials: "include", // 세션 쿠키 포함
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "추천 조회 실패");
        }

        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error ?? "추천 조회 실패");
        }

        setItems(data.recommendations ?? []);
      } catch (e: any) {
        console.error("RecommendationNames error:", e);
        setError(e.message ?? "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div>추천 불러오는 중...</div>;
  if (error) return <div>에러: {error}</div>;
  if (items.length === 0) return <div>추천 데이터가 없습니다.</div>;

  return (
    <div style={{ padding: "8px" }}>
      <h3>Recommendation 테이블 장소 이름</h3>
      <ul>
        {items.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default Missions;
