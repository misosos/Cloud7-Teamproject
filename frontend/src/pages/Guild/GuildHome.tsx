// frontend/src/pages/Guild/GuildHome.tsx
import React, { useState, useEffect, useMemo } from "react";
import HeaderNav from "@/components/HeaderNav";
import { useNavigate } from "react-router-dom";
import { useGuildStatus } from "@/hooks/useGuildStatus";
import {
  createGuild,
  leaveGuild,
  disbandGuild,
} from "@/services/guildService";
import { useAuthUser } from "@/store/authStore";
import {
  fetchGuildList,
  FILTER_TAGS,
  type GuildListItem,
  type GuildTag,
} from "@/services/guildApi";

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

  //  연맹 목록 상태
  const [allGuilds, setAllGuilds] = useState<GuildListItem[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [activeTag, setActiveTag] = useState<GuildTag | "전체">("전체");

  //  연맹 목록 불러오기
  useEffect(() => {
    async function loadGuilds() {
      setLoadingGuilds(true);
      try {
        const data = await fetchGuildList();
        setAllGuilds(data);
      } catch (err) {
        console.error("연맹 목록 불러오기 실패:", err);
      } finally {
        setLoadingGuilds(false);
      }
    }
    loadGuilds();
  }, []);

  //  현재 연맹을 제외한 다른 연맹 목록 필터링
  const otherGuilds = useMemo(() => {
    if (!guild) {
      // 연맹이 없을 때는 전체 목록 필터링
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
    }
    
    // 현재 연맹 제외
    let filtered = allGuilds.filter((g) => String(g.id) !== String(guild.id));
    
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
  }, [allGuilds, guild, keyword, activeTag]);

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

    if (!confirm("정말 이 연맹에서 탈퇴하시겠어요?")) {
      return;
    }

    setLeaving(true);
    setLeaveError(null);

    try {
      await leaveGuild(guild.id);
      // 상태 재조회
      await refetch();
      // 연맹 목록도 다시 불러오기
      const data = await fetchGuildList();
      setAllGuilds(data);
      alert("연맹에서 탈퇴했습니다.");
    } catch (err: any) {
      console.error(err);
      setLeaveError(
        err?.data?.message || err?.message ||
          "연맹 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setLeaving(false);
    }
  };

  const handleDisbandGuild = async () => {
    if (!guild) return;

    if (
      !confirm(
        "정말 이 연맹을 해체하시겠어요? 연맹이 완전히 삭제되고 모든 연맹원이 자동으로 탈퇴됩니다. 이 작업은 되돌릴 수 없어요.",
      )
    ) {
      return;
    }

    setDisbanding(true);
    setDisbandError(null);

    try {
      await disbandGuild(guild.id);
      // 상태 재조회
      await refetch();
      alert("연맹이 해체되었습니다.");
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
            <h1 className="text-3xl font-bold text-stone-900 mb-2">탐험가 연맹</h1>
            <p className="text-sm text-stone-600">
              함께 취향을 탐험할 연맹을 찾아보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="px-6 py-2.5 rounded-full border border-[#b8834a] bg-white text-[#b8834a] text-sm font-semibold hover:bg-[#f7ebdd] transition whitespace-nowrap"
          >
            새 탐험가 연맹 만들기
          </button>
        </header>

       
        {!hasGuild && (
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr] gap-6 items-stretch">
            {/* 왼쪽 설명 카드 */}
            <section className="bg-[#f4f0ea] rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-3 text-stone-900">
                탐험가 연맹이란?
              </h2>
              <p className="text-sm text-stone-700 leading-relaxed mb-4">
                비슷한 취향을 가진 사람들과 함께 기록을 쌓는 작은 모임이에요.
                <br />
                연맹에 가입하면 연맹 도감, 공동 기록, 랭킹을 함께 즐길 수 있어요.
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <p className="font-semibold text-stone-900">
                  탐험가 연맹 이용 방법
                </p>
                <ol className="list-decimal list-inside space-y-1 text-stone-700">
                  <li>마음에 드는 탐험가 연맹을 탐색해요.</li>
                  <li>가입 신청을 보내요.</li>
                  <li>연맹장이 승인하면 함께 활동해요.</li>
                </ol>
              </div>
            </section>

            
            <section className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-[#f7ebdd] flex items-center justify-center text-3xl">
                🧭
              </div>
              <h2 className="text-lg font-semibold text-stone-900 mb-2">
                아직 가입한 탐험가 연맹이 없어요
              </h2>
              <p className="text-sm text-stone-700 leading-relaxed mb-6">
                연맹에 가입하면 나만의 연맹 도감과 랭킹이 열립니다.
              </p>

              
              <div className="mt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/guild/explore")}
                  className="min-w-[210px] px-6 py-2.5 rounded-full bg-[#b8834a] text-white text-sm font-semibold hover:bg-[#a8733a] transition"
                >
                  탐험가 연맹 탐색하러 가기
                </button>

                <button
                  type="button"
                  onClick={() => setOpenCreate(true)}
                  className="min-w-[210px] px-6 py-2.5 rounded-full border border-[#b8834a] bg-white text-[#b8834a] text-sm font-semibold hover:bg-[#f7ebdd] transition"
                >
                  새 탐험가 연맹 만들기
                </button>
              </div>
            </section>
          </div>
        )}

        
        {hasGuild && guild && (
          <section className="space-y-4">
            <header className="mb-4">
              <h2 className="text-2xl font-bold text-stone-900 mb-1">
                내 탐험가 연맹
              </h2>
              <p className="text-sm text-stone-600">
                내가 속한 탐험가 연맹이에요. 연맹 공간에 들어가 도감과 기록을 함께
                관리해 보세요.
              </p>
            </header>

            <article className="rounded-2xl bg-[#e9d7b0] border border-[#c3a47a] shadow-[0_12px_28px_rgba(120,80,40,0.28)] px-6 py-5 flex items-center gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] bg-gradient-to-br from-[#8b5a2b] to-[#5a3315] shadow-[0_10px_24px_rgba(0,0,0,0.35)] flex items-center justify-center">
                <div className="w-[72%] h-[72%] rounded-[20px] border border-[#c8925a]/70 flex items-center justify-center">
                  <span className="text-3xl text-[#f4d7aa]">🛡️</span>
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="text-lg sm:text-xl font-extrabold text-stone-900">
                  {guild.name}
                </h3>
                <p className="text-xs sm:text-sm text-stone-800 line-clamp-2">
                  {guild.description}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => navigate(`/guild/${guild.id}/room`)}
                  className="rounded-full bg-[#6b4321] px-4 py-2 text-xs sm:text-sm font-semibold text-[#f7e3c6] shadow-[0_6px_14px_rgba(0,0,0,0.35)] hover:bg-[#5a3619] hover:-translate-y-[1px] active:translate-y-0 active:shadow-md transition"
                >
                  연맹 공간 입장하기
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => navigate(`/guild/${guild.id}/manage`)}
                    className="rounded-full bg-[#b8834a] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#a8733a] transition"
                  >
                    가입 신청 관리
                  </button>
                )}
                {!isOwner && (
                  <button
                    type="button"
                    onClick={handleLeaveGuild}
                    disabled={leaving}
                    className="rounded-full border border-stone-400 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-50 hover:border-stone-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {leaving ? "탈퇴 중..." : "연맹 탈퇴하기"}
                  </button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleDisbandGuild}
                    disabled={disbanding}
                    className="rounded-full border border-red-400 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disbanding ? "해체 중..." : "연맹 해체하기"}
                  </button>
                )}
                {leaveError && (
                  <p className="text-xs text-red-500 mt-1">{leaveError}</p>
                )}
                {disbandError && (
                  <p className="text-xs text-red-500 mt-1">{disbandError}</p>
                )}
              </div>
            </article>

            
            <section className="mt-10">
              <header className="mb-6">
                <h2 className="text-xl font-bold text-stone-900 mb-2">
                  다른 탐험가 연맹 둘러보기
                </h2>
                <p className="text-sm text-stone-600">
                  다른 연맹도 탐색해보고 가입 신청을 보내보세요.
                </p>
              </header>

             
              <div className="mb-6 rounded-3xl bg-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#f1dec7]">
                
                <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-4 pb-3 border-b border-[#f4e5d3]">
                  {FILTER_TAGS.map((tag) => {
                    const isActive = activeTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setActiveTag(tag === "전체" ? "전체" : (tag as GuildTag))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition ${
                          isActive
                            ? "bg-[#b8834a] text-white shadow-sm"
                            : "bg-[#f7ebdd] text-stone-700 hover:bg-[#f0dfc8]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}

                  <span className="ml-auto hidden text-[11px] sm:inline text-stone-500">
                    총 {allGuilds.length}개의 탐험가 연맹
                  </span>
                </div>

                
                <div className="px-4 sm:px-6 py-4">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 text-sm">
                      🔍
                    </span>
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      type="text"
                      placeholder="연맹 이름이나 소개를 검색해 보세요."
                      className="w-full rounded-full border border-[#f0e0cf] bg-[#fdf7ee] pl-9 pr-4 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#d7a76a] focus:border-transparent"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-stone-400">
                      {otherGuilds.length}개 결과
                    </span>
                  </div>
                </div>
              </div>

             
              {loadingGuilds ? (
                <div className="rounded-2xl bg-white/80 border border-[#e0cdb5] px-6 py-10 text-center text-sm text-stone-500">
                  탐험가 연맹을 불러오는 중이에요…
                </div>
              ) : otherGuilds.length === 0 ? (
                <div className="rounded-2xl bg-white/80 border border-dashed border-[#e0cdb5] px-6 py-10 text-center text-sm text-stone-500">
                  {keyword.trim()
                    ? "검색 조건에 맞는 다른 연맹이 없어요."
                    : "다른 탐험가 연맹이 아직 없어요."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {otherGuilds.map((g) => {
                    const isClosed = g.status === "모집 마감";
                    return (
                      <article
                        key={g.id}
                        className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-[#f1dec7] px-5 py-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)] transition"
                      >
                       
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-base font-semibold text-stone-900 leading-snug">
                              {g.name}
                            </h2>
                            <p className="mt-1 text-xs text-stone-600 leading-relaxed line-clamp-2">
                              {g.intro}
                            </p>
                          </div>

                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                              isClosed
                                ? "bg-[#f3f3f3] text-stone-400"
                                : "bg-[#e9f7e9] text-[#247330]"
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
                                className="inline-flex items-center rounded-full bg-[#f7ebdd] px-2.5 py-1 text-[11px] text-stone-700"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-[13px] space-y-0.5">
                            <p>
                              인원{" "}
                              <span className="font-semibold text-stone-800">
                                {g.currentMembers} / {g.maxMembers}
                              </span>
                            </p>
                            <p>
                              상태{" "}
                              <span
                                className={`font-semibold ${
                                  isClosed ? "text-stone-500" : "text-[#2f7a39]"
                                }`}
                              >
                                {g.status}
                              </span>
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={isClosed}
                            onClick={() => {
                              if (isClosed) return;
                              navigate(`/guild/${g.id}`);
                            }}
                            className={`rounded-full px-5 py-2 text-[12px] font-semibold transition shadow-sm ${
                              isClosed
                                ? "bg-[#f3f3f3] text-stone-400 cursor-default"
                                : "bg-[#b8834a] text-white hover:bg-[#a8733a]"
                            }`}
                          >
                            {isClosed ? "모집 마감" : "자세히 보기"}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">
                새 탐험가 연맹 만들기
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-sm text-stone-400 hover:text-stone-600"
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

                  alert("연맹이 성공적으로 만들어졌습니다!");
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
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">
                  연맹 이름<span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예) 야간 러닝 탐험가 연맹"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  카테고리
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예) 러닝, 보드게임, 스터디..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  연맹 설명
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="연맹 분위기, 모집 대상, 활동 시간대 등을 적어 주세요."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  연맹 규칙
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="연맹원들이 지켜야 할 규칙을 적어 주세요."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  해시태그
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
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
                      className="px-3 py-2 rounded-lg bg-[#f7ebdd] text-sm font-semibold text-[#6b4321] hover:bg-[#f0dfc8] transition"
                    >
                      추가
                    </button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-[#f7ebdd] px-3 py-1 text-xs text-stone-800"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-[10px] text-stone-500 hover:text-stone-700"
                            aria-label={`${tag} 태그 제거`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-stone-500">
                    최대 8개까지 추가할 수 있어요. Enter 키로 빠르게 추가해 보세요.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  제한 인원
                </label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
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
                <p className="text-xs text-stone-500 mt-1">
                  최소 2명, 최대 200명까지 설정할 수 있어요.
                </p>
              </div>

              {createError && (
                <p className="text-sm text-red-500">{createError}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-[#b8834a] hover:bg-[#a8733a] text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-70"
              >
                {creating ? "연맹 만드는 중..." : "연맹 만들기"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildHome;
