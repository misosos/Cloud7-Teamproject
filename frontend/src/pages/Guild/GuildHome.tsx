// frontend/src/pages/Guild/GuildHome.tsx
import React, { useState, useEffect, useMemo } from "react";
import HeaderNav from "@/components/HeaderNav";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useGuildStatus } from "@/hooks/useGuildStatus";
import { createGuild, leaveGuild, disbandGuild, updateGuild } from "@/services/guildService";
import { useAuthUser } from "@/store/authStore";
import {
  fetchGuildList,
  FILTER_TAGS,
  type GuildListItem,
  type GuildTag,
} from "@/services/guildApi";
import { resolveImageUrl } from "@/api/apiClient";

const GuildHome: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthUser();

  // Warm Oak tokens
  const THEME = {
    bg: "#F7F0E6",
    surface: "rgba(255,255,255,0.55)",
    text: "#2B1D12",
    muted: "#6B4E2F",
    brand: "#C9A961",
    brand2: "#8B6F47",
    brand3: "#4A3420",
    danger: "#B42318",
  };

  const { loading, status, error, refetch } = useGuildStatus();
  const guild = status?.guild;
  const hasGuild = status?.status === "APPROVED" && !!guild;

  const isOwner = Boolean(
    guild &&
      user &&
      guild.ownerId !== undefined &&
      user.id !== undefined &&
      Number(guild.ownerId) === Number(user.id),
  );

  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [maxMembers, setMaxMembers] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [disbanding, setDisbanding] = useState(false);
  const [disbandError, setDisbandError] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "leave" | "disband" | null;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    type: null,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // 연맹 목록
  const [allGuilds, setAllGuilds] = useState<GuildListItem[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [activeTag, setActiveTag] = useState<GuildTag | "전체">("전체");

  const loadGuilds = async () => {
    setLoadingGuilds(true);
    try {
      const data = await fetchGuildList();
      setAllGuilds(data);
    } catch (err) {
      console.error("연맹 목록 불러오기 실패:", err);
    } finally {
      setLoadingGuilds(false);
    }
  };

  useEffect(() => {
    loadGuilds();
  }, []);

  const otherGuilds = useMemo(() => {
    let filtered = allGuilds;

    if (activeTag !== "전체") {
      filtered = filtered.filter((g) => g.tags.includes(activeTag as GuildTag));
    }

    if (keyword.trim()) {
      const term = keyword.trim().toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(term) ||
          (g.intro ?? "").toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [allGuilds, keyword, activeTag]);

  const resetForm = () => {
    setName("");
    setCategory("");
    setDescription("");
    setRules("");
    setTags([]);
    setTagInput("");
    setMaxMembers("");
    setCreateError(null);
    setCreating(false);
  };

  const handleCloseModal = () => {
    setOpenCreate(false);
    resetForm();
  };

  const handleAddTag = () => {
    const sanitized = tagInput.trim().replace(/^#/, "");
    if (!sanitized) return;
    if (tags.includes(sanitized)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, sanitized].slice(0, 8));
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const openConfirmLeave = () => {
    if (!guild) return;

    setConfirmModal({
      open: true,
      type: "leave",
      title: "연맹 탈퇴",
      message: "정말 이 연맹에서 탈퇴하시겠어요?",
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }));
        setLeaving(true);
        setLeaveError(null);

        try {
          await leaveGuild(guild.id);
          await refetch();
          await loadGuilds();
          toast.success("연맹에서 탈퇴했습니다.");
        } catch (err: any) {
          console.error(err);
          setLeaveError(
            err?.data?.message ||
              err?.message ||
              "연맹 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.",
          );
        } finally {
          setLeaving(false);
        }
      },
    });
  };

  const openConfirmDisband = () => {
    if (!guild) return;

    setConfirmModal({
      open: true,
      type: "disband",
      title: "연맹 해체",
      message:
        "정말 이 연맹을 해체하시겠어요?\n연맹이 완전히 삭제되고 모든 연맹원이 자동으로 탈퇴됩니다.\n이 작업은 되돌릴 수 없어요.",
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }));
        setDisbanding(true);
        setDisbandError(null);

        try {
          await disbandGuild(guild.id);
          await refetch();
          toast.success("연맹이 해체되었습니다.");
          navigate("/guild");
        } catch (err: any) {
          console.error(err);
          setDisbandError(
            err?.data?.message ||
              err?.message ||
              "연맹 해체에 실패했습니다. 잠시 후 다시 시도해주세요.",
          );
        } finally {
          setDisbanding(false);
        }
      },
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!guild || !isOwner) return;

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

      await updateGuild(guild.id, { emblemUrl: uploadedUrl });
      await refetch();
      toast.success("연맹 이미지가 업데이트되었습니다.");
    } catch (err: any) {
      console.error(err);
      setImageError(err?.message || "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  // Loading / Error
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: THEME.bg, color: THEME.text }}
      >
        <div
          className="w-full max-w-md rounded-2xl border p-6 text-center shadow-[0_18px_50px_rgba(43,29,18,0.14)]"
          style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
        >
          <div
            className="mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(201,169,97,0.14)", border: "1px solid rgba(201,169,97,0.30)" }}
          >
            <i className="fas fa-spinner fa-spin" style={{ color: THEME.brand }} aria-hidden="true" />
          </div>
          <p className="font-black">연맹 정보를 불러오는 중...</p>
          <p className="text-sm mt-1" style={{ color: THEME.muted }}>
            잠시만 기다려 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: THEME.bg, color: THEME.text }}
      >
        <div
          className="w-full max-w-md rounded-2xl border p-6 shadow-[0_18px_50px_rgba(43,29,18,0.14)]"
          style={{ background: THEME.surface, borderColor: "rgba(180,35,24,0.25)" }}
        >
          <div className="flex gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(180,35,24,0.10)", border: "1px solid rgba(180,35,24,0.20)" }}
            >
              <i className="fas fa-triangle-exclamation" style={{ color: THEME.danger }} aria-hidden="true" />
            </div>
            <div>
              <p className="font-black" style={{ color: THEME.danger }}>
                연맹 정보를 불러오는 중 오류가 발생했어요.
              </p>
              <p className="text-sm mt-1" style={{ color: THEME.muted }}>
                {error.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-oak-stripe" style={{ color: THEME.text }}>
      <HeaderNav />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
        {/* 상단 타이틀 */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-wider" style={{ color: THEME.brand3 }}>
              <span className="inline-flex items-center gap-2">
                <i className="fas fa-compass" style={{ color: THEME.brand }} aria-hidden="true" />
                탐험가 연맹
              </span>
            </h1>
            <p className="text-base font-medium" style={{ color: THEME.muted }}>
              함께 취향을 탐험할 연맹을 찾아보세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="px-6 py-2.5 rounded-2xl text-sm font-black tracking-wide shadow-[0_16px_34px_rgba(43,29,18,0.18)] border active:scale-[0.99] transition whitespace-nowrap"
            style={{
              background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
              color: "#fff",
              borderColor: "rgba(201,169,97,0.25)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              <i className="fas fa-plus" aria-hidden="true" />
              새 탐험가 연맹 만들기
            </span>
          </button>
        </header>

        {/* 가입 연맹 없음 */}
        {!hasGuild && (
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr] gap-6 items-stretch">
            <section
              className="rounded-2xl p-6 border shadow-[0_22px_60px_rgba(43,29,18,0.14)]"
              style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
            >
              <h2 className="text-xl font-black mb-3" style={{ color: THEME.brand3 }}>
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-scroll" style={{ color: THEME.brand }} aria-hidden="true" />
                  탐험가 연맹이란?
                </span>
              </h2>
              <p className="text-base leading-relaxed mb-4 font-medium" style={{ color: THEME.muted }}>
                비슷한 취향을 가진 사람들과 함께 기록을 쌓는 작은 모임이에요.
                <br />
                연맹에 가입하면 연맹 도감, 공동 기록, 랭킹을 함께 즐길 수 있어요.
              </p>

              <div className="mt-4 space-y-2">
                <p className="font-black" style={{ color: THEME.brand3 }}>
                  이용 방법
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm" style={{ color: THEME.muted }}>
                  <li>마음에 드는 탐험가 연맹을 탐색해요.</li>
                  <li>가입 신청을 보내요.</li>
                  <li>연맹장이 승인하면 함께 활동해요.</li>
                </ol>
              </div>
            </section>

            <section
              className="rounded-2xl p-8 flex flex-col items-center justify-center text-center border shadow-[0_22px_60px_rgba(43,29,18,0.14)]"
              style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
            >
              <div
                className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center border"
                style={{
                  background: "rgba(201,169,97,0.14)",
                  borderColor: "rgba(201,169,97,0.30)",
                }}
              >
                <i className="fas fa-location-dot text-2xl" style={{ color: THEME.brand2 }} aria-hidden="true" />
              </div>

              <h2 className="text-xl font-black mb-2" style={{ color: THEME.brand3 }}>
                아직 가입한 탐험가 연맹이 없어요
              </h2>
              <p className="text-base leading-relaxed mb-6 font-medium" style={{ color: THEME.muted }}>
                연맹에 가입하면 나만의 연맹 도감과 랭킹이 열립니다.
              </p>

              <div className="mt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/guild/explore")}
                  className="min-w-[210px] px-6 py-2.5 rounded-2xl text-sm font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition"
                  style={{
                    background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                    color: "#fff",
                    borderColor: "rgba(201,169,97,0.25)",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="fas fa-magnifying-glass" aria-hidden="true" />
                    탐험가 연맹 탐색
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpenCreate(true)}
                  className="min-w-[210px] px-6 py-2.5 rounded-2xl text-sm font-black tracking-wide border active:scale-[0.99] transition"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    color: THEME.brand3,
                    borderColor: "rgba(201,169,97,0.30)",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="fas fa-plus" aria-hidden="true" style={{ color: THEME.brand2 }} />
                    새 연맹 만들기
                  </span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* 내 연맹이 있는 경우 */}
        {hasGuild && guild && (
          <section className="space-y-10">
            <section className="space-y-4">
              <header>
                <h2 className="text-2xl font-black mb-1" style={{ color: THEME.brand3 }}>
                  <span className="inline-flex items-center gap-2">
                    <i className="fas fa-users" style={{ color: THEME.brand }} aria-hidden="true" />
                    내 탐험가 연맹
                  </span>
                </h2>
                <p className="text-base font-medium" style={{ color: THEME.muted }}>
                  내가 속한 탐험가 연맹이에요. 연맹 공간에 들어가 도감과 기록을 함께 관리해 보세요.
                </p>
              </header>

              <article
                className="rounded-2xl border p-6 shadow-[0_22px_60px_rgba(43,29,18,0.14)] flex items-center gap-5 relative overflow-hidden"
                style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
              >
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 group">
                  <div
                    className="w-full h-full rounded-2xl overflow-hidden border shadow-[0_14px_40px_rgba(43,29,18,0.18)] flex items-center justify-center"
                    style={{ borderColor: "rgba(201,169,97,0.35)", background: "rgba(201,169,97,0.10)" }}
                  >
                    {guild.emblemUrl ? (
                      <img
                        src={resolveImageUrl(guild.emblemUrl) || ""}
                        alt={`${guild.name} 연맹 이미지`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <i className="fas fa-shield" style={{ color: THEME.brand2, fontSize: 26 }} aria-hidden="true" />
                    )}
                  </div>

                  {isOwner && (
                    <label className="absolute inset-0 cursor-pointer rounded-2xl bg-black/0 hover:bg-black/15 transition flex items-center justify-center group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <span
                        className="opacity-0 group-hover:opacity-100 text-xs font-black px-3 py-1.5 rounded-full border shadow-lg transition"
                        style={{
                          background: "rgba(43,29,18,0.75)",
                          color: "#fff",
                          borderColor: "rgba(201,169,97,0.55)",
                        }}
                      >
                        {uploadingImage ? "업로드 중..." : "이미지 변경"}
                      </span>
                    </label>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="text-lg sm:text-xl font-black truncate" style={{ color: THEME.brand3 }}>
                    {guild.name}
                  </h3>
                  <p className="text-sm line-clamp-2 font-medium" style={{ color: THEME.muted }}>
                    {guild.description}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 text-xs sm:text-sm">
                  <button
                    type="button"
                    onClick={() => navigate(`/guild/${guild.id}/room`)}
                    className="rounded-2xl px-4 py-2 text-xs sm:text-sm font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition"
                    style={{
                      background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                      color: "#fff",
                      borderColor: "rgba(201,169,97,0.25)",
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <i className="fas fa-door-open" aria-hidden="true" />
                      연맹 공간 입장
                    </span>
                  </button>

                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/guild/${guild.id}/manage`)}
                        className="rounded-2xl px-4 py-2 text-xs sm:text-sm font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition"
                        style={{
                          background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                          color: "#fff",
                          borderColor: "rgba(201,169,97,0.25)",
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <i className="fas fa-clipboard-list" aria-hidden="true" />
                          가입 신청 관리
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={openConfirmDisband}
                        disabled={disbanding}
                        className="rounded-2xl px-4 py-2 text-xs sm:text-sm font-black tracking-wide border active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: "rgba(180,35,24,0.10)",
                          color: THEME.danger,
                          borderColor: "rgba(180,35,24,0.28)",
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
                          {disbanding ? "해체 중..." : "연맹 해체"}
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={openConfirmLeave}
                      disabled={leaving}
                      className="rounded-2xl px-4 py-2 text-xs sm:text-sm font-black tracking-wide border active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        background: "rgba(43,29,18,0.06)",
                        color: THEME.brand3,
                        borderColor: "rgba(201,169,97,0.30)",
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <i className="fas fa-right-from-bracket" aria-hidden="true" />
                        {leaving ? "탈퇴 중..." : "연맹 탈퇴"}
                      </span>
                    </button>
                  )}

                  {leaveError && <p className="text-xs font-bold" style={{ color: THEME.danger }}>{leaveError}</p>}
                  {disbandError && <p className="text-xs font-bold" style={{ color: THEME.danger }}>{disbandError}</p>}
                  {imageError && <p className="text-xs font-bold" style={{ color: THEME.danger }}>{imageError}</p>}
                </div>
              </article>
            </section>

            {/* 다른 연맹 둘러보기 */}
            <section>
              <header className="mb-4">
                <h2 className="text-xl font-black mb-1" style={{ color: THEME.brand3 }}>
                  <span className="inline-flex items-center gap-2">
                    <i className="fas fa-map" style={{ color: THEME.brand }} aria-hidden="true" />
                    다른 탐험가 연맹 둘러보기
                  </span>
                </h2>
                <p className="text-base font-medium" style={{ color: THEME.muted }}>
                  다른 연맹도 탐색해보고 가입 신청을 보내보세요.
                </p>
              </header>

              {/* 필터/검색 */}
              <div
                className="mb-6 rounded-2xl border overflow-hidden shadow-[0_22px_60px_rgba(43,29,18,0.12)]"
                style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
              >
                <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-4 pb-3 border-b"
                     style={{ borderColor: "rgba(201,169,97,0.22)" }}>
                  {FILTER_TAGS.map((tag) => {
                    const isActive = activeTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveTag(tag === "전체" ? "전체" : (tag as GuildTag))}
                        className="px-3 py-1.5 rounded-full text-xs sm:text-[13px] font-black tracking-wide border transition"
                        style={{
                          background: isActive
                            ? `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`
                            : "rgba(255,255,255,0.55)",
                          color: isActive ? "#fff" : THEME.brand3,
                          borderColor: isActive ? "rgba(201,169,97,0.25)" : "rgba(201,169,97,0.30)",
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}

                  <span className="ml-auto hidden sm:inline text-xs font-bold" style={{ color: THEME.muted }}>
                    총 {allGuilds.length}개의 탐험가 연맹
                  </span>
                </div>

                <div className="px-4 sm:px-6 py-4">
                  <div className="relative">
                    <i
                      className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: THEME.muted }}
                      aria-hidden="true"
                    />
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      type="text"
                      placeholder="연맹 이름이나 소개를 검색해 보세요."
                      className="w-full rounded-2xl border px-10 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={{
                        background: "rgba(255,255,255,0.55)",
                        borderColor: "rgba(201,169,97,0.30)",
                        color: THEME.text,
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold"
                          style={{ color: THEME.muted }}>
                      {otherGuilds.length}개 결과
                    </span>
                  </div>
                </div>
              </div>

              {/* 목록 */}
              {loadingGuilds ? (
                <div
                  className="rounded-2xl border px-6 py-10 text-center text-base font-medium"
                  style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)", color: THEME.muted }}
                >
                  연맹을 불러오는 중이에요…
                </div>
              ) : otherGuilds.length === 0 ? (
                <div
                  className="rounded-2xl border px-6 py-10 text-center text-base font-medium"
                  style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)", color: THEME.muted }}
                >
                  {keyword.trim() ? "검색 조건에 맞는 다른 연맹이 없어요." : "다른 탐험가 연맹이 아직 없어요."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {otherGuilds.map((g) => {
                    const isClosed = g.status === "모집 마감";
                    const isMyCreatedGuild = Boolean(
                      user &&
                        g.ownerId !== undefined &&
                        user.id !== undefined &&
                        Number(g.ownerId) === Number(user.id),
                    );
                    const isMyCurrentGuild = Boolean(guild && String(g.id) === String(guild.id));

                    return (
                      <article
                        key={g.id}
                        className="rounded-2xl border p-5 shadow-[0_22px_60px_rgba(43,29,18,0.12)] hover:-translate-y-0.5 transition"
                        style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-xl font-black leading-snug truncate" style={{ color: THEME.brand3 }}>
                              {g.name}
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed line-clamp-2 font-medium" style={{ color: THEME.muted }}>
                              {g.intro}
                            </p>
                          </div>

                          <span
                            className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black border whitespace-nowrap"
                            style={{
                              background: isClosed ? "rgba(180,35,24,0.10)" : "rgba(34,197,94,0.12)",
                              color: isClosed ? THEME.danger : "#166534",
                              borderColor: isClosed ? "rgba(180,35,24,0.22)" : "rgba(34,197,94,0.22)",
                            }}
                          >
                            {isClosed ? "모집 마감" : "모집 중"}
                          </span>
                        </div>

                        {g.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {g.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border"
                                style={{
                                  background: "rgba(255,255,255,0.55)",
                                  color: THEME.brand3,
                                  borderColor: "rgba(201,169,97,0.28)",
                                }}
                              >
                                <i className="fas fa-hashtag" aria-hidden="true" style={{ color: THEME.brand }} />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-sm space-y-1">
                            <p style={{ color: THEME.muted }}>
                              인원{" "}
                              <span className="font-black" style={{ color: THEME.brand3 }}>
                                {g.currentMembers} / {g.maxMembers}
                              </span>
                            </p>
                            <p style={{ color: THEME.muted }}>
                              상태{" "}
                              <span className="font-black" style={{ color: isClosed ? THEME.danger : "#166534" }}>
                                {g.status}
                              </span>
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={isClosed || isMyCreatedGuild || isMyCurrentGuild}
                            onClick={() => {
                              if (isClosed || isMyCreatedGuild || isMyCurrentGuild) return;
                              navigate(`/guild/${g.id}`);
                            }}
                            className="rounded-2xl px-5 py-2 text-sm font-black tracking-wide border active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                              background:
                                isClosed || isMyCreatedGuild || isMyCurrentGuild
                                  ? "rgba(43,29,18,0.06)"
                                  : `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                              color:
                                isClosed || isMyCreatedGuild || isMyCurrentGuild
                                  ? THEME.muted
                                  : "#fff",
                              borderColor: "rgba(201,169,97,0.30)",
                            }}
                          >
                            {isClosed ? "모집 마감" : isMyCreatedGuild || isMyCurrentGuild ? "내 연맹" : "자세히 보기"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        )}
      </main>

      {/* 생성 모달 */}
      {openCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-[0_22px_60px_rgba(43,29,18,0.18)]"
            style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black" style={{ color: THEME.brand3 }}>
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-plus" style={{ color: THEME.brand2 }} aria-hidden="true" />
                  새 탐험가 연맹 만들기
                </span>
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-10 h-10 rounded-2xl border flex items-center justify-center active:scale-[0.98] transition"
                style={{ borderColor: "rgba(201,169,97,0.30)", color: THEME.brand3, background: "rgba(255,255,255,0.55)" }}
                aria-label="닫기"
              >
                <i className="fas fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setCreateError(null);

                if (!name.trim()) {
                  setCreateError("연맹 이름을 입력해 주세요.");
                  return;
                }
                if (typeof maxMembers === "number" && maxMembers < 2) {
                  setCreateError("제한 인원은 2명 이상이어야 합니다.");
                  return;
                }

                try {
                  setCreating(true);

                  await createGuild({
                    name: name.trim(),
                    category: category.trim() || undefined,
                    description: description.trim() || undefined,
                    rules: rules.trim() || undefined,
                    tags: tags.length ? tags : undefined,
                    maxMembers: typeof maxMembers === "number" ? maxMembers : undefined,
                  });

                  setOpenCreate(false);
                  resetForm();

                  await refetch();
                  await loadGuilds();

                  toast.success("연맹이 성공적으로 만들어졌습니다!");
                  navigate("/guild/explore");
                } catch (err) {
                  console.error(err);
                  setCreateError("연맹 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
                } finally {
                  setCreating(false);
                }
              }}
              className="space-y-4"
            >
              {/* inputs */}
              {[
                {
                  label: "연맹 이름",
                  required: true,
                  value: name,
                  setValue: setName,
                  placeholder: "예) 야간 러닝 탐험가 연맹",
                  icon: "fas fa-pen-nib",
                },
                {
                  label: "카테고리",
                  required: false,
                  value: category,
                  setValue: setCategory,
                  placeholder: "예) 러닝, 보드게임, 스터디...",
                  icon: "fas fa-tags",
                },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                    {f.label}
                    {f.required && <span className="ml-1" style={{ color: THEME.danger }}>*</span>}
                  </label>
                  <div className="relative">
                    <i className={`${f.icon} absolute left-3 top-1/2 -translate-y-1/2`} style={{ color: THEME.muted }} aria-hidden="true" />
                    <input
                      className="w-full rounded-2xl border px-10 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={{
                        background: "rgba(255,255,255,0.55)",
                        borderColor: "rgba(201,169,97,0.30)",
                        color: THEME.text,
                      }}
                      value={f.value}
                      onChange={(e) => f.setValue(e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                  연맹 설명
                </label>
                <textarea
                  className="w-full rounded-2xl border px-4 py-2.5 text-sm min-h-[90px] focus:outline-none focus:ring-2"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    borderColor: "rgba(201,169,97,0.30)",
                    color: THEME.text,
                  }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="연맹 분위기, 모집 대상, 활동 시간대 등을 적어 주세요."
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                  연맹 규칙
                </label>
                <textarea
                  className="w-full rounded-2xl border px-4 py-2.5 text-sm min-h-[90px] focus:outline-none focus:ring-2"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    borderColor: "rgba(201,169,97,0.30)",
                    color: THEME.text,
                  }}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="연맹원들이 지켜야 할 규칙을 적어 주세요."
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                  해시태그
                </label>

                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-2xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: "rgba(255,255,255,0.55)",
                      borderColor: "rgba(201,169,97,0.30)",
                      color: THEME.text,
                    }}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="#야간러닝"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2.5 rounded-2xl text-sm font-black border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition"
                    style={{
                      background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                      color: "#fff",
                      borderColor: "rgba(201,169,97,0.25)",
                    }}
                  >
                    추가
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border"
                        style={{
                          background: "rgba(255,255,255,0.55)",
                          color: THEME.brand3,
                          borderColor: "rgba(201,169,97,0.28)",
                        }}
                      >
                        <i className="fas fa-hashtag" aria-hidden="true" style={{ color: THEME.brand }} />
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="ml-1 w-5 h-5 rounded-full border flex items-center justify-center"
                          style={{ borderColor: "rgba(201,169,97,0.22)", color: THEME.muted }}
                          aria-label={`${t} 태그 제거`}
                        >
                          <i className="fas fa-xmark text-[10px]" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs mt-1" style={{ color: THEME.muted }}>
                  최대 8개까지 추가할 수 있어요. Enter 키로 빠르게 추가해 보세요.
                </p>
              </div>

              <div>
                <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                  제한 인원
                </label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  className="w-full rounded-2xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    borderColor: "rgba(201,169,97,0.30)",
                    color: THEME.text,
                  }}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="예) 20"
                />
                <p className="text-xs mt-1" style={{ color: THEME.muted }}>
                  최소 2명, 최대 200명까지 설정할 수 있어요.
                </p>
              </div>

              {createError && (
                <div className="rounded-2xl border px-4 py-3" style={{ background: "rgba(180,35,24,0.08)", borderColor: "rgba(180,35,24,0.22)" }}>
                  <p className="text-sm font-bold" style={{ color: THEME.danger }}>
                    {createError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-2xl py-3 text-sm font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                  color: "#fff",
                  borderColor: "rgba(201,169,97,0.25)",
                }}
              >
                {creating ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                    연맹 만드는 중...
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <i className="fas fa-plus" aria-hidden="true" />
                    연맹 만들기
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/35 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-[0_22px_60px_rgba(43,29,18,0.18)]"
            style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
          >
            <div className="mb-4">
              <h2 className="text-xl font-black mb-2" style={{ color: THEME.brand3 }}>
                <span className="inline-flex items-center gap-2">
                  <i
                    className={`fas ${confirmModal.type === "disband" ? "fa-triangle-exclamation" : "fa-right-from-bracket"}`}
                    style={{ color: confirmModal.type === "disband" ? THEME.danger : THEME.brand2 }}
                    aria-hidden="true"
                  />
                  {confirmModal.title}
                </span>
              </h2>
              <p className="text-sm whitespace-pre-line" style={{ color: THEME.muted }}>
                {confirmModal.message}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal((p) => ({ ...p, open: false }))}
                className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-black border active:scale-[0.99] transition"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  color: THEME.brand3,
                  borderColor: "rgba(201,169,97,0.30)",
                }}
              >
                취소
              </button>

              <button
                type="button"
                onClick={confirmModal.onConfirm}
                disabled={leaving || disbanding}
                className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-black border active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background:
                    confirmModal.type === "disband"
                      ? "rgba(180,35,24,0.10)"
                      : `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                  color: confirmModal.type === "disband" ? THEME.danger : "#fff",
                  borderColor:
                    confirmModal.type === "disband"
                      ? "rgba(180,35,24,0.25)"
                      : "rgba(201,169,97,0.25)",
                }}
              >
                {leaving || disbanding ? "처리 중..." : confirmModal.type === "disband" ? "해체하기" : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildHome;