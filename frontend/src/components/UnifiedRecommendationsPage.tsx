// src/components/UnifiedRecommendationsPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { fetchUnifiedRecommendations } from "@/api/recommendations";
import GuildRecordModal from "@/components/GuildRecordModal";
import GuildRecordDetailModal from "@/components/GuildRecordDetailModal";
import { fetchMyGuildStatus } from "@/services/guildService";
import { useNavigate } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import toast from "react-hot-toast";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faLocationDot,
  faWandMagicSparkles,
  faFilter,
  faRotateRight,
  faMapPin,
  faCheck,
  faPenToSquare,
  faCircleExclamation,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

void GuildRecordDetailModal;

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

// Warm Oak tokens
const BG = "#F7F0E6";
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const BRAND3 = "#4A3420";
const DANGER = "#B42318";

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
      },
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
  const [userGuildId, setUserGuildId] = useState<number | null>(null); // PERSONAL 모드에서도 기록 작성 가능하도록
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  // 기록 작성 모달 상태
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    kakaoPlaceId: string;
    name: string;
  } | null>(null);

  // (사용 안 함) 상세 모달 자리만 유지
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  void detailModalOpen;
  void setDetailModalOpen;
  void selectedRecordId;
  void setSelectedRecordId;

  const navigate = useNavigate();

  const filteredPending = useMemo(() => {
    return pending.filter((p) =>
      selectedCategory === "ALL" ? true : p.mappedCategory === selectedCategory,
    );
  }, [pending, selectedCategory]);

  // 추천 데이터 로드 함수
  const loadRecommendations = useCallback(
    async (retryWithLocation = false) => {
      try {
        setLoading(true);
        setError(null);
        setLocationMessage(null);

        if (retryWithLocation) {
          console.log("[UnifiedRecommendations] 위치 전송 후 재시도...");
          await sendCurrentLocation();
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

        if ((data as any).message) {
          setLocationMessage((data as any).message);
        }

        console.log("[UnifiedRecommendations] 상태:", {
          mode: data.mode,
          guildId: data.guildId,
          pendingCount: data.pending?.length || 0,
          achievedCount: data.achieved?.length || 0,
          message: (data as any).message,
        });

        if (
          !retryWithLocation &&
          (data.pending?.length || 0) === 0 &&
          (data.achieved?.length || 0) === 0
        ) {
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
    },
    [],
  );

  useEffect(() => {
    (async () => {
      await sendCurrentLocation();
      await loadRecommendations(false);
    })();
  }, [loadRecommendations]);

  // 사용자가 속한 길드 조회
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

  const canWriteRecord = Boolean(guildId || userGuildId);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: BG, color: TEXT }}>
      {/* 대시보드와 동일하게: 줄무늬 더 연하게 + 라디얼 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(107,78,47,0.04) 0px, rgba(107,78,47,0.04) 18px, rgba(255,255,255,0.015) 18px, rgba(255,255,255,0.015) 36px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(201,169,97,0.16),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_85%,rgba(107,78,47,0.12),transparent_55%)]" />

      <div className="relative">
        <HeaderNav />

        <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-6 py-10">
          {/* 헤더 섹션 */}
          <header className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                  border: "1px solid rgba(201,169,97,0.30)",
                  boxShadow:
                    "0 10px 24px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
                  color: "#fff",
                }}
                aria-label="뒤로가기"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>

              <h1
                className="text-3xl sm:text-4xl font-black tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
                style={{ color: BRAND3 }}
              >
                <span className="mr-2" aria-hidden="true" style={{ color: BRAND2 }}>
                  <FontAwesomeIcon icon={faLocationDot} />
                </span>
                내 주변 놀거리 추천
              </h1>
            </div>

            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: `linear-gradient(180deg, ${BRAND3}, #3A2818)`,
                border: `1px solid rgba(107,78,47,0.35)`,
                boxShadow: "0 18px 44px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />

              {mode === "PERSONAL" ? (
                <p className="text-base leading-relaxed font-medium" style={{ color: "#D4A574" }}>
                  내 머문 기록과 취향을 바탕으로, 현재 위치 기준 반경 3km 안의 장소를 추천해요.
                </p>
              ) : (
                <p className="text-base leading-relaxed font-medium" style={{ color: "#D4A574" }}>
                  <span className="mr-2" aria-hidden="true" style={{ color: BRAND }}>
                    <FontAwesomeIcon icon={faUsers} />
                  </span>
                  지금 같은 공간에 있는 연맹원들과의 공통 취향을 바탕으로 추천했어요.
                  {guildName && <span style={{ color: "#F4D7AA" }}> (연맹: {guildName})</span>}
                  {nearbyGuildCount > 0 && (
                    <span style={{ color: "#F4D7AA" }}> · 함께 있는 연맹원 {nearbyGuildCount}명</span>
                  )}
                </p>
              )}
            </div>
          </header>

          {/* 카테고리 필터 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2" style={{ color: MUTED }}>
              <span aria-hidden="true" style={{ color: BRAND2 }}>
                <FontAwesomeIcon icon={faFilter} />
              </span>
              <span className="text-sm font-black tracking-wide">카테고리</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((c) => {
                const active = selectedCategory === c.value;
                return (
                  <button
                    key={c.label}
                    onClick={() => setSelectedCategory(c.value)}
                    className="rounded-full px-4 py-2 text-sm font-black tracking-wide transition-all"
                    style={
                      active
                        ? {
                            background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                            color: "#fff",
                            border: "1px solid rgba(201,169,97,0.30)",
                            boxShadow:
                              "0 10px 22px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
                          }
                        : {
                            background: `linear-gradient(180deg, ${BRAND3}, #3A2818)`,
                            color: "#D4A574",
                            border: "1px solid rgba(107,78,47,0.35)",
                            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.35)",
                          }
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 상태 카드들 */}
          {loading && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: SURFACE,
                border: "1px solid rgba(201,169,97,0.25)",
                boxShadow: "0 18px 44px rgba(0,0,0,0.10)",
                backdropFilter: "blur(10px)",
              }}
            >
              <p className="text-base font-medium" style={{ color: MUTED }}>
                추천지를 불러오는 중...
              </p>
            </div>
          )}

          {error && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: SURFACE,
                border: "1px solid rgba(180,35,24,0.35)",
                boxShadow: "0 18px 44px rgba(0,0,0,0.10)",
                backdropFilter: "blur(10px)",
              }}
            >
              <p className="text-base font-black" style={{ color: DANGER }}>
                <span className="mr-2" aria-hidden="true">
                  <FontAwesomeIcon icon={faCircleExclamation} />
                </span>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && filteredPending.length === 0 && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: SURFACE,
                border: "1px solid rgba(201,169,97,0.25)",
                boxShadow: "0 18px 44px rgba(0,0,0,0.10)",
                backdropFilter: "blur(10px)",
              }}
            >
              <p className="text-base font-medium" style={{ color: MUTED }}>
                {locationMessage ||
                  "아직 추천할 장소가 없어요. 조금 더 돌아다니면 취향을 파악해볼게요."}
              </p>

              {locationMessage && (
                <button
                  onClick={() => loadRecommendations(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black tracking-wide transition"
                  style={{
                    background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                    color: "#fff",
                    border: "1px solid rgba(201,169,97,0.30)",
                    boxShadow:
                      "0 10px 22px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
                  }}
                >
                  <FontAwesomeIcon icon={faRotateRight} />
                  다시 시도
                </button>
              )}
            </div>
          )}

          {/* 추천 리스트 */}
          {!loading && !error && filteredPending.length > 0 && (
            <section className="mb-8">
              <h2
                className="text-xl font-black mb-3 pb-2 tracking-wide"
                style={{
                  color: BRAND3,
                  borderBottom: "2px solid rgba(107,78,47,0.35)",
                }}
              >
                <span className="mr-2" aria-hidden="true" style={{ color: BRAND2 }}>
                  <FontAwesomeIcon icon={faWandMagicSparkles} />
                </span>
                추천 장소
              </h2>

              <ul className="space-y-3">
                {filteredPending.map((p) => (
                  <li
                    key={p.id ?? p.kakaoPlaceId}
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: SURFACE,
                      border: "1px solid rgba(107,78,47,0.22)",
                      boxShadow: "0 16px 40px rgba(0,0,0,0.10)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[rgba(201,169,97,0.38)] to-transparent" />

                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div
                          className="text-base font-black tracking-wide truncate"
                          style={{ color: TEXT }}
                        >
                          <span className="mr-2" aria-hidden="true" style={{ color: BRAND2 }}>
                            <FontAwesomeIcon icon={faMapPin} />
                          </span>
                          {p.name}
                        </div>

                        <div className="mt-1 text-sm font-medium" style={{ color: MUTED }}>
                          {p.mappedCategory} · {p.categoryName}
                        </div>

                        <div className="mt-1 text-sm font-medium" style={{ color: MUTED }}>
                          {p.roadAddress || p.address}
                        </div>

                        {p.phone && (
                          <div className="mt-1 text-xs font-medium" style={{ color: "rgba(107,78,47,0.75)" }}>
                            {p.phone}
                          </div>
                        )}
                      </div>

                      {typeof p.distanceMeters === "number" && (
                        <div
                          className="shrink-0 rounded-xl px-3 py-2 text-xs font-black tracking-wide"
                          style={{
                            color: BRAND3,
                            background: "rgba(201,169,97,0.14)",
                            border: "1px solid rgba(201,169,97,0.25)",
                          }}
                        >
                          {Math.round(p.distanceMeters)} m
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 방문 완료 */}
          <section className="mt-8">
            <h2
              className="text-xl font-black mb-3 pb-2 tracking-wide"
              style={{
                color: BRAND3,
                borderBottom: "2px solid rgba(107,78,47,0.35)",
              }}
            >
              <span className="mr-2" aria-hidden="true" style={{ color: BRAND2 }}>
                <FontAwesomeIcon icon={faCheck} />
              </span>
              방문 완료
            </h2>

            <div
              className="rounded-2xl p-5 relative overflow-hidden mb-4"
              style={{
                background: `linear-gradient(180deg, ${BRAND3}, #3A2818)`,
                border: `1px solid rgba(107,78,47,0.35)`,
                boxShadow: "0 18px 44px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              <p className="text-base font-medium" style={{ color: "#D4A574" }}>
                추천 리스트 중 실제로 방문해본 장소들이에요.
              </p>
            </div>

            {achieved.length === 0 && (
              <div
                className="rounded-2xl p-5"
                style={{
                  background: SURFACE,
                  border: "1px solid rgba(107,78,47,0.22)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.10)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p className="text-base font-medium" style={{ color: MUTED }}>
                  아직 방문한 장소가 없어요. 추천지를 하나씩 방문해보면 자동으로 채워져요.
                </p>
              </div>
            )}

            {achieved.length > 0 && (
              <ul className="space-y-3">
                {achieved.map((p) => {
                  const hasRecord = Boolean(p.hasRecord);

                  const openWriteModal = () => {
                    if (!canWriteRecord) {
                      alert("연맹에 가입하면 기록을 작성할 수 있어요. 연맹에 가입하고 기록을 남겨보세요!");
                      return;
                    }
                    if (hasRecord) {
                      toast.error("이미 작성한 기록입니다");
                      return;
                    }
                    setSelectedPlace({ kakaoPlaceId: p.kakaoPlaceId, name: p.name });
                    setRecordModalOpen(true);
                  };

                  return (
                    <li
                      key={p.id ?? p.kakaoPlaceId}
                      className="rounded-2xl p-4 relative overflow-hidden transition-all"
                      style={{
                        background: SURFACE,
                        border: `1px solid ${hasRecord ? "rgba(180,35,24,0.22)" : "rgba(201,169,97,0.25)"}`,
                        boxShadow: "0 16px 40px rgba(0,0,0,0.10)",
                        backdropFilter: "blur(10px)",
                      }}
                      onClick={openWriteModal}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openWriteModal();
                      }}
                    >
                      <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[rgba(201,169,97,0.35)] to-transparent" />

                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div
                            className="text-base font-black tracking-wide truncate"
                            style={{ color: TEXT }}
                          >
                            <span className="mr-2" aria-hidden="true" style={{ color: BRAND2 }}>
                              <FontAwesomeIcon icon={faMapPin} />
                            </span>
                            {p.name}
                          </div>

                          <div className="mt-1 text-sm font-medium" style={{ color: MUTED }}>
                            {p.mappedCategory} · {p.categoryName}
                          </div>

                          <div className="mt-1 text-sm font-medium" style={{ color: MUTED }}>
                            {p.roadAddress || p.address}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {p.stay?.awardedPoints ? (
                            <span
                              className="rounded-full px-3 py-1 text-xs font-black tracking-wide"
                              style={{
                                background: "rgba(201,169,97,0.18)",
                                border: "1px solid rgba(201,169,97,0.25)",
                                color: BRAND3,
                              }}
                            >
                              +{p.stay.awardedPoints}점
                            </span>
                          ) : null}

                          {p.stay?.endTime ? (
                            <span className="text-xs font-medium" style={{ color: "rgba(107,78,47,0.75)" }}>
                              방문: {new Date(p.stay.endTime).toLocaleDateString("ko-KR")}
                            </span>
                          ) : null}

                          {canWriteRecord && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWriteModal();
                              }}
                              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black tracking-wide transition"
                              style={{
                                background: hasRecord
                                  ? `linear-gradient(180deg, rgba(180,35,24,0.85), rgba(180,35,24,0.70))`
                                  : `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                                color: "#fff",
                                border: hasRecord
                                  ? "1px solid rgba(180,35,24,0.25)"
                                  : "1px solid rgba(201,169,97,0.30)",
                                boxShadow:
                                  "0 10px 22px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
                                opacity: hasRecord ? 0.75 : 1,
                                cursor: hasRecord ? "not-allowed" : "pointer",
                              }}
                              disabled={hasRecord}
                              title={hasRecord ? "이미 작성한 기록입니다" : "기록 작성"}
                            >
                              <FontAwesomeIcon icon={faPenToSquare} />
                              기록 작성
                            </button>
                          )}
                        </div>
                      </div>

                      {hasRecord && (
                        <div className="mt-2 text-xs font-black" style={{ color: DANGER }}>
                          이미 기록이 있어요
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 기록 작성 모달 */}
          {canWriteRecord && (
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
                setRecordModalOpen(false);
                setSelectedPlace(null);

                toast.success("기록 작성되었습니다");

                if (recordId && (guildId || userGuildId)) {
                  const targetGuildId = guildId || userGuildId!;
                  navigate(`/guild/${targetGuildId}/room?recordId=${recordId}`);
                } else {
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
    </div>
  );
};

export default UnifiedRecommendationsPage;