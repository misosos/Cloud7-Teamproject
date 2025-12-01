// frontend/src/pages/Guild/GuildRoom.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import Achievement from "@/components/Achievement";
import BookCard from "@/components/BookCard";
import {
  fetchGuildDetail,
  type GuildDetailData,
} from "@/services/guildApi";

const GuildRoom: React.FC = () => {
  
  const { guildId = "" } = useParams<{ guildId: string }>();

  const [data, setData] = useState<GuildDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rightTab, setRightTab] = useState<"dex" | "ranking">("dex");

  // 길드 상세 목API 호출
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
      setLoading(false);
    }

    load();
  }, [guildId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <p className="text-sm text-stone-600">연맹 공간을 여는 중이에요…</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <p className="text-sm text-stone-600">
          존재하지 않는 연맹이거나, 아직 준비 중인 연맹이에요.
        </p>
      </div>
    );
  }

  const { guild, explorers, guildDex, inProgressBooks, completedBooks, ranking } =
    data;

  // 내 랭킹이 있는지 확인
  const hasMyRank = ranking.myRank && ranking.myRank.rank > 0;

  return (
    <div className="min-h-screen bg-[#fdf8f1]">
      <HeaderNav />

      
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-6 py-10 flex items-start gap-8">
        
        <aside className="w-64 bg-[#e0c3a3] rounded-3xl px-4 pt-6 pb-8 shadow-[0_4px_16px_rgba(0,0,0,0.1)] sticky top-24 self-start">
          <div className="flex flex-col items-stretch gap-5">
           
            <div className="w-40 h-40 mx-auto rounded-3xl bg-gradient-to-br from-[#8b5a2b] to-[#5a3315] flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
              <span className="text-4xl text-[#f4d7aa]">🛡️</span>
            </div>

            
            <section className="bg-[#f5e3cf] rounded-2xl px-5 py-6 text-center flex flex-col justify-center gap-3">
              <h2 className="text-base font-semibold text-stone-900">
                {guild.name}
              </h2>
              <p className="text-[13px] leading-relaxed text-stone-700 whitespace-pre-line">
                {guild.description}
              </p>
            </section>

            
            <div className="flex gap-3 mt-1 justify-center">
              <button className="flex-1 py-2 rounded-xl bg-[#b8834a] text-white text-xs font-semibold hover:bg-[#a8733a] transition">
                도감 추가
              </button>
              <button className="flex-1 py-2 rounded-xl border border-[#b8834a] bg-[#f7ebdd] text-[#703c16] text-xs font-semibold hover:bg-white transition">
                도감 달성
              </button>
            </div>
          </div>
        </aside>

       
        <section className="flex-1 flex flex-col gap-8">
          
          <header>
            <h1 className="text-3xl font-bold mb-6">탐험가 연맹</h1>

            <div className="flex gap-6">
              
              <div className="w-64 h-40 bg-[#e2e2e2] rounded-lg flex items-center justify-center text-xs text-gray-500">
                연맹 소개 사진
              </div>

             
              <div className="flex-1">
                <p className="text-base leading-relaxed whitespace-pre-line">
                  {guild.intro}
                </p>
              </div>
            </div>
          </header>

         
          <section className="grid grid-cols-[2fr,1fr] gap-6">
            <div className="bg-[#f4f0ea] rounded-lg p-5">
              <h2 className="text-lg font-semibold mb-3">연맹 규칙</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {guild.rules}
              </p>
            </div>

            <div className="bg-[#f4f0ea] rounded-lg p-5 text-sm space-y-1">
              <p>총 연맹 도감 수 {guild.stats.totalDex}개</p>
              <p>이달의 도감 {guild.stats.thisMonthDex}개</p>
              <p>진행 중 도감 {guild.stats.ongoingDex}개</p>
              <p>달성 완료 도감 {guild.stats.completedDex}개</p>
            </div>
          </section>

          
          <section>
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-2">
              연맹 탐험가
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {explorers.map((m) => (
                <div
                  key={m.id}
                  className="min-w-[220px] bg-[#f4f0ea] rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-[#b8834a] text-sm flex items-center justify-center text-white">
                      {m.name[0]}
                    </div>
                    <span className="text-sm font-semibold">{m.name}</span>
                  </div>
                  <p className="text-xs text-gray-700">{m.intro}</p>
                </div>
              ))}
            </div>
          </section>

         
          <section className="mt-4 space-y-8">
            <h2 className="text-lg font-semibold mb-2 border-b border-gray-300 pb-2">
              연맹도감 기록
            </h2>

         
            <div>
              <h3 className="text-base font-semibold mb-3">진행중인 도감</h3>
              <div className="relative pb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                  {inProgressBooks.map((item) => (
                    <BookCard key={item.id} item={item} />
                  ))}
                </div>
             
                <div className="mt-4 h-4 bg-[#8c5a2f] rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.3)]" />
              </div>
            </div>

           
            <div>
              <h3 className="text-base font-semibold mb-3">달성 완료 도감</h3>
              <div className="relative pb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                  {completedBooks.map((item) => (
                    <BookCard key={item.id} item={item} />
                  ))}
                </div>
                
                <div className="mt-4 h-4 bg-[#8c5a2f] rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.3)]" />
              </div>
            </div>
          </section>
        </section>

        
        <aside className="w-72 max-w-xs bg-[#e3c7a8] rounded-3xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.1)] sticky top-24 self-start">
          <div className="flex flex-col gap-4">
           
            <div className="flex text-sm font-semibold mb-2 border-b border-black/10">
              <button
                onClick={() => setRightTab("dex")}
                className={`flex-1 py-2 text-center ${
                  rightTab === "dex"
                    ? "text-stone-900 border-b-2 border-stone-900"
                    : "text-stone-500"
                }`}
              >
                연맹도감
              </button>
              <button
                onClick={() => setRightTab("ranking")}
                className={`flex-1 py-2 text-center ${
                  rightTab === "ranking"
                    ? "text-stone-900 border-b-2 border-stone-900"
                    : "text-stone-500"
                }`}
              >
                랭킹
              </button>
            </div>

            {/* 탭 내용 */}
            {rightTab === "dex" ? (
              <div className="flex flex-col gap-3">
                {guildDex.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#f7ecdd] rounded-xl p-2 flex items-center"
                  >
                    <Achievement item={item} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#f7ecdd] rounded-2xl px-4 py-5 space-y-5">
                
                <div>
                  <p className="text-base text-stone-700 mb-1">내 랭킹</p>
                  {hasMyRank ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-[#7b4a1e]">
                        {ranking.myRank.rank}위
                      </span>
                      <span className="text-sm text-stone-700">
                        점수 {ranking.myRank.score}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-700">
                      아직 랭킹에 오르지 않았어요.
                      <br />
                      연맹 활동을 꾸준히 하면 순위가 매겨질 거예요!
                    </p>
                  )}
                </div>

               
                <div>
                  <p className="text-base text-stone-700 mb-2">상위 랭킹</p>
                  {ranking.top4.length > 0 ? (
                    <ul className="space-y-2">
                      {ranking.top4.map((r) => (
                        <li
                          key={r.rank}
                          className="flex items-center justify-between bg-white rounded-full px-4 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-full bg-[#f4e3cf] text-[12px] font-semibold text-[#7b4a1e] flex items-center justify-center">
                              {r.rank}
                            </span>
                            <span className="text-sm font-medium text-stone-900 whitespace-normal">
                              {r.name}
                            </span>
                          </div>
                          {r.score > 0 && (
                            <span className="ml-3 text-sm text-stone-700 shrink-0">
                              {r.score}점
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-500">
                      아직 랭킹 데이터가 없어요.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default GuildRoom;
