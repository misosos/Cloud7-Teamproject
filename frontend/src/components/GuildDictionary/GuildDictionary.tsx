// src/pages/GuildDictionary/GuildDictionary.tsx

import React, { useEffect, useState } from "react";
import "./GuildDictionary.css"; // 기존 스타일 재활용

// API 응답 타입들 -----------------------------
type GuildPlaceCategory =
  | "영화"
  | "공연"
  | "전시"
  | "문화시설"
  | "관광명소"
  | "카페"
  | "식당";

interface GuildPlace {
  id: string;
  name: string;
  categoryName: string;
  categoryGroupCode: string;
  mappedCategory: GuildPlaceCategory | null;
  lat: number;
  lng: number;
  roadAddress: string;
  address: string;
  distanceMeters: number;
  score: number;
}

interface GuildMemberInfo {
  userId: number;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

interface GuildInfo {
  id: number;
  name: string;
}

interface GuildContextResponse {
  ok: boolean;
  guild: GuildInfo | null;
  center: { lat: number; lng: number } | null;
  members: GuildMemberInfo[];
  hasTasteData: boolean;
  places: GuildPlace[];
  warning?: string; // NO_GUILD, NO_LOCATION 등
}

// 기존 공식도감/개인도감 타입 ------------------
interface Achievement {
  id: number;
  name: string;
  iconPlaceholder: string;
}

interface PersonalChallenge {
  id: number;
  name: string;
  progress: number;
  total: number;
  iconPlaceholder: string;
}

const officialAchievements: Achievement[] = [
  { id: 1, name: "업적1", iconPlaceholder: "아이콘 공백" },
  { id: 2, name: "업적2", iconPlaceholder: "아이콘 공백" },
  { id: 3, name: "업적3", iconPlaceholder: "아이콘 공백" },
  { id: 4, name: "업적4", iconPlaceholder: "아이콘 공백" },
  { id: 5, name: "업적5", iconPlaceholder: "아이콘 공백" },
  { id: 6, name: "업적6", iconPlaceholder: "아이콘 공백" },
];

const personalChallenges: PersonalChallenge[] = [
  { id: 1, name: "개인도전1", progress: 0, total: 1, iconPlaceholder: "아이콘 공백" },
  { id: 2, name: "개인도전2", progress: 0, total: 1, iconPlaceholder: "아이콘 공백" },
  { id: 3, name: "개인도전3", progress: 0, total: 1, iconPlaceholder: "아이콘 공백" },
];

const GuildDictionary: React.FC = () => {
  // 🔥 이 두 줄이 있어야 setGuildContext 빨간 줄이 사라져
  const [guildContext, setGuildContext] =
    useState<GuildContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 연맹 컨텍스트 불러오기 ---------------------
  useEffect(() => {
    const fetchGuildContext = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/guilds/nearby-context", {
          credentials: "include",
        });

        const data: GuildContextResponse = await res.json();
        console.log("🔍 guild context:", data);
        setGuildContext(data); // ← 여기에서 빨간 줄 뜨던 부분
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "연맹 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchGuildContext();
  }, []);

  // 1) 상단: 연맹 도감(공동 추천 + 멤버)
  const renderGuildSection = () => {
    if (loading) {
      return <p>연맹 정보를 불러오는 중...</p>;
    }

    if (error) {
      return <p style={{ color: "red" }}>에러: {error}</p>;
    }

    if (!guildContext) {
      return <p>연맹 정보를 찾을 수 없습니다.</p>;
    }

    const { guild, members, places, warning } = guildContext;

    if (!guild) {
      return <p>아직 가입된 연맹이 없어요. 연맹에 가입해보세요!</p>;
    }

    return (
      <div className="guild-section">
        <h2 className="section-title">연맹 도감</h2>

        <div className="guild-header">
          <h3 className="guild-name">연맹: {guild.name}</h3>
          {warning === "NO_LOCATION" && (
            <p className="guild-warning">
              현재 위치 정보가 없어 공동 추천지는 아직 계산되지 않았어요.
            </p>
          )}
        </div>

        <div className="guild-members">
          <h4>근처 연맹원</h4>
          {members.length === 0 ? (
            <p>반경 500m 안에 함께 있는 연맹원이 없어요.</p>
          ) : (
            <ul>
              {members.map((m) => (
                <li key={m.userId}>
                  {m.name} — 약 {Math.round(m.distanceMeters)}m
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="guild-places">
          <h4>연맹 공동 취향 추천지</h4>
          {places.length === 0 ? (
            <p>아직 추천할 장소가 없어요. 조금 더 돌아다녀 보면 어떨까요?</p>
          ) : (
            <ul>
              {places.map((p) => (
                <li key={p.id}>
                  <strong>[{p.mappedCategory ?? "기타"}]</strong> {p.name}{" "}
                  <span className="place-address">— {p.roadAddress || p.address}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  // 2) 기존 공식도감 + 개인도감 렌더링 -------------------
  const renderAchievementSection = () => (
    <>
      {/* 공식도감 섹션 */}
      <section className="official-section">
        <h2 className="section-title">공식도감</h2>
        <div className="achievement-grid">
          {officialAchievements.map((achievement) => (
            <div key={achievement.id} className="achievement-card">
              <div className="achievement-content">
                <h3 className="achievement-name">{achievement.name}</h3>
                <div className="icon-placeholder">
                  <span className="gear-icon">⚙️</span>
                </div>
                <p className="icon-label">{achievement.iconPlaceholder}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 개인도감 섹션 */}
      <section className="personal-section">
        <h2 className="section-title">개인도감</h2>
        <div className="challenge-list">
          {personalChallenges.map((challenge) => (
            <div key={challenge.id} className="challenge-card">
              <div className="challenge-header">
                <h3 className="challenge-name">{challenge.name}</h3>
                <div className="user-icon-placeholder">
                  <span className="user-icon">👤</span>
                </div>
                <p className="icon-label">{challenge.iconPlaceholder}</p>
              </div>
              <div className="progress-container">
                <div className="progress-bar-wrapper">
                  <span className="progress-label">진행상황예시</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(challenge.progress / challenge.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="progress-status">
                    {challenge.progress >= challenge.total ? "달성" : `or 1/0`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  return (
    <div className="achievement-dictionary">
      {/* 🔥 새로 추가된 연맹 도감 섹션 */}
      {renderGuildSection()}

      {/* 기존 공식도감 + 개인도감 */}
      {renderAchievementSection()}
    </div>
  );
};

export default GuildDictionary;
