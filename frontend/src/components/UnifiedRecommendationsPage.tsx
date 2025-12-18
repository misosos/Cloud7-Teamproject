// src/components/UnifiedRecommendationsPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { fetchUnifiedRecommendations } from "@/api/recommendations";
import GuildRecordModal from "@/components/GuildRecordModal";
import GuildRecordDetailModal from "@/components/GuildRecordDetailModal";
import { fetchMyGuildStatus } from "@/services/guildService";
import { useNavigate } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import toast from "react-hot-toast";

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

/**
 * 현재 위치를 서버에 전송하는 헬퍼 함수
 * - 카카오 로그인 후 페이지 리다이렉트 시 위치 정보가 아직 전송되지 않았을 수 있음
 * - 추천 조회 전에 위치를 먼저 전송하여 데이터가 비어있는 문제 방지
 */
const sendCurrentLocation = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("[UnifiedRecommendations] geolocation not supported");
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const response = await fetch("/api/location/update", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });
          
          if (response.ok) {
            console.log("[UnifiedRecommendations] 위치 전송 성공");
            resolve(true);
          } else {
            console.warn("[UnifiedRecommendations] 위치 전송 실패:", response.status);
            resolve(false);
          }
        } catch (err) {
          console.error("[UnifiedRecommendations] 위치 전송 에러:", err);
          resolve(false);
        }
      },
      (err) => {
        console.warn("[UnifiedRecommendations] 위치 가져오기 실패:", err.message);
        resolve(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
};

const UnifiedRecommendationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"PERSONAL" | "GUILD">("PERSONAL");
  const [guildName, setGuildName] = useState<string | null>(null);
  const [nearbyGuildCount, setNearbyGuildCount] = useState<number>(0);
  const [pending, setPending] = useState<any[]>([]);
  const [achieved, setAchieved] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [guildId, setGuildId] = useState<number | null>(null);
  const [userGuildId, setUserGuildId] = useState<number | null>(null); // 사용자가 속한 길드 ID (PERSONAL 모드용)
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  
  // 기록 작성 모달 상태
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    kakaoPlaceId: string;
    name: string;
  } | null>(null);
  
  // 기록 상세 모달 상태
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // 추천 데이터 로드 함수
  const loadRecommendations = useCallback(async (retryWithLocation = false) => {
    try {
      setLoading(true);
      setError(null);
      setLocationMessage(null);
      
      // 재시도 시 먼저 위치 전송
      if (retryWithLocation) {
        console.log("[UnifiedRecommendations] 위치 전송 후 재시도...");
        await sendCurrentLocation();
        // 위치 전송 후 서버가 처리할 시간을 조금 줌
        await new Promise((r) => setTimeout(r, 500));
      }
      
      const data = await fetchUnifiedRecommendations();
      if (!data.ok) throw new Error("failed");
      
      setMode(data.mode);
      setGuildName(data.guildName ?? null);
      setGuildId(data.guildId ?? null);
      setNearbyGuildCount(data.nearbyGuildMemberCount ?? 0);
      setPending(data.pending || []);
      setAchieved(data.achieved || []);
      
      // 위치 정보가 없어서 결과가 비어있는 경우 메시지 표시
      if ((data as any).message) {
        setLocationMessage((data as any).message);
      }
      
      // 디버깅: 현재 상태 확인
      console.log("[UnifiedRecommendations] 상태:", {
        mode: data.mode,
        guildId: data.guildId,
        pendingCount: data.pending?.length || 0,
        achievedCount: data.achieved?.length || 0,
        message: (data as any).message,
      });
      
      // 처음 로드 시 결과가 비어있고, 재시도하지 않은 경우 → 위치 전송 후 재시도
      if (!retryWithLocation && data.pending?.length === 0 && data.achieved?.length === 0) {
        console.log("[UnifiedRecommendations] 결과가 비어있어서 위치 전송 후 재시도합니다.");
        await loadRecommendations(true);
        return;
      }
    } catch (err) {
      console.error(err);
      setError("추천지를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 페이지 진입 시 먼저 위치를 전송하고 추천 조회
    (async () => {
      // 먼저 현재 위치 전송 시도 (카카오 로그인 후 리다이렉트 시 위치가 아직 없을 수 있음)
      await sendCurrentLocation();
      // 추천 데이터 로드
      await loadRecommendations(false);
    })();
  }, [loadRecommendations]);

  // 사용자가 속한 길드 조회 (PERSONAL 모드에서도 기록 작성 가능하도록)
  useEffect(() => {
    (async () => {
      try {
        const status = await fetchMyGuildStatus();
        if (status.status === "APPROVED" && status.guild) {
          setUserGuildId(status.guild.id);
          console.log("[UnifiedRecommendations] 사용자 길드:", status.guild.id);
        } else {
          console.log("[UnifiedRecommendations] 길드 미가입 또는 승인 대기");
        }
      } catch (err) {
        console.error("길드 상태 조회 실패:", err);
      }
    })();
  }, []);

  const filteredPending = pending.filter((p) =>
    selectedCategory === "ALL"
      ? true
      : p.mappedCategory === selectedCategory,
  );

  return (
    <div className="min-h-screen bg-[#fdf8f1]">
      <HeaderNav />
      
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-6 py-10">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white flex items-center justify-center hover:from-[#9b7f57] hover:to-[#7b5e3f] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
            >
              ←
            </button>
            <h1 className="text-4xl font-black text-[#5a3e25] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              내 주변 놀거리 추천
            </h1>
          </div>
          
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative">
            {/* 고대 문서 장식 */}
            <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            
            {mode === "PERSONAL" ? (
              <p className="text-base leading-relaxed text-[#d4a574] font-medium">
                내 머문 기록과 취향을 바탕으로, 현재 위치 기준 반경 3km 안의 장소를 추천해요.
              </p>
            ) : (
              <p className="text-base leading-relaxed text-[#d4a574] font-medium">
                지금 같은 공간에 있는 연맹원들과의 공통 취향을 바탕으로 추천했어요.
                {guildName && <span className="text-[#f4d7aa]"> (연맹: {guildName})</span>}
                {nearbyGuildCount > 0 && (
                  <span className="text-[#f4d7aa]"> · 함께 있는 연맹원 {nearbyGuildCount}명</span>
                )}
              </p>
            )}
          </div>
        </header>

        {/* 카테고리 필터 */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c.label}
              onClick={() => setSelectedCategory(c.value)}
              className={`rounded-full px-4 py-2 text-sm font-bold tracking-wide transition-all ${
                selectedCategory === c.value
                  ? "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30"
                  : "bg-gradient-to-b from-[#5a3e25] to-[#4a3420] text-[#d4a574] border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] hover:text-[#f4d7aa]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5">
            <p className="text-base text-[#d4a574] font-medium">추천지를 불러오는 중...</p>
          </div>
        )}
        {error && (
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-red-500 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5">
            <p className="text-base text-red-400 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && filteredPending.length === 0 && (
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5">
            <p className="text-base text-[#d4a574] font-medium">
              {locationMessage || "아직 추천할 장소가 없어요. 조금 더 돌아다니면 취향을 파악해볼게요 ☕"}
            </p>
            {locationMessage && (
              <button
                onClick={() => loadRecommendations(true)}
                className="mt-3 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-4 py-2 text-sm font-bold text-white hover:from-[#9b7f57] hover:to-[#7b5e3f] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30"
              >
                🔄 다시 시도
              </button>
            )}
          </div>
        )}

        {/* 추천 리스트 */}
        {!loading && !error && filteredPending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-black mb-3 pb-2 text-[#5a3e25] tracking-wide border-b-2 border-[#6b4e2f]">
              📍 추천 장소
            </h2>
            <ul className="space-y-3">
              {filteredPending.map((p) => (
                <li
                  key={p.id ?? p.kakaoPlaceId}
                  className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.3)] p-4 relative"
                >
                  {/* 고대 문서 장식 */}
                  <div className="absolute top-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-base font-black text-[#f4d7aa] tracking-wide">
                      {p.name}
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof p.distanceMeters === "number" && (
                        <div className="text-xs text-[#d4a574] font-medium">
                          {Math.round(p.distanceMeters)} m
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-[#d4a574] font-medium">
                    {p.mappedCategory} · {p.categoryName}
                  </div>
                  <div className="mt-1 text-sm text-[#d4a574] font-medium">
                    {p.roadAddress || p.address}
                  </div>
                  {p.phone && (
                    <div className="mt-1 text-xs text-[#8b6f47] font-medium">
                      {p.phone}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 방문 완료 섹션 (개인/연맹 상관없이 보여줘도 됨) */}
        <section className="mt-8">
          <h2 className="text-xl font-black mb-3 pb-2 text-[#5a3e25] tracking-wide border-b-2 border-[#6b4e2f]">
            🎯 방문 완료
          </h2>
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative mb-4">
            {/* 고대 문서 장식 */}
            <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            
            <p className="text-base text-[#d4a574] font-medium">
              추천 리스트 중 실제로 방문해본 장소들이에요.
            </p>
          </div>

          {achieved.length === 0 && (
            <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5">
              <p className="text-base text-[#8b6f47] font-medium">
                아직 방문한 장소가 없어요. 추천지를 하나씩 방문해보면 자동으로 채워져요.
              </p>
            </div>
          )}

          {achieved.length > 0 && (
            <ul className="space-y-3">
              {achieved.map((p) => (
                <li
                  key={p.id ?? p.kakaoPlaceId}
                  className="bg-gradient-to-b from-[#4a3420] to-[#3a2818] rounded-lg border-2 border-emerald-600/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.3)] p-4 relative hover:border-emerald-500 transition-all"
                  onClick={() => {
                    if (guildId || userGuildId) {
                      if (p.hasRecord) {
                        // 이미 작성한 기록이 있으면 토스트 메시지 표시
                        toast.error("이미 작성한 기록입니다");
                      } else {
                        // 기록이 없으면 모달 열기
                        setSelectedPlace({
                          kakaoPlaceId: p.kakaoPlaceId,
                          name: p.name,
                        });
                        setRecordModalOpen(true);
                      }
                    } else {
                      alert("연맹에 가입하면 기록을 작성할 수 있어요. 연맹에 가입하고 기록을 남겨보세요!");
                    }
                  }}
                >
                  {/* 고대 문서 장식 */}
                  <div className="absolute top-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-black text-emerald-300 tracking-wide">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {p.stay?.awardedPoints && (
                        <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                          +{p.stay.awardedPoints}점
                        </span>
                      )}
                      {p.stay?.endTime && (
                        <span className="text-xs text-emerald-400 font-medium">
                          방문: {new Date(p.stay.endTime).toLocaleDateString()}
                        </span>
                      )}
                      {/* 길드에 속해있고 5분 이상 머문 기록이 있으면 기록 작성 가능 */}
                      {(guildId || userGuildId) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.hasRecord) {
                              // 이미 작성한 기록이 있으면 토스트 메시지 표시
                              toast.error("이미 작성한 기록입니다");
                            } else {
                              // 기록이 없으면 모달 열기
                              setSelectedPlace({
                                kakaoPlaceId: p.kakaoPlaceId,
                                name: p.name,
                              });
                              setRecordModalOpen(true);
                            }
                          }}
                          className="rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-3 py-1.5 text-xs font-bold text-white hover:from-[#9b7f57] hover:to-[#7b5e3f] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
                        >
                          기록 작성하기
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-emerald-300 font-medium">
                    {p.mappedCategory} · {p.categoryName}
                  </div>
                  <div className="mt-1 text-sm text-emerald-300 font-medium">
                    {p.roadAddress || p.address}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 기록 작성 모달 */}
        {(guildId || userGuildId) && (
          <GuildRecordModal
            open={recordModalOpen}
            onClose={() => {
              setRecordModalOpen(false);
              setSelectedPlace(null);
            }}
            guildId={String(guildId || userGuildId!)}
            kakaoPlaceId={selectedPlace?.kakaoPlaceId}
            placeName={selectedPlace?.name}
            onSaveSuccess={(recordId?: string) => {
              // 기록 저장 성공 시
              setRecordModalOpen(false);
              setSelectedPlace(null);
              
              // 토스트 메시지 표시
              toast.success("기록 작성되었습니다");
              
              // 기록 상세 페이지로 이동
              if (recordId && (guildId || userGuildId)) {
                const targetGuildId = guildId || userGuildId!;
                // 길드 룸 페이지로 이동 (recordId를 쿼리 파라미터로 전달)
                navigate(`/guild/${targetGuildId}/room?recordId=${recordId}`);
              } else {
                // recordId가 없으면 목록만 새로고침
                (async () => {
                  try {
                    const data = await fetchUnifiedRecommendations();
                    if (data.ok) {
                      setPending(data.pending || []);
                      setAchieved(data.achieved || []);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                })();
              }
            }}
          />
        )}
      </main>
    </div>
  );
};

export default UnifiedRecommendationsPage;
