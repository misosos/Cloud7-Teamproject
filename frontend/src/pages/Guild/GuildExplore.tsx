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

  // 필터 + 검색 적용된 결과
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
    <div className="min-h-screen bg-[#fbf3e6]">
      <HeaderNav />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
              탐험가 연맹 탐색
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              나와 잘 맞는 탐험가 연맹을 찾고, 가입 신청을 보내보세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/guild")} 
            className="inline-flex items-center justify-center rounded-full bg-white/80 px-4 py-2 text-xs sm:text-sm font-semibold text-stone-800 shadow-sm border border-[#f1dec7] hover:bg-white hover:shadow-md transition"
          >
            내 탐험가 연맹 홈으로 가기
          </button>
        </header>

        
        <section className="mb-8 rounded-3xl bg-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#f1dec7]">
          
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
              총 {guilds.length}개의 탐험가 연맹
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
                {filteredGuilds.length}개 결과
              </span>
            </div>
          </div>
        </section>

        
        <section className="space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-white/80 border border-[#e0cdb5] px-6 py-10 text-center text-sm text-stone-500">
              탐험가 연맹을 불러오는 중이에요…
            </div>
          ) : filteredGuilds.length === 0 ? (
            <div className="rounded-2xl bg-white/80 border border-dashed border-[#e0cdb5] px-6 py-10 text-center text-sm text-stone-500">
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
      </main>
    </div>
  );
};

export default GuildExplore;
