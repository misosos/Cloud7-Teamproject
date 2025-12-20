// frontend/src/pages/Guild/GuildRoom.tsx
import React, { useEffect, useState } from "react";
import {
  useParams,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import Achievement from "@/components/Achievement";
import BookCard from "@/components/BookCard";
import GuildRecordModal from "@/components/GuildRecordModal";
import GuildRecordDetailModal from "@/components/GuildRecordDetailModal";
import GuildMissionModal from "@/components/GuildMissionModal";
import toast from "react-hot-toast";
import { fetchGuildDetail, type GuildDetailData } from "@/services/guildApi";
import { useAuthUser } from "@/store/authStore";
import { updateGuild } from "@/services/guildService";
import folderImage from "@/assets/ui/folder.png";
import { resolveImageUrl } from "@/api/apiClient";

const BG = "#F7F0E6";
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const BRAND3 = "#4A3420";
const DANGER = "#B42318";

const cardStyle: React.CSSProperties = {
  background: SURFACE,
  border: "1px solid rgba(201,169,97,0.22)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.10)",
  backdropFilter: "blur(10px)",
};

const innerStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.34)",
  border: "1px solid rgba(107,78,47,0.18)",
  boxShadow: "inset 0 2px 12px rgba(0,0,0,0.06)",
};

const GuildRoom: React.FC = () => {
  const { guildId = "" } = useParams<{ guildId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthUser();

  const [data, setData] = useState<GuildDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rightTab, setRightTab] = useState<"dex" | "ranking">("dex");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showRecordDetailModal, setShowRecordDetailModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [guildRecords, setGuildRecords] = useState<any[]>([]);
  const [guildMissions, setGuildMissions] = useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = useState<any[]>([]);

  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [explorersPage, setExplorersPage] = useState(1);

  const [deletingMissionIds, setDeletingMissionIds] = useState<Set<string>>(
    new Set(),
  );

  // 길드 상세 + 도감/미션 로드
  useEffect(() => {
    if (!guildId) return;

    async function load() {
      setLoading(true);
      setNotFound(false);

      const res = await fetchGuildDetail(guildId);
      if (!res) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setData(res);

      // 도감 기록
      try {
        const recordsResponse = await fetch(`/api/guilds/${guildId}/records`, {
          credentials: "include",
        });
        if (recordsResponse.ok) {
          const recordsJson = await recordsResponse.json();
          if (recordsJson.ok && recordsJson.data) setGuildRecords(recordsJson.data);
        }
      } catch (err) {
        console.error("도감 기록 로드 실패:", err);
      }

      // 진행 중 미션
      try {
        const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
          credentials: "include",
        });
        if (missionsResponse.ok) {
          const missionsJson = await missionsResponse.json();
          if (missionsJson.ok && missionsJson.data) setGuildMissions(missionsJson.data);
        }
      } catch (err) {
        console.error("미션 목록 로드 실패:", err);
      }

      // 완료 미션
      try {
        const completedMissionsResponse = await fetch(
          `/api/guilds/${guildId}/missions/completed`,
          { credentials: "include" },
        );
        if (completedMissionsResponse.ok) {
          const completedMissionsJson = await completedMissionsResponse.json();
          if (completedMissionsJson.ok && completedMissionsJson.data) {
            setCompletedMissions(completedMissionsJson.data);
          }
        }
      } catch (err) {
        console.error("완료된 미션 목록 로드 실패:", err);
      }

      setLoading(false);
    }

    load();
  }, [guildId]);

  // URL recordId로 상세 모달 열기
  useEffect(() => {
    if (loading) return;
    const recordId = searchParams.get("recordId");
    if (recordId && recordId !== selectedRecordId) {
      setSelectedRecordId(recordId);
      setShowRecordDetailModal(true);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("recordId");
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [location.search, loading, selectedRecordId, setSearchParams, searchParams]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: BG, color: TEXT }}
      >
        <p className="text-sm font-medium" style={{ color: MUTED }}>
          연맹 공간을 여는 중이에요…
        </p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: BG, color: TEXT }}
      >
        <p className="text-sm font-medium" style={{ color: MUTED }}>
          존재하지 않는 연맹이거나, 아직 준비 중인 연맹이에요.
        </p>
      </div>
    );
  }

  const { guild, explorers, guildDex, inProgressBooks, completedBooks, ranking } = data;

  const hasMyRank = ranking.myRank && ranking.myRank.rank > 0;

  const isOwner = Boolean(
    guild &&
      user &&
      guild.ownerId !== undefined &&
      user.id !== undefined &&
      Number(guild.ownerId) === Number(user.id),
  );

  // 개인 도감 = missionId 없는 기록만
  const personalRecords = guildRecords.filter(
    (r) => r.missionId === null || r.missionId === undefined,
  );

  const now = new Date();
  const totalDexCount = personalRecords.length;
  const thisMonthDexCount = personalRecords.filter((r) => {
    if (!r.createdAt) return false;
    const d = new Date(r.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const ongoingDexCount = (inProgressBooks?.length || 0) + guildMissions.length;
  const completedDexCount = (completedBooks?.length || 0) + completedMissions.length;

  const reloadData = async () => {
    if (!guildId) return;
    setLoading(true);
    setNotFound(false);

    const res = await fetchGuildDetail(guildId);
    if (!res) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setData(res);
    setLoading(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!guild || !isOwner || !guildId) return;

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/uploads/guilds", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(errorText || "이미지 업로드에 실패했습니다.");
      }

      const uploadJson = await uploadResponse.json();
      const uploadedUrl = uploadJson.url;

      if (!uploadJson.ok || !uploadedUrl) {
        throw new Error(uploadJson.error || "이미지 업로드에 실패했습니다.");
      }

      await updateGuild(guildId, { emblemUrl: uploadedUrl });
      await reloadData();
      toast.success("연맹 이미지가 업데이트되었습니다.");
    } catch (err: any) {
      console.error(err);
      setImageError(err?.message || "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: TEXT }}>
      <HeaderNav />

      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-6 py-10 flex items-start gap-8">
        {/* LEFT ASIDE */}
        <aside
          className="w-64 rounded-2xl px-4 pt-6 pb-8 sticky top-24 self-start"
          style={cardStyle}
        >
          <div className="flex flex-col items-stretch gap-5">
            {/* emblem */}
            <div className="relative w-40 h-40 mx-auto flex-shrink-0 group">
              <div
                className="w-full h-full rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid rgba(201,169,97,0.25)",
                  boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
                  background: "rgba(255,255,255,0.34)",
                }}
              >
                {guild.emblemUrl ? (
                  <img
                    src={resolveImageUrl(guild.emblemUrl) || ""}
                    alt={`${guild.name} 연맹 이미지`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i
                      className="fas fa-shield-halved text-4xl"
                      aria-hidden="true"
                      style={{ color: BRAND3 }}
                    />
                  </div>
                )}
              </div>

              {isOwner && (
                <label className="absolute inset-0 cursor-pointer rounded-2xl bg-black/0 hover:bg-black/15 transition flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  <span
                    className="opacity-0 group-hover:opacity-100 text-xs font-black px-3 py-1.5 rounded-xl transition tracking-wide"
                    style={{
                      color: "white",
                      background: "rgba(0,0,0,0.65)",
                      border: "1px solid rgba(201,169,97,0.35)",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <i className="fas fa-image" aria-hidden="true" />
                      {uploadingImage ? "업로드 중..." : "이미지 변경"}
                    </span>
                  </span>
                </label>
              )}

              {imageError && (
                <p className="absolute -bottom-6 left-0 right-0 text-xs text-center font-bold" style={{ color: DANGER }}>
                  {imageError}
                </p>
              )}
            </div>

            {/* guild info */}
            <section className="rounded-2xl px-5 py-6 text-center flex flex-col justify-center gap-3" style={innerStyle}>
              <h2 className="text-xl font-black tracking-tight" style={{ color: TEXT }}>
                {guild.name}
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line font-medium" style={{ color: MUTED }}>
                {guild.description}
              </p>
            </section>

            {/* actions */}
            <div className="flex gap-3 mt-1 justify-center">
              <button
                onClick={() => setShowRecordModal(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-black tracking-wide transition active:scale-[0.99]"
                style={{
                  background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                  color: "white",
                  border: "1px solid rgba(201,169,97,0.30)",
                  boxShadow:
                    "0 12px 28px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <i className="fas fa-scroll" aria-hidden="true" />
                  도감 추가
                </span>
              </button>

              <button
                onClick={() => setShowMissionModal(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-black tracking-wide transition active:scale-[0.99]"
                style={{
                  background: `linear-gradient(180deg, ${BRAND3}, #362415)`,
                  color: "white",
                  border: "1px solid rgba(201,169,97,0.22)",
                  boxShadow:
                    "0 12px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <i className="fas fa-flag" aria-hidden="true" />
                  연맹 미션 추가
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* CENTER */}
        <section className="flex-1 flex flex-col gap-8">
          {/* header */}
          <header>
            <h1 className="text-4xl font-black mb-6 tracking-tight" style={{ color: TEXT }}>
              <span className="inline-flex items-center gap-3">
                <i className="fas fa-compass" aria-hidden="true" style={{ color: BRAND }} />
                탐험가 연맹
              </span>
            </h1>

            <div className="flex gap-6">
              {/* hero image */}
              <div className="relative w-64 h-40 flex-shrink-0 group">
                <div
                  className="w-full h-full rounded-2xl overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.34)",
                    border: "1px solid rgba(201,169,97,0.22)",
                    boxShadow: "0 14px 45px rgba(0,0,0,0.12)",
                  }}
                >
                  {guild.emblemUrl ? (
                    <img
                      src={resolveImageUrl(guild.emblemUrl) || ""}
                      alt={`${guild.name} 연맹 엠블럼`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <i className="fas fa-image text-3xl" aria-hidden="true" style={{ color: BRAND3 }} />
                      <span className="mt-2 text-sm font-black" style={{ color: MUTED }}>
                        연맹 소개 이미지
                      </span>
                    </div>
                  )}
                </div>

                {isOwner && (
                  <label className="absolute inset-0 cursor-pointer rounded-2xl bg-black/0 hover:bg-black/15 transition flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    <span
                      className="opacity-0 group-hover:opacity-100 text-xs font-black px-3 py-1.5 rounded-xl transition tracking-wide"
                      style={{
                        color: "white",
                        background: "rgba(0,0,0,0.65)",
                        border: "1px solid rgba(201,169,97,0.35)",
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <i className="fas fa-camera" aria-hidden="true" />
                        {uploadingImage ? "업로드 중..." : "사진 변경"}
                      </span>
                    </span>
                  </label>
                )}

                {imageError && (
                  <p className="absolute -bottom-6 left-0 right-0 text-xs text-center font-bold" style={{ color: DANGER }}>
                    {imageError}
                  </p>
                )}
              </div>

              {/* intro */}
              <div className="flex-1">
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fas fa-file-lines text-lg" aria-hidden="true" style={{ color: BRAND }} />
                    <h2 className="text-xl font-black tracking-tight" style={{ color: TEXT }}>
                      연맹 소개
                    </h2>
                  </div>
                  <p className="text-base leading-relaxed whitespace-pre-line font-medium" style={{ color: MUTED }}>
                    {guild.intro}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* rules + stats */}
          <section className="grid grid-cols-[2fr,1fr] gap-6">
            <div className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-scale-balanced text-lg" aria-hidden="true" style={{ color: BRAND }} />
                <h2 className="text-xl font-black tracking-tight" style={{ color: TEXT }}>
                  연맹 규칙
                </h2>
              </div>
              <p className="whitespace-pre-line text-base leading-relaxed font-medium" style={{ color: MUTED }}>
                {guild.rules}
              </p>
            </div>

            <div className="rounded-2xl p-5 space-y-2" style={cardStyle}>
              <p className="font-bold" style={{ color: MUTED }}>
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-chart-column" aria-hidden="true" style={{ color: BRAND2 }} />
                  총 연맹 도감 수
                </span>{" "}
                <span className="font-black" style={{ color: TEXT }}>
                  {totalDexCount}
                </span>
                개
              </p>

              <p className="font-bold" style={{ color: MUTED }}>
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-calendar" aria-hidden="true" style={{ color: BRAND2 }} />
                  이달의 도감
                </span>{" "}
                <span className="font-black" style={{ color: TEXT }}>
                  {thisMonthDexCount}
                </span>
                개
              </p>

              <p className="font-bold" style={{ color: MUTED }}>
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-person-running" aria-hidden="true" style={{ color: BRAND2 }} />
                  진행 중 도감
                </span>{" "}
                <span className="font-black" style={{ color: TEXT }}>
                  {ongoingDexCount}
                </span>
                개
              </p>

              <p className="font-bold" style={{ color: MUTED }}>
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-fire" aria-hidden="true" style={{ color: BRAND2 }} />
                  달성 완료 도감
                </span>{" "}
                <span className="font-black" style={{ color: TEXT }}>
                  {completedDexCount}
                </span>
                개
              </p>
            </div>
          </section>

          {/* explorers */}
          <section>
            <h2
              className="text-xl font-black mb-3 pb-2 tracking-tight"
              style={{ color: TEXT, borderBottom: "1px solid rgba(107,78,47,0.22)" }}
            >
              <span className="inline-flex items-center gap-2">
                <i className="fas fa-users" aria-hidden="true" style={{ color: BRAND }} />
                연맹 탐험가 {explorers.length > 0 && `(${explorers.length}명)`}
              </span>
            </h2>

            {(() => {
              const itemsPerPage = 4;
              const totalPages = Math.ceil(explorers.length / itemsPerPage);
              const startIndex = (explorersPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const currentExplorers = explorers.slice(startIndex, endIndex);
              const showPagination = explorers.length > itemsPerPage;

              return (
                <>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {currentExplorers.map((m) => (
                      <div
                        key={m.id}
                        className="min-w-[220px] rounded-2xl p-4"
                        style={cardStyle}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-10 h-10 rounded-full text-base flex items-center justify-center font-black"
                            style={{
                              background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                              color: "white",
                              border: "1px solid rgba(201,169,97,0.26)",
                            }}
                          >
                            {m.name?.[0] ?? "?"}
                          </div>
                          <span className="text-base font-black tracking-tight" style={{ color: TEXT }}>
                            {m.name}
                          </span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: MUTED }}>
                          {m.intro}
                        </p>
                      </div>
                    ))}
                  </div>

                  {showPagination && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExplorersPage((prev) => Math.max(1, prev - 1))}
                        disabled={explorersPage === 1}
                        className="px-4 py-2 rounded-xl font-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                          color: "white",
                          border: "1px solid rgba(201,169,97,0.28)",
                        }}
                      >
                        이전
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setExplorersPage(page)}
                            className="w-10 h-10 rounded-xl font-black transition"
                            style={
                              explorersPage === page
                                ? {
                                    background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                                    color: "white",
                                    border: "1px solid rgba(201,169,97,0.30)",
                                  }
                                : {
                                    background: "rgba(255,255,255,0.34)",
                                    color: MUTED,
                                    border: "1px solid rgba(107,78,47,0.18)",
                                  }
                            }
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExplorersPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={explorersPage === totalPages}
                        className="px-4 py-2 rounded-xl font-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                          color: "white",
                          border: "1px solid rgba(201,169,97,0.28)",
                        }}
                      >
                        다음
                      </button>
                    </div>
                  )}

                  {showPagination && (
                    <div className="mt-2 text-center text-sm font-medium" style={{ color: MUTED }}>
                      {startIndex + 1} - {Math.min(endIndex, explorers.length)} / {explorers.length}명
                    </div>
                  )}
                </>
              );
            })()}
          </section>

          {/* records */}
          <section className="mt-4 space-y-8">
            <h2
              className="text-xl font-black mb-2 pb-2 tracking-tight"
              style={{ color: TEXT, borderBottom: "1px solid rgba(107,78,47,0.22)" }}
            >
              <span className="inline-flex items-center gap-2">
                <i className="fas fa-book" aria-hidden="true" style={{ color: BRAND }} />
                기록
              </span>
            </h2>

            {/* 진행 중 미션 */}
            {guildMissions.length > 0 && (
              <div>
                <h3 className="text-lg font-black mb-3 tracking-tight" style={{ color: MUTED }}>
                  <span className="inline-flex items-center gap-2">
                    <i className="fas fa-person-running" aria-hidden="true" style={{ color: BRAND2 }} />
                    진행 중인 미션
                  </span>
                </h3>

                <div className="relative pb-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                    {guildMissions.map((mission) => {
                      const recordCount = mission.participantCount || 0;
                      return (
                        <div
                          key={mission.id}
                          onClick={() =>
                            navigate(`/guild/${guildId}/missions/${mission.id}/records`)
                          }
                          className="cursor-pointer transform transition-transform hover:scale-[1.02]"
                        >
                          <div
                            className="relative w-full aspect-square rounded-2xl overflow-hidden"
                            style={{
                              border: "1px solid rgba(201,169,97,0.22)",
                              boxShadow: "0 14px 45px rgba(0,0,0,0.12)",
                              background: "rgba(255,255,255,0.34)",
                            }}
                          >
                            <img src={folderImage} alt={mission.title} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent p-3">
                              <p className="text-white font-black text-sm truncate">
                                <span className="inline-flex items-center gap-2">
                                  <i className="fas fa-flag" aria-hidden="true" />
                                  {mission.title}
                                </span>
                              </p>
                              <p className="text-white/80 text-xs truncate">
                                미션 후기 {recordCount}/{mission.limitCount}개
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {inProgressBooks.map((item) => (
                      <BookCard key={item.id} item={item} />
                    ))}
                  </div>

                  <div
                    className="mt-4 h-1.5 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${BRAND}, transparent)`,
                      opacity: 0.65,
                    }}
                  />
                </div>
              </div>
            )}

            {/* 완료된 연맹 미션 */}
            <div>
              <h3 className="text-lg font-black mb-3 tracking-tight" style={{ color: MUTED }}>
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-folder-open" aria-hidden="true" style={{ color: BRAND2 }} />
                  연맹 미션
                </span>
              </h3>

              <div className="relative pb-8">
                {completedMissions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                    {completedMissions.map((mission) => {
                      const recordCount = mission.participantCount || 0;
                      return (
                        <div
                          key={mission.id}
                          onClick={() =>
                            navigate(`/guild/${guildId}/missions/${mission.id}/records`)
                          }
                          className="cursor-pointer transform transition-transform hover:scale-[1.02]"
                        >
                          <div
                            className="relative w-full aspect-square rounded-2xl overflow-hidden"
                            style={{
                              border: "1px solid rgba(201,169,97,0.22)",
                              boxShadow: "0 14px 45px rgba(0,0,0,0.12)",
                              background: "rgba(255,255,255,0.34)",
                            }}
                          >
                            <img src={folderImage} alt={mission.title} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent p-3">
                              <p className="text-white font-black text-sm truncate">
                                <span className="inline-flex items-center gap-2">
                                  <i className="fas fa-check" aria-hidden="true" />
                                  {mission.title}
                                </span>
                              </p>
                              <p className="text-white/80 text-xs truncate">
                                미션 후기 {recordCount}/{mission.limitCount}개
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 font-medium" style={{ color: MUTED }}>
                    완료된 연맹 미션이 없습니다.
                  </div>
                )}

                <div
                  className="mt-4 h-1.5 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${BRAND}, transparent)`,
                    opacity: 0.65,
                  }}
                />
              </div>
            </div>

            {/* 개인 도감 기록 */}
            <div>
              <h3 className="text-lg font-black mb-3 tracking-tight" style={{ color: MUTED }}>
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-fire" aria-hidden="true" style={{ color: BRAND2 }} />
                  개인 도감 기록 {personalRecords.length > 0 ? `(${personalRecords.length}개)` : ""}
                </span>
              </h3>

              <div className="relative pb-8">
                {(() => {
                  const itemsPerPage = 8;
                  const totalPages = Math.ceil(personalRecords.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const currentRecords = personalRecords.slice(startIndex, endIndex);
                  const showPagination = personalRecords.length > itemsPerPage;

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                        {currentRecords.map((record) => (
                          <div
                            key={record.id}
                            onClick={() => {
                              setSelectedRecordId(record.id);
                              setShowRecordDetailModal(true);
                            }}
                            className="cursor-pointer transform transition-transform hover:scale-[1.02]"
                          >
                            <div
                              className="relative w-full aspect-square rounded-2xl overflow-hidden"
                              style={{
                                border: "1px solid rgba(201,169,97,0.22)",
                                boxShadow: "0 14px 45px rgba(0,0,0,0.12)",
                                background: "rgba(255,255,255,0.34)",
                              }}
                            >
                              <img src={folderImage} alt={record.title} className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent p-3">
                                <p className="text-white font-black text-sm truncate">
                                  <span className="inline-flex items-center gap-2">
                                    <i className="fas fa-bookmark" aria-hidden="true" />
                                    {record.title}
                                  </span>
                                </p>
                                <p className="text-white/80 text-xs truncate">
                                  {record.userName || record.userEmail}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {showPagination && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-xl font-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                              color: "white",
                              border: "1px solid rgba(201,169,97,0.28)",
                            }}
                          >
                            이전
                          </button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className="w-10 h-10 rounded-xl font-black transition"
                                style={
                                  currentPage === page
                                    ? {
                                        background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                                        color: "white",
                                        border: "1px solid rgba(201,169,97,0.30)",
                                      }
                                    : {
                                        background: "rgba(255,255,255,0.34)",
                                        color: MUTED,
                                        border: "1px solid rgba(107,78,47,0.18)",
                                      }
                                }
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-xl font-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                              color: "white",
                              border: "1px solid rgba(201,169,97,0.28)",
                            }}
                          >
                            다음
                          </button>
                        </div>
                      )}

                      {showPagination && (
                        <div className="mt-3 text-center text-sm font-medium" style={{ color: MUTED }}>
                          {startIndex + 1} - {Math.min(endIndex, personalRecords.length)} / {personalRecords.length}개
                        </div>
                      )}
                    </>
                  );
                })()}

                <div
                  className="mt-4 h-1.5 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${BRAND}, transparent)`,
                    opacity: 0.65,
                  }}
                />
              </div>
            </div>
          </section>
        </section>

        {/* RIGHT ASIDE */}
        <aside
          className="w-72 max-w-xs rounded-2xl p-4 sticky top-24 self-start"
          style={cardStyle}
        >
          <div className="flex flex-col gap-4">
            {/* tabs */}
            <div
              className="flex text-sm font-black rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(201,169,97,0.18)" }}
            >
              <button
                onClick={() => setRightTab("dex")}
                className="flex-1 py-2 text-center transition"
                style={
                  rightTab === "dex"
                    ? { background: "rgba(201,169,97,0.18)", color: TEXT }
                    : { background: "transparent", color: MUTED }
                }
              >
                <span className="inline-flex items-center gap-2 justify-center">
                  <i className="fas fa-scroll" aria-hidden="true" />
                  연맹도감
                </span>
              </button>

              <button
                onClick={() => setRightTab("ranking")}
                className="flex-1 py-2 text-center transition"
                style={
                  rightTab === "ranking"
                    ? { background: "rgba(201,169,97,0.18)", color: TEXT }
                    : { background: "transparent", color: MUTED }
                }
              >
                <span className="inline-flex items-center gap-2 justify-center">
                  <i className="fas fa-trophy" aria-hidden="true" />
                  랭킹
                </span>
              </button>
            </div>

            {rightTab === "dex" ? (
              <div className="flex flex-col gap-3">
                {/* missions */}
                {guildMissions.map((mission) => {
                  const isDeleting = deletingMissionIds.has(mission.id);

                  const handleDeleteMission = (e: React.MouseEvent) => {
                    e.stopPropagation();

                    toast(
                      (t) => (
                        <div className="flex flex-col gap-3">
                          <p className="font-medium" style={{ color: TEXT }}>
                            “{mission.title}” 미션을 삭제하시겠습니까?
                          </p>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => toast.dismiss(t.id)}
                              className="px-3 py-1.5 text-sm rounded-lg font-bold"
                              style={{
                                background: "rgba(255,255,255,0.8)",
                                color: MUTED,
                                border: "1px solid rgba(107,78,47,0.18)",
                              }}
                            >
                              취소
                            </button>
                            <button
                              onClick={async () => {
                                toast.dismiss(t.id);
                                setDeletingMissionIds((prev) => new Set(prev).add(mission.id));

                                try {
                                  const response = await fetch(
                                    `/api/guilds/${guildId}/missions/${mission.id}`,
                                    { method: "DELETE", credentials: "include" },
                                  );

                                  if (!response.ok) {
                                    const errorText = await response.text();
                                    let errorMessage = "미션 삭제에 실패했습니다.";
                                    try {
                                      const errorJson = JSON.parse(errorText);
                                      errorMessage = errorJson.message || errorMessage;
                                    } catch {
                                      errorMessage = errorText || errorMessage;
                                    }
                                    throw new Error(errorMessage);
                                  }

                                  const json = await response.json();
                                  if (!json.ok) throw new Error(json.message || "미션 삭제에 실패했습니다.");

                                  toast.success("미션이 삭제되었습니다.");

                                  const missionsResponse = await fetch(
                                    `/api/guilds/${guildId}/missions`,
                                    { credentials: "include" },
                                  );
                                  if (missionsResponse.ok) {
                                    const missionsJson = await missionsResponse.json();
                                    if (missionsJson.ok && missionsJson.data) {
                                      setGuildMissions(missionsJson.data);
                                    }
                                  }
                                } catch (err: any) {
                                  console.error("미션 삭제 실패", err);
                                  toast.error(err?.message || "미션 삭제에 실패했습니다.");
                                } finally {
                                  setDeletingMissionIds((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(mission.id);
                                    return newSet;
                                  });
                                }
                              }}
                              className="px-3 py-1.5 text-sm rounded-lg font-black"
                              style={{
                                background: "rgba(180,35,24,0.10)",
                                color: DANGER,
                                border: "1px solid rgba(180,35,24,0.28)",
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ),
                      {
                        duration: 10000,
                        style: {
                          background: "rgba(255,255,255,0.92)",
                          padding: "16px",
                          borderRadius: "14px",
                          border: "1px solid rgba(201,169,97,0.22)",
                          boxShadow: "0 18px 60px rgba(0,0,0,0.12)",
                        },
                      },
                    );
                  };

                  return (
                    <div key={mission.id} className="rounded-2xl p-3" style={innerStyle}>
                      <div
                        onClick={() => {
                          setSelectedMissionId(mission.id);
                          setShowRecordModal(true);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black" style={{ color: TEXT }}>
                            <span className="inline-flex items-center gap-2">
                              <i className="fas fa-flag" aria-hidden="true" style={{ color: BRAND2 }} />
                              {mission.title}
                            </span>
                          </span>

                          {isOwner && (
                            <button
                              type="button"
                              onClick={handleDeleteMission}
                              disabled={isDeleting}
                              className="text-xs px-2 py-1 rounded-lg font-black transition disabled:opacity-50"
                              title="미션 삭제"
                              style={{
                                color: DANGER,
                                background: "rgba(180,35,24,0.10)",
                                border: "1px solid rgba(180,35,24,0.22)",
                              }}
                            >
                              {isDeleting ? "삭제 중..." : "X"}
                            </button>
                          )}
                        </div>

                        <div className="mt-1 text-xs font-medium" style={{ color: MUTED }}>
                          현재 참여 인원: {mission.participantCount}/{mission.limitCount}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* guild dex */}
                {guildDex.map((item) => (
                  <div key={item.id} className="rounded-2xl p-2" style={innerStyle}>
                    <Achievement item={item} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl px-4 py-5 space-y-5" style={innerStyle}>
                <div>
                  <p className="text-base mb-1 font-black" style={{ color: TEXT }}>
                    <span className="inline-flex items-center gap-2">
                      <i className="fas fa-ranking-star" aria-hidden="true" style={{ color: BRAND }} />
                      내 랭킹
                    </span>
                  </p>

                  {hasMyRank ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black" style={{ color: BRAND }}>
                        {ranking.myRank.rank}위
                      </span>
                      <span className="text-sm font-bold" style={{ color: MUTED }}>
                        점수 {ranking.myRank.score}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm font-medium" style={{ color: MUTED }}>
                      아직 랭킹에 오르지 않았어요.
                      <br />
                      연맹 활동을 꾸준히 하면 순위가 매겨질 거예요!
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-base mb-2 font-black" style={{ color: TEXT }}>
                    <span className="inline-flex items-center gap-2">
                      <i className="fas fa-trophy" aria-hidden="true" style={{ color: BRAND }} />
                      상위 랭킹
                    </span>
                  </p>

                  {ranking.top4.length > 0 ? (
                    <ul className="space-y-2">
                      {ranking.top4.map((r) => (
                        <li
                          key={r.rank}
                          className="flex items-center justify-between rounded-full px-4 py-2"
                          style={{
                            background: "rgba(255,255,255,0.38)",
                            border: "1px solid rgba(107,78,47,0.18)",
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-8 h-8 rounded-full text-sm font-black flex items-center justify-center"
                              style={{
                                background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                                color: "white",
                                border: "1px solid rgba(201,169,97,0.26)",
                              }}
                            >
                              {r.rank}
                            </span>
                            <span className="text-sm font-bold whitespace-normal" style={{ color: MUTED }}>
                              {r.name}
                            </span>
                          </div>
                          {r.score > 0 && (
                            <span className="ml-3 text-sm shrink-0 font-black" style={{ color: BRAND }}>
                              {r.score}점
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium" style={{ color: MUTED }}>
                      아직 랭킹 데이터가 없어요.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* 미션 추가 모달 */}
      <GuildMissionModal
        open={showMissionModal}
        onClose={() => setShowMissionModal(false)}
        guildId={guildId}
        onSaveSuccess={async () => {
          try {
            const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
              credentials: "include",
            });
            if (missionsResponse.ok) {
              const missionsJson = await missionsResponse.json();
              if (missionsJson.ok && missionsJson.data) setGuildMissions(missionsJson.data);
            }

            const completedMissionsResponse = await fetch(
              `/api/guilds/${guildId}/missions/completed`,
              { credentials: "include" },
            );
            if (completedMissionsResponse.ok) {
              const completedMissionsJson = await completedMissionsResponse.json();
              if (completedMissionsJson.ok && completedMissionsJson.data) {
                setCompletedMissions(completedMissionsJson.data);
              }
            }
          } catch (err) {
            console.error("미션 목록 로드 실패:", err);
          }
        }}
      />

      {/* 도감 추가 모달 */}
      <GuildRecordModal
        open={showRecordModal}
        onClose={() => {
          setShowRecordModal(false);
          setSelectedMissionId(null);
        }}
        guildId={guildId}
        missionId={selectedMissionId || undefined}
        onSaveSuccess={async () => {
          try {
            const recordsResponse = await fetch(`/api/guilds/${guildId}/records`, {
              credentials: "include",
            });
            if (recordsResponse.ok) {
              const recordsJson = await recordsResponse.json();
              if (recordsJson.ok && recordsJson.data) {
                setGuildRecords(recordsJson.data);
                setCurrentPage(1);
              }
            }
          } catch (err) {
            console.error("도감 기록 로드 실패:", err);
          }

          try {
            const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
              credentials: "include",
            });
            if (missionsResponse.ok) {
              const missionsJson = await missionsResponse.json();
              if (missionsJson.ok && missionsJson.data) setGuildMissions(missionsJson.data);
            }

            const completedMissionsResponse = await fetch(
              `/api/guilds/${guildId}/missions/completed`,
              { credentials: "include" },
            );
            if (completedMissionsResponse.ok) {
              const completedMissionsJson = await completedMissionsResponse.json();
              if (completedMissionsJson.ok && completedMissionsJson.data) {
                setCompletedMissions(completedMissionsJson.data);
              }
            }
          } catch (err) {
            console.error("미션 목록 로드 실패:", err);
          }

          await reloadData();

          if (selectedMissionId) {
            toast.success("미션 후기가 작성되었습니다! 20점을 획득했습니다.");
          } else {
            toast.success("도감이 추가되었습니다! 10점을 획득했습니다.");
          }
          setSelectedMissionId(null);
        }}
      />

      {/* 도감 상세 */}
      {selectedRecordId && (
        <GuildRecordDetailModal
          open={showRecordDetailModal}
          onClose={() => {
            setShowRecordDetailModal(false);
            setSelectedRecordId(null);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete("recordId");
            setSearchParams(newSearchParams, { replace: true });
          }}
          recordId={selectedRecordId}
          guildId={guildId}
          onDeleteSuccess={async () => {
            await reloadData();
            try {
              const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
                credentials: "include",
              });
              if (missionsResponse.ok) {
                const missionsJson = await missionsResponse.json();
                if (missionsJson.ok && missionsJson.data) setGuildMissions(missionsJson.data);
              }

              const completedMissionsResponse = await fetch(
                `/api/guilds/${guildId}/missions/completed`,
                { credentials: "include" },
              );
              if (completedMissionsResponse.ok) {
                const completedMissionsJson = await completedMissionsResponse.json();
                if (completedMissionsJson.ok && completedMissionsJson.data) {
                  setCompletedMissions(completedMissionsJson.data);
                }
              }
            } catch (err) {
              console.error("미션 목록 로드 실패:", err);
            }
          }}
        />
      )}
    </div>
  );
};

export default GuildRoom;