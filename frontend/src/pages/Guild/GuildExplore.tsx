// frontend/src/pages/Guild/GuildExplore.tsx
import React, { useEffect, useMemo, useState } from "react";
import HeaderNav from "@/components/HeaderNav";
import { useNavigate } from "react-router-dom";

// ✅ 길드 관련 타입/목데이터/필터는 guildApi에서 통합 관리
import {
  fetchGuildList,
  FILTER_TAGS,
  type GuildListItem,
  type GuildTag,
} from "@/services/guildApi";

// Warm Oak tokens
const BG = "#F7F0E6";
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const BRAND3 = "#4A3420";
const DANGER = "#B42318";

const GuildExplore: React.FC = () => {
  const navigate = useNavigate();

  const [guilds, setGuilds] = useState<GuildListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTag, setActiveTag] = useState<GuildTag | "전체">("전체");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchGuildList();
        setGuilds(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredGuilds = useMemo(() => {
    return guilds.filter((g) => {
      const matchTag =
        activeTag === "전체" ? true : g.tags.includes(activeTag as GuildTag);

      const term = keyword.trim();
      const matchKeyword = term
        ? g.name.toLowerCase().includes(term.toLowerCase()) ||
          g.intro.toLowerCase().includes(term.toLowerCase())
        : true;

      return matchTag && matchKeyword;
    });
  }, [guilds, activeTag, keyword]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-warm-oak-stripe" style={{ color: TEXT }}>
      <HeaderNav />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tight"
              style={{ color: TEXT }}
            >
              <span className="inline-flex items-center gap-2">
                <i className="fas fa-compass" aria-hidden="true" style={{ color: BRAND }} />
                탐험가 연맹 탐색
              </span>
            </h1>
            <p className="mt-1 text-base font-medium" style={{ color: MUTED }}>
              나와 잘 맞는 탐험가 연맹을 찾고, 가입 신청을 보내보세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/guild")}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs sm:text-sm font-black tracking-wide transition"
            style={{
              background: `linear-gradient(180deg, ${BRAND3}, ${TEXT})`,
              color: BG,
              border: "1px solid rgba(107,78,47,0.35)",
              boxShadow:
                "0 10px 26px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              <i className="fas fa-house" aria-hidden="true" style={{ color: BRAND }} />
              내 탐험가 연맹 홈으로
            </span>
          </button>
        </header>

        {/* Filter + Search Panel */}
        <section
          className="mb-8 rounded-2xl backdrop-blur relative overflow-hidden"
          style={{
            background: SURFACE,
            border: "1px solid rgba(201,169,97,0.28)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.12)",
          }}
        >
          <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_at_20%_20%,rgba(201,169,97,0.22),transparent_55%)]" />
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_85%_75%,rgba(107,78,47,0.14),transparent_58%)]" />

          <div className="relative">
            <div
              className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-4 pb-3"
              style={{ borderBottom: "1px solid rgba(107,78,47,0.18)" }}
            >
              {FILTER_TAGS.map((tag) => {
                const isActive = activeTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setActiveTag(tag === "전체" ? "전체" : (tag as GuildTag))
                    }
                    className="px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-black tracking-wide transition"
                    style={
                      isActive
                        ? {
                            background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                            color: "white",
                            border: "1px solid rgba(201,169,97,0.30)",
                            boxShadow:
                              "0 10px 22px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)",
                          }
                        : {
                            background: "rgba(255,255,255,0.32)",
                            color: MUTED,
                            border: "1px solid rgba(107,78,47,0.18)",
                          }
                    }
                  >
                    {tag}
                  </button>
                );
              })}

              <span className="ml-auto hidden text-xs sm:inline font-semibold" style={{ color: MUTED }}>
                총 {guilds.length}개의 탐험가 연맹
              </span>
            </div>

            <div className="px-4 sm:px-6 py-4">
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm"
                  style={{ color: MUTED }}
                >
                  <i className="fas fa-magnifying-glass" aria-hidden="true" />
                </span>

                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  type="text"
                  placeholder="연맹 이름이나 소개를 검색해 보세요."
                  className="w-full rounded-xl pl-9 pr-20 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    background: "rgba(255,255,255,0.42)",
                    color: TEXT,
                    border: "1px solid rgba(107,78,47,0.22)",
                    boxShadow: "inset 0 2px 12px rgba(0,0,0,0.06)",
                    // Tailwind ring 색 대신 인라인로 통일
                    // (focus-visible:ring-*는 유지하되 색은 기본값이라 크게 튀지 않음)
                  }}
                />

                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold"
                  style={{ color: MUTED }}
                >
                  {filteredGuilds.length}개
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="space-y-4">
          {loading ? (
            <div
              className="rounded-2xl px-6 py-10 text-center text-base font-medium backdrop-blur"
              style={{
                background: SURFACE,
                border: "1px solid rgba(201,169,97,0.22)",
                color: MUTED,
                boxShadow: "0 14px 45px rgba(0,0,0,0.10)",
              }}
            >
              연맹을 불러오는 중이에요…
            </div>
          ) : filteredGuilds.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-10 text-center text-base font-medium backdrop-blur"
              style={{
                background: SURFACE,
                border: "1px dashed rgba(201,169,97,0.35)",
                color: MUTED,
                boxShadow: "0 14px 45px rgba(0,0,0,0.10)",
              }}
            >
              조건에 맞는 탐험가 연맹이 아직 없어요.
              <br />
              검색어를 줄이거나 다른 태그를 선택해 보세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredGuilds.map((g) => {
                const isClosed = g.status === "모집 마감";
                return (
                  <article
                    key={g.id}
                    className="group relative overflow-hidden rounded-2xl backdrop-blur px-5 py-5 flex flex-col gap-3 transition"
                    style={{
                      background: SURFACE,
                      border: "1px solid rgba(201,169,97,0.22)",
                      boxShadow: "0 16px 55px rgba(0,0,0,0.12)",
                    }}
                  >
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_0%,rgba(201,169,97,0.18),transparent_55%)]" />
                    <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_90%_30%,rgba(107,78,47,0.12),transparent_58%)]" />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h2 className="text-xl font-black leading-snug tracking-wide" style={{ color: TEXT }}>
                          {g.name}
                        </h2>
                        <p className="mt-1.5 text-base leading-relaxed line-clamp-2 font-medium" style={{ color: MUTED }}>
                          {g.intro}
                        </p>
                      </div>

                      <span
                        className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-black tracking-wide shrink-0"
                        style={{
                          background: isClosed
                            ? "rgba(180,35,24,0.08)"
                            : "rgba(201,169,97,0.16)",
                          border: isClosed
                            ? "1px solid rgba(180,35,24,0.25)"
                            : "1px solid rgba(201,169,97,0.35)",
                          color: isClosed ? DANGER : BRAND3,
                        }}
                      >
                        <i
                          className={isClosed ? "fas fa-circle-xmark" : "fas fa-circle-check"}
                          aria-hidden="true"
                          style={{ marginRight: 8, color: isClosed ? DANGER : BRAND2 }}
                        />
                        {isClosed ? "모집 마감" : "모집 중"}
                      </span>
                    </div>

                    <div className="relative flex flex-wrap gap-1.5 mt-1">
                      {g.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold"
                          style={{
                            background: "rgba(255,255,255,0.34)",
                            color: MUTED,
                            border: "1px solid rgba(107,78,47,0.18)",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="relative mt-4 flex items-center justify-between">
                      <div className="text-base space-y-1">
                        <p className="font-medium" style={{ color: MUTED }}>
                          인원{" "}
                          <span className="font-black" style={{ color: TEXT }}>
                            {g.currentMembers} / {g.maxMembers}
                          </span>
                        </p>
                        <p className="font-medium" style={{ color: MUTED }}>
                          상태{" "}
                          <span
                            className="text-lg font-black"
                            style={{ color: isClosed ? DANGER : BRAND2 }}
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
                        className="rounded-xl px-5 py-2 text-sm font-black tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: isClosed
                            ? "rgba(255,255,255,0.25)"
                            : `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                          color: isClosed ? MUTED : "white",
                          border: isClosed
                            ? "1px solid rgba(107,78,47,0.18)"
                            : "1px solid rgba(201,169,97,0.30)",
                          boxShadow: isClosed
                            ? "inset 0 1px 0 rgba(255,255,255,0.10)"
                            : "0 10px 26px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <i className={isClosed ? "fas fa-lock" : "fas fa-arrow-right"} aria-hidden="true" />
                          {isClosed ? "모집 마감" : "자세히 보기"}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default GuildExplore;