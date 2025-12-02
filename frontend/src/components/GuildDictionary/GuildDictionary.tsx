// src/pages/GuildDictionary/GuildDictionary.tsx
import React, { useEffect, useState } from "react";
import "./GuildDictionary.css";

interface NearbyGuildMember {
  userId: number;
  name: string;
  distanceMeters: number;
}

interface GuildPlace {
  id: string;
  name: string;
  mappedCategory: string; // '카페', '문화시설' 등
}

interface GuildContextResponse {
  ok: boolean;
  guild?: { id: number; name: string };
  members: NearbyGuildMember[];
  center?: { lat: number; lng: number };
  places: GuildPlace[];
}

const GuildDictionary: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [guildName, setGuildName] = useState<string>("연맹");
  const [members, setMembers] = useState<NearbyGuildMember[]>([]);
  const [places, setPlaces] = useState<GuildPlace[]>([]);

  useEffect(() => {
    const fetchGuildContext = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/guilds/nearby-context", {
          credentials: "include",
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("/api/guilds/nearby-context error:", text);
          throw new Error("연맹 정보를 가져오지 못했습니다.");
        }

        const data: GuildContextResponse = await res.json();

        if (!data.ok) {
          throw new Error(data as any);
        }

        setGuildName(data.guild?.name ?? "연맹");
        setMembers(data.members ?? []);
        setPlaces(data.places ?? []);
      } catch (err: any) {
        setError(err.message ?? "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    };

    fetchGuildContext();
  }, []);

  return (
    <div className="guild-dictionary">
      {/* 상단: 근처 연맹원 섹션 */}
      <section className="official-section">
        <h2 className="section-title">연맹도감</h2>
        <p className="section-subtitle">
          지금 이 근처에 함께 있는 <strong>{guildName}</strong> 연맹원들
        </p>

        {loading && <p className="info-text">연맹 정보를 불러오는 중...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && members.length === 0 && (
          <p className="info-text">아직 근처에 함께 있는 연맹원이 없어요.</p>
        )}

        <div className="achievement-grid">
          {members.map((m) => (
            <div key={m.userId} className="achievement-card">
              <div className="achievement-content">
                <h3 className="achievement-name">{m.name}</h3>
                <div className="icon-placeholder">
                  <span className="gear-icon">🧭</span>
                </div>
                <p className="icon-label">
                  약 {(m.distanceMeters / 100).toFixed(1)} × 100m 거리
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 하단: 연맹 공동 취향 추천지 섹션 */}
      <section className="personal-section">
        <h2 className="section-title">연맹 공동 취향 추천지</h2>
        <p className="section-subtitle">
          연맹원들의 취향 교집합을 반영해서 고른, 반경 3km 이내 놀거리 리스트
        </p>

        {!loading && !error && places.length === 0 && (
          <p className="info-text">
            아직 추천지가 없어요. 조금만 더 돌아다니면서 취향 데이터를
            모아볼까요?
          </p>
        )}

        <div className="challenge-list">
          {places.map((p) => (
            <div key={p.id} className="challenge-card">
              <div className="challenge-header">
                <h3 className="challenge-name">{p.name}</h3>
                <div className="user-icon-placeholder">
                  <span className="user-icon">📍</span>
                </div>
                <p className="icon-label">{p.mappedCategory}</p>
              </div>
              {/* 나중에 여기다가 "미션" 텍스트나 진행도 추가 가능 */}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default GuildDictionary;
