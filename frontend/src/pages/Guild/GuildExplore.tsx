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
            <h1 className="text-3xl sm:text-4xl font-black text-[#5a3e25] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              🗺️ 탐험가 연맹 탐색
            </h1>
            <p className="mt-1 text-base text-[#6b4e2f] font-medium">
              나와 잘 맞는 탐험가 연맹을 찾고, 가입 신청을 보내보세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/guild")} 
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] px-4 py-2 text-xs sm:text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
          >
            🏠 내 탐험가 연맹 홈으로 가기
          </button>
        </header>

        
        <section className="mb-8 rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] border-2 border-[#6b4e2f] relative overflow-hidden">
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
              총 {guilds.length}개의 탐험가 연맹
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
                {filteredGuilds.length}개 결과
              </span>
            </div>
          </div>
        </section>

        
        <section className="space-y-4">
          {loading ? (
            <div className="rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] px-6 py-10 text-center text-base text-[#d4a574] font-medium shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
              탐험가 연맹을 불러오는 중이에요…
            </div>
          ) : filteredGuilds.length === 0 ? (
            <div className="rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-dashed border-[#6b4e2f] px-6 py-10 text-center text-base text-[#8b6f47] font-medium shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
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
                    className="group relative overflow-hidden rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-5 py-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_12px_32px_rgba(201,169,97,0.3)] transition relative"
                  >
                    {/* 고대 문서 장식 */}
                    <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
                    
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h2 className="text-xl font-black text-[#f4d7aa] leading-snug tracking-wide">
                          {g.name}
                        </h2>
                        <p className="mt-1.5 text-base text-[#d4a574] leading-relaxed line-clamp-2 font-medium">
                          {g.intro}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-full px-4 py-1.5 text-base font-black tracking-wide shrink-0 ${
                          isClosed
                            ? "bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-stone-400 border border-[#6b4e2f]"
                            : "bg-gradient-to-b from-[#2a4a2a] to-[#1a3a1a] text-green-400 border border-green-600/30 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]"
                        }`}
                      >
                        {isClosed ? "모집 마감" : "모집 중"}
                      </span>
                    </div>

                    
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
                              isClosed 
                                ? "text-stone-400" 
                                : "text-green-400"
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
                        className={`rounded-lg px-5 py-2 text-base font-black tracking-wide transition shadow-sm ${
                          isClosed
                            ? "bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-stone-400 border border-[#6b4e2f] cursor-default"
                            : "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
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
