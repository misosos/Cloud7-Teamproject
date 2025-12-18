// frontend/src/pages/Guild/GuildHome.tsx
import React, { useState, useEffect, useMemo } from "react";
import HeaderNav from "@/components/HeaderNav";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useGuildStatus } from "@/hooks/useGuildStatus";
import {
  createGuild,
  leaveGuild,
  disbandGuild,
  updateGuild,
} from "@/services/guildService";
import { useAuthUser } from "@/store/authStore";
import {
  fetchGuildList,
  FILTER_TAGS,
  type GuildListItem,
  type GuildTag,
} from "@/services/guildApi";
import folderImage from "@/assets/ui/folder.png";
import { resolveImageUrl } from "@/api/apiClient";

void folderImage;

const GuildHome: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthUser();

  // 백엔드 기반 길드 상태 훅
  const { loading, status, error, refetch } = useGuildStatus();

  // status 내부에 guild가 포함됨
  const guild = status?.guild;

  // 연맹이 있는지 여부
  const hasGuild = status?.status === "APPROVED" && !!guild;

  // 연맹장인지 확인
  const isOwner = Boolean(
    guild &&
      user &&
      guild.ownerId !== undefined &&
      user.id !== undefined &&
      Number(guild.ownerId) === Number(user.id)
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

  //  연맹 목록 상태
  const [allGuilds, setAllGuilds] = useState<GuildListItem[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [activeTag, setActiveTag] = useState<GuildTag | "전체">("전체");
  
  // 연맹 미션 상태
  const [completedMissions, setCompletedMissions] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [missionPage, setMissionPage] = useState(1); // 연맹 미션 페이지네이션

  void completedMissions; void setCompletedMissions;
  void loadingMissions; void setLoadingMissions;
  void missionPage; void setMissionPage;

  //  연맹 목록 불러오기 함수
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

  //  연맹 목록 불러오기
  useEffect(() => {
    loadGuilds();
  }, []);

  // 연맹 미션 목록 불러오기
  const loadCompletedMissions = async () => {
    if (!hasGuild || !guild) return;
    
    setLoadingMissions(true);
    try {
      const response = await fetch(`/api/guilds/${guild.id}/missions/completed`, {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        if (json.ok && json.data) {
          setCompletedMissions(json.data);
        }
      }
    } catch (err) {
      console.error("완료된 미션 목록 불러오기 실패:", err);
    } finally {
      setLoadingMissions(false);
    }
  };

  // 연맹이 있을 때 미션 목록 불러오기
  useEffect(() => {
    if (hasGuild && guild) {
      loadCompletedMissions();
    }
  }, [hasGuild, guild]);

  //  연맹 목록 필터링 (현재 연맹도 포함하되, 내가 만든 연맹인지 표시)
  const otherGuilds = useMemo(() => {
    // 전체 목록 필터링 (현재 연맹 제외하지 않음)
    let filtered = allGuilds;
    
    // 태그 필터링
    if (activeTag !== "전체") {
      filtered = filtered.filter((g) => g.tags.includes(activeTag as GuildTag));
    }
    
    // 검색어 필터링
    if (keyword.trim()) {
      const term = keyword.trim().toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(term) ||
          g.intro.toLowerCase().includes(term)
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

  const handleLeaveGuild = async () => {
    if (!guild) return;

    setConfirmModal({
      open: true,
      type: "leave",
      title: "연맹 탈퇴",
      message: "정말 이 연맹에서 탈퇴하시겠어요?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        setLeaving(true);
        setLeaveError(null);

        try {
          await leaveGuild(guild.id);
          // 상태 재조회
          await refetch();
          // 연맹 목록도 다시 불러오기
          const data = await fetchGuildList();
          setAllGuilds(data);
          toast.success("연맹에서 탈퇴했습니다.");
        } catch (err: any) {
          console.error(err);
          setLeaveError(
            err?.data?.message || err?.message ||
              "연맹 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.",
          );
        } finally {
          setLeaving(false);
        }
      },
    });
  };

  const handleDisbandGuild = async () => {
    if (!guild) return;

    setConfirmModal({
      open: true,
      type: "disband",
      title: "연맹 해체",
      message: "정말 이 연맹을 해체하시겠어요? 연맹이 완전히 삭제되고 모든 연맹원이 자동으로 탈퇴됩니다. 이 작업은 되돌릴 수 없어요.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        setDisbanding(true);
        setDisbandError(null);

        try {
          await disbandGuild(guild.id);
          // 상태 재조회
          await refetch();
          toast.success("연맹이 해체되었습니다.");
          navigate("/guild");
        } catch (err: any) {
          console.error(err);
          setDisbandError(
            err?.data?.message || err?.message ||
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

    // 이미지 파일인지 확인
    if (!file.type.startsWith("image/")) {
      setImageError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 제한 (예: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    try {
      // 1. 이미지 업로드
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

      // 2. 연맹 정보 업데이트
      await updateGuild(guild.id, { emblemUrl: uploadedUrl });

      // 3. 상태 재조회
      await refetch();
      toast.success("연맹 이미지가 업데이트되었습니다.");
    } catch (err: any) {
      console.error(err);
      setImageError(
        err?.message || "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setUploadingImage(false);
      // input 초기화
      event.target.value = "";
    }
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <p className="text-sm text-stone-600">연맹 정보를 불러오는 중...</p>
      </div>
    );
  }

  // 에러 화면(옵션)
  if (error) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">
            연맹 정보를 불러오는 중 오류가 발생했어요.
          </p>
          <p className="text-xs text-stone-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8f1]">
      <HeaderNav />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
        {/* 상단 타이틀 */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#5a3e25] mb-2 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">⚔️ 탐험가 연맹</h1>
            <p className="text-base text-[#6b4e2f] font-medium">
              함께 취향을 탐험할 연맹을 찾아보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition whitespace-nowrap"
          >
            ⚔️ 새 탐험가 연맹 만들기
          </button>
        </header>

       
        {!hasGuild && (
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr] gap-6 items-stretch">
            {/* 왼쪽 설명 카드 */}
            <section className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-6 border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] relative">
              {/* 고대 문서 장식 */}
              <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              
              <h2 className="text-xl font-black mb-3 text-[#f4d7aa] tracking-wide">
                📜 탐험가 연맹이란?
              </h2>
              <p className="text-base text-[#d4a574] leading-relaxed mb-4 font-medium">
                비슷한 취향을 가진 사람들과 함께 기록을 쌓는 작은 모임이에요.
                <br />
                연맹에 가입하면 연맹 도감, 공동 기록, 랭킹을 함께 즐길 수 있어요.
              </p>

              <div className="mt-4 space-y-3 text-base">
                <p className="font-black text-[#f4d7aa] tracking-wide">
                  🗺️ 탐험가 연맹 이용 방법
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#d4a574] font-medium">
                  <li>마음에 드는 탐험가 연맹을 탐색해요.</li>
                  <li>가입 신청을 보내요.</li>
                  <li>연맹장이 승인하면 함께 활동해요.</li>
                </ol>
              </div>
            </section>

            
            <section className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-8 flex flex-col items-center justify-center text-center border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] relative">
              {/* 고대 문서 장식 */}
              <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              
              <div className="w-16 h-16 mb-4 rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#6b4321] flex items-center justify-center text-3xl border-2 border-[#6b4e2f] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                🧭
              </div>
              <h2 className="text-xl font-black text-[#f4d7aa] mb-2 tracking-wide">
                아직 가입한 탐험가 연맹이 없어요
              </h2>
              <p className="text-base text-[#d4a574] leading-relaxed mb-6 font-medium">
                연맹에 가입하면 나만의 연맹 도감과 랭킹이 열립니다.
              </p>

              
              <div className="mt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/guild/explore")}
                  className="min-w-[210px] px-6 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
                >
                  🗺️ 탐험가 연맹 탐색하러 가기
                </button>

                <button
                  type="button"
                  onClick={() => setOpenCreate(true)}
                  className="min-w-[210px] px-6 py-2.5 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
                >
                  ⚔️ 새 탐험가 연맹 만들기
                </button>
              </div>
            </section>
          </div>
        )}

        
        {hasGuild && guild && (
          <section className="space-y-4">
            <header className="mb-4">
              <h2 className="text-2xl font-black text-[#5a3e25] mb-1 tracking-wide">
                ⚔️ 내 탐험가 연맹
              </h2>
              <p className="text-base text-[#6b4e2f] font-medium">
                내가 속한 탐험가 연맹이에요. 연맹 공간에 들어가 도감과 기록을 함께
                관리해 보세요.
              </p>
            </header>

            <article className="rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-6 py-5 flex items-center gap-5 relative overflow-hidden">
              {/* 금속 장식 테두리 */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
              
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 group">
                {/* 나무 프레임 */}
                <div className="absolute inset-0 rounded-lg border-4 border-[#5a3e25] shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_0_30px_rgba(139,90,43,0.4)] pointer-events-none z-10" style={{
                  background: 'linear-gradient(135deg, rgba(139,90,43,0.3) 0%, rgba(90,62,37,0.5) 50%, rgba(139,90,43,0.3) 100%)',
                  clipPath: 'polygon(8px 0, 100% 0, 100% 8px, 100% 100%, 0 100%, 0 8px)'
                }} />
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#5a3315] border-2 border-[#6b4e2f] shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden">
                  {guild.emblemUrl ? (
                    <img
                      src={resolveImageUrl(guild.emblemUrl) || ''}
                      alt={`${guild.name} 연맹 이미지`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-[72%] h-[72%] rounded-lg border-2 border-[#6b4e2f] flex items-center justify-center">
                      <span className="text-3xl text-[#f4d7aa] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">🛡️</span>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <label className="absolute inset-0 cursor-pointer rounded-lg bg-black/0 hover:bg-black/20 transition flex items-center justify-center group z-20">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-black bg-black/70 px-3 py-1.5 rounded border border-[#c9a961] shadow-lg transition tracking-wide">
                      {uploadingImage ? "업로드 중..." : "⚔️ 이미지 변경"}
                    </span>
                  </label>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-[#f4d7aa] tracking-wide">
                  {guild.name}
                </h3>
                <p className="text-xs sm:text-sm text-[#d4a574] line-clamp-2 font-medium">
                  {guild.description}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => navigate(`/guild/${guild.id}/room`)}
                  className="rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-4 py-2 text-xs sm:text-sm font-black text-white tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
                >
                  🏰 연맹 공간 입장하기
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => navigate(`/guild/${guild.id}/manage`)}
                    className="rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-4 py-2 text-xs sm:text-sm font-black text-white tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
                  >
                    📋 가입 신청 관리
                  </button>
                )}
                {!isOwner && (
                  <button
                    type="button"
                    onClick={handleLeaveGuild}
                    disabled={leaving}
                    className="rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] px-4 py-2 text-xs sm:text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {leaving ? "탈퇴 중..." : "🚪 연맹 탈퇴하기"}
                  </button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleDisbandGuild}
                    disabled={disbanding}
                    className="rounded-lg bg-gradient-to-b from-[#4a1f1f] to-[#3a1818] text-red-300 px-4 py-2 text-xs sm:text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-red-600/50 hover:from-[#5a2f2f] hover:to-[#4a2828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disbanding ? "해체 중..." : "⚠️ 연맹 해체하기"}
                  </button>
                )}
                {leaveError && (
                  <p className="text-xs text-red-400 mt-1 font-bold">{leaveError}</p>
                )}
                {disbandError && (
                  <p className="text-xs text-red-400 mt-1 font-bold">{disbandError}</p>
                )}
                {imageError && (
                  <p className="text-xs text-red-400 mt-1 font-bold">{imageError}</p>
                )}
              </div>
            </article>

           

            
            <section className="mt-10">
              <header className="mb-6">
                <h2 className="text-xl font-black text-[#5a3e25] mb-2 tracking-wide">
                  🗺️ 다른 탐험가 연맹 둘러보기
                </h2>
                <p className="text-base text-[#6b4e2f] font-medium">
                  다른 연맹도 탐색해보고 가입 신청을 보내보세요.
                </p>
              </header>

             
              <div className="mb-6 rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] border-2 border-[#6b4e2f] relative overflow-hidden">
                {/* 금속 장식 테두리 */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
                
                <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-4 pb-3 border-b-2 border-[#6b4e2f]">
                  {FILTER_TAGS.map((tag) => {
                    const isActive = activeTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setActiveTag(tag === "전체" ? "전체" : (tag as GuildTag))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-black tracking-wide transition ${
                          isActive
                            ? "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30"
                            : "bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] border border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}

                  <span className="ml-auto hidden text-xs sm:inline text-[#8b6f47] font-bold">
                    총 {allGuilds.length}개의 탐험가 연맹
                  </span>
                </div>

                
                <div className="px-4 sm:px-6 py-4">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#8b6f47] text-sm">
                      🔍
                    </span>
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      type="text"
                      placeholder="연맹 이름이나 소개를 검색해 보세요."
                      className="w-full rounded-lg border-2 border-[#6b4e2f] bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] pl-9 pr-4 py-2.5 text-sm placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b6f47] font-bold">
                      {otherGuilds.length}개 결과
                    </span>
                  </div>
                </div>
              </div>

             
              {loadingGuilds ? (
                <div className="rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] px-6 py-10 text-center text-base text-[#d4a574] font-medium shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                  탐험가 연맹을 불러오는 중이에요…
                </div>
              ) : otherGuilds.length === 0 ? (
                <div className="rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-dashed border-[#6b4e2f] px-6 py-10 text-center text-base text-[#8b6f47] font-medium shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                  {keyword.trim()
                    ? "검색 조건에 맞는 다른 연맹이 없어요."
                    : "다른 탐험가 연맹이 아직 없어요."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {otherGuilds.map((g) => {
                    const isClosed = g.status === "모집 마감";
                    // 내가 만든 연맹인지 확인
                    const isMyCreatedGuild = Boolean(
                      user &&
                        g.ownerId !== undefined &&
                        user.id !== undefined &&
                        Number(g.ownerId) === Number(user.id)
                    );
                    // 현재 가입한 연맹인지 확인
                    const isMyCurrentGuild = Boolean(
                      guild && String(g.id) === String(guild.id)
                    );
                    
                    return (
                      <article
                        key={g.id}
                        className="group relative overflow-hidden rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-5 py-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_12px_32px_rgba(201,169,97,0.3)] transition relative"
                      >
                        {/* 고대 문서 장식 */}
                        <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
                       
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-xl font-black text-[#f4d7aa] leading-snug tracking-wide">
                              {g.name}
                            </h2>
                            <p className="mt-1 text-base text-[#d4a574] leading-relaxed line-clamp-2 font-medium">
                              {g.intro}
                            </p>
                          </div>

                          <span
                            className={`inline-flex items-center rounded-full px-4 py-1.5 text-base font-black tracking-wide ${
                              isClosed
                                ? "bg-gradient-to-b from-[#4a2020] to-[#3a1818] text-red-400 border border-red-600/30"
                                : "bg-gradient-to-b from-[#2a4a2a] to-[#1a3a1a] text-green-400 border border-green-600/30 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]"
                            }`}
                          >
                            {isClosed ? "모집 마감" : "모집 중"}
                          </span>
                        </div>

                      
                        {g.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {g.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-gradient-to-b from-[#4a3420] to-[#3a2818] px-3 py-1 text-sm text-[#d4a574] font-bold border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-base space-y-1">
                            <p className="text-[#d4a574] font-medium">
                              인원{" "}
                              <span className="font-black text-[#f4d7aa]">
                                {g.currentMembers} / {g.maxMembers}
                              </span>
                            </p>
                            <p className="text-[#d4a574] font-medium">
                              상태{" "}
                              <span
                                className={`text-lg font-black ${
                                  isClosed ? "text-red-500" : "text-green-400"
                                }`}
                              >
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
                            className={`rounded-lg px-5 py-2 text-base font-black tracking-wide transition shadow-sm ${
                              isClosed
                                ? "bg-gradient-to-b from-[#4a2020] to-[#3a1818] text-red-400 border border-red-600/30 cursor-default"
                                : isMyCreatedGuild || isMyCurrentGuild
                                ? "bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-stone-400 border border-[#6b4e2f] cursor-default"
                                : "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
                            }`}
                          >
                            {isClosed
                              ? "모집 마감"
                              : isMyCreatedGuild || isMyCurrentGuild
                              ? "내 연맹"
                              : "자세히 보기"}
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

      
      {openCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(88,58,21,0.5)] backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] p-6 relative overflow-hidden">
            {/* 금속 장식 테두리 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            
            {/* 탐험가 스타일 장식 요소 */}
            <div className="absolute top-4 right-16 text-2xl opacity-20 pointer-events-none">🗺️</div>
            <div className="absolute top-6 left-6 text-xl opacity-15 pointer-events-none">🧭</div>
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">⚔️</span>
                <h2 className="text-xl font-black text-[#f4d7aa] tracking-wide">
                  새 탐험가 연맹 만들기
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="relative z-50 text-[#d4a574] hover:text-[#f4d7aa] hover:bg-[#6b4e2f]/60 rounded-full w-9 h-9 flex items-center justify-center transition text-lg font-black cursor-pointer active:scale-95 border border-[#6b4e2f]"
                aria-label="닫기"
              >
                ✕
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

                  const payload = {
                    name: name.trim(),
                    category: category.trim() || undefined,
                    description: description.trim() || undefined,
                    rules: rules.trim() || undefined,
                    tags: tags.length ? tags : undefined,
                    maxMembers:
                      typeof maxMembers === "number" ? maxMembers : undefined,
                  };

                  await createGuild(payload);

                  setOpenCreate(false);
                  resetForm();

                  // 연맹 상태와 목록 새로고침
                  await refetch();
                  await loadGuilds();

                  toast.success("⚔️ 연맹이 성공적으로 만들어졌습니다!");
                  navigate("/guild/explore");
                } catch (err) {
                  console.error(err);
                  setCreateError(
                    "연맹 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
                  );
                } finally {
                  setCreating(false);
                }
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-black mb-2 text-[#f4d7aa] tracking-wide">
                  연맹 이름<span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-4 py-2.5 text-sm bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] transition placeholder:text-[#8b6f47]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예) 야간 러닝 탐험가 연맹"
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-2 text-[#f4d7aa] tracking-wide">
                  카테고리
                </label>
                <input
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-4 py-2.5 text-sm bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] transition placeholder:text-[#8b6f47]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예) 러닝, 보드게임, 스터디..."
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-2 text-[#f4d7aa] tracking-wide">
                  연맹 설명
                </label>
                <textarea
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-4 py-2.5 text-sm min-h-[90px] bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] transition resize-none placeholder:text-[#8b6f47]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="연맹 분위기, 모집 대상, 활동 시간대 등을 적어 주세요."
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-2 text-[#f4d7aa] tracking-wide">
                  연맹 규칙
                </label>
                <textarea
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-4 py-2.5 text-sm min-h-[90px] bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] transition resize-none placeholder:text-[#8b6f47]"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="연맹원들이 지켜야 할 규칙을 적어 주세요."
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-2 text-[#f4d7aa] tracking-wide">
                  해시태그
                </label>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 border-2 border-[#6b4e2f] rounded-lg px-4 py-2.5 text-sm bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] transition placeholder:text-[#8b6f47]"
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
                      className="px-4 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-sm font-black text-white tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
                    >
                      추가
                    </button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#4a3420] to-[#3a2818] border border-[#6b4e2f] px-3 py-1.5 text-xs font-bold text-[#d4a574] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                        >
                          <span>#</span>
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-[11px] text-[#8b6f47] hover:text-[#d4a574] hover:bg-[#6b4e2f]/50 rounded-full w-4 h-4 flex items-center justify-center transition"
                            aria-label={`${tag} 태그 제거`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-[#8b6f47] italic font-medium">
                    최대 8개까지 추가할 수 있어요. Enter 키로 빠르게 추가해 보세요.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black mb-2 text-[#f4d7aa] tracking-wide">
                  제한 인원
                </label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-4 py-2.5 text-sm bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] transition placeholder:text-[#8b6f47]"
                  value={maxMembers}
                  onChange={(e) => {
                    const { value } = e.target;
                    if (value === "") {
                      setMaxMembers("");
                      return;
                    }
                    const parsed = Number(value);
                    if (!Number.isNaN(parsed)) {
                      setMaxMembers(parsed);
                    }
                  }}
                  placeholder="예) 20"
                />
                <p className="text-xs text-[#8b6f47] italic mt-1.5 font-medium">
                  최소 2명, 최대 200명까지 설정할 수 있어요.
                </p>
              </div>

              {createError && (
                <div className="rounded-lg bg-gradient-to-b from-[#4a1f1f] to-[#3a1818] border-2 border-red-600/50 px-4 py-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                  <p className="text-sm text-red-400 font-bold">{createError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] hover:from-[#9b7f57] hover:to-[#7b5e3f] text-white font-black tracking-wide py-3 rounded-lg text-sm shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-[#8b6f47] disabled:hover:to-[#6b4e2f]"
              >
                {creating ? "⚔️ 연맹 만드는 중..." : "⚔️ 연맹 만들기"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(88,58,21,0.6)] backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] p-6 relative overflow-hidden">
            {/* 금속 장식 테두리 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            
            {/* 탐험가 스타일 장식 요소 */}
            <div className="absolute top-4 right-16 text-2xl opacity-20 pointer-events-none">
              {confirmModal.type === "disband" ? "⚠️" : "🚪"}
            </div>
            <div className="absolute top-6 left-6 text-xl opacity-15 pointer-events-none">⚔️</div>

            <div className="mb-5">
              <h2 className="text-xl font-black text-[#f4d7aa] mb-3 flex items-center gap-2 tracking-wide">
                <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {confirmModal.type === "disband" ? "⚠️" : "🚪"}
                </span>
                {confirmModal.title}
              </h2>
              <p className="text-base text-[#d4a574] leading-relaxed font-medium">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                disabled={leaving || disbanding}
                className={`flex-1 px-4 py-2.5 rounded-lg font-black tracking-wide transition shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] disabled:opacity-60 disabled:cursor-not-allowed ${
                  confirmModal.type === "disband"
                    ? "bg-gradient-to-b from-[#6b1f1f] to-[#5a1818] hover:from-[#7b2f2f] hover:to-[#6a2828] text-red-200 border-red-600/50"
                    : "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] hover:from-[#9b7f57] hover:to-[#7b5e3f] text-white border-[#c9a961]/30"
                }`}
              >
                {leaving || disbanding
                  ? "처리 중..."
                  : confirmModal.type === "disband"
                    ? "해체하기"
                    : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildHome;
