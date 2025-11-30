import React, { useState } from "react";
import HeaderNav from "@/components/HeaderNav";
import Achievement from "@/components/Achievement";
import BookCard from "@/components/BookCard";
import type { OfficialDexItem, TasteRecordItem } from "@/types/type";


const mockGuild = {
  name: "야간 러너 탐험가 연맹",
  description: "야간 러닝 / 산책 / 야경탐방 기록을 함께 쌓는 연맹입니다.",
  intro:
    "안녕하세요.\n야간 러닝/산책 컨셉에 대해 함께 기록합니다. 오늘도 한 걸음, 같이 뛰어요!",
  rules:
    "1. 매주 최소 1회 이상 탐험 기록 남기기\n2. 인증샷에는 날짜를 꼭 넣기\n3. 서로의 기록에 따뜻한 댓글 남기기",
  stats: {
    totalDex: 12,
    thisMonthDex: 4,
    ongoingDex: 5,
    completedDex: 7,
  },
};

const mockExplorers = [
  { id: 1, name: "탐험가1", intro: "달리기 좋아하는 탐험가" },
  { id: 2, name: "탐험가2", intro: "야간 산책가" },
  { id: 3, name: "탐험가3", intro: "야경 사진러" },
  { id: 4, name: "탐험가4", intro: "주말 러너" },
];

const mockGuildDex: OfficialDexItem[] = [
  { id: "dex1", title: "야간 러닝 3주 연속", achieved: true },
  { id: "dex2", title: "한강 야경 5회 탐험", achieved: false },
  { id: "dex3", title: "새벽 러닝 챌린지", achieved: false },
  { id: "dex4", title: "도심 야경 코스 개척", achieved: true },
];

const mockInProgressBooks: TasteRecordItem[] = [
  {
    id: "r1",
    title: "기록1",
    desc: "본문에 있는 요약된 내용1",
    category: "야간 러닝",
    createdAt: new Date().toISOString(),
  },
  {
    id: "r2",
    title: "기록2",
    desc: "본문에 있는 요약된 내용2",
    category: "야간 산책",
    createdAt: new Date().toISOString(),
  },
  {
    id: "r3",
    title: "기록3",
    desc: "본문에 있는 요약된 내용3",
    category: "야경 촬영",
    createdAt: new Date().toISOString(),
  },
  {
    id: "r4",
    title: "기록4",
    desc: "본문에 있는 요약된 내용4",
    category: "러닝",
    createdAt: new Date().toISOString(),
  },
];

const mockCompletedBooks: TasteRecordItem[] = [
  {
    id: "c1",
    title: "완료 기록1",
    desc: "완료된 도감 내용1",
    category: "야간 러닝",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c2",
    title: "완료 기록2",
    desc: "완료된 도감 내용2",
    category: "야간 산책",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c3",
    title: "완료 기록3",
    desc: "완료된 도감 내용3",
    category: "야경 촬영",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c4",
    title: "완료 기록4",
    desc: "완료된 도감 내용4",
    category: "러닝",
    createdAt: new Date().toISOString(),
  },
];


const mockRanking = {
  myRank: { rank: 3, name: "나", score: 124 },
  top4: [
    { rank: 1, name: "탐험가1", score: 210 },
    { rank: 2, name: "탐험가2", score: 180 },
    { rank: 3, name: "나", score: 124 },
    { rank: 4, name: "탐험가4", score: 110 },
  ],
};

const GuildDetail: React.FC = () => {
  const { name, description, intro, rules, stats } = mockGuild;
  const [rightTab, setRightTab] = useState<"dex" | "ranking">("dex");

  return (
    <div className="min-h-screen bg-[#fdf8f1]">
      
      <HeaderNav />

      
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-6 py-10 flex items-start gap-8">
        
        <aside className="w-64 bg-[#dec2a3] rounded-3xl px-5 pt-6 pb-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          
          <div className="sticky top-24 flex flex-col items-stretch gap-5">
            
            <div className="w-40 h-40 mx-auto rounded-3xl bg-[#a86a32] flex items-center justify-center shadow-inner">
              <span className="text-4xl">🛡️</span>
            </div>

            
            <section className="bg-[#f4e3cf] rounded-2xl px-6 py-8 text-center flex flex-col justify-center gap-3">
              <h2 className="text-base font-semibold text-stone-900">
                {name}
              </h2>
              <p className="text-[13px] leading-relaxed text-stone-700 whitespace-pre-line">
                {description}
              </p>
            </section>

            
            <div className="flex gap-3 mt-2 justify-center">
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
                  {intro}
                </p>
              </div>
            </div>
          </header>

         
          <section className="grid grid-cols-[2fr,1fr] gap-6">
            <div className="bg-[#f4f0ea] rounded-lg p-5">
              <h2 className="text-lg font-semibold mb-3">연맹 규칙</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {rules}
              </p>
            </div>

            <div className="bg-[#f4f0ea] rounded-lg p-5 text-sm space-y-1">
              <p>총 연맹도감 수 {stats.totalDex}개</p>
              <p>이번달 달성도감 수 {stats.thisMonthDex}개</p>
              <p>진행중인 연맹도감 {stats.ongoingDex}개</p>
              <p>달성 완료 연맹도감 {stats.completedDex}개</p>
            </div>
          </section>

         
          <section>
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-2">
              연맹 탐험가
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {mockExplorers.map((m) => (
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

         
          <section className="mt-4">
            <h2 className="text-lg font-semibold mb-4 border-b border-gray-300 pb-2">
              연맹도감 기록
            </h2>

            
            <div className="mb-8">
              <h3 className="text-base font-semibold mb-3">진행중인 도감</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8">
                {mockInProgressBooks.map((item) => (
                  <BookCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            <hr className="my-8 border-t border-gray-300" />

           
            <div>
              <h3 className="text-base font-semibold mb-3">달성 완료 도감</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8">
                {mockCompletedBooks.map((item) => (
                  <BookCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        </section>

        
        <aside className="w-72 max-w-xs bg-[#e3c7a8] rounded-3xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          
          <div className="sticky top-24 flex flex-col gap-4">
           
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

           
            {rightTab === "dex" ? (
              
              <div className="flex-1 flex flex-col gap-3">
                {mockGuildDex.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#f7ecdd] rounded-xl p-2 flex items-center"
                  >
                    <Achievement item={item} />
                  </div>
                ))}
              </div>
            ) : (
             
              <div className="flex-1">
                <div className="bg-[#f7ecdd] rounded-2xl px-4 py-5 space-y-5">
                  
                  <div>
                    <p className="text-base text-stone-700 mb-1">내 랭킹</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-[#7b4a1e]">
                        {mockRanking.myRank.rank}위
                      </span>
                      <span className="text-sm text-stone-700">
                        점수 {mockRanking.myRank.score}
                      </span>
                    </div>
                  </div>

                  
                  <div>
                    <p className="text-base text-stone-700 mb-2">상위 랭킹</p>
                    <ul className="space-y-2">
                      {mockRanking.top4.map((r) => (
                        <li
                          key={r.rank}
                          className="flex items-center justify-between bg-white rounded-full px-4 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-full bg-[#f4e3cf] text-[12px] font-semibold text-[#7b4a1e] flex items-center justify-center">
                              {r.rank}
                            </span>
                            <span className="text-base font-medium text-stone-900 whitespace-normal">
                              {r.name}
                            </span>
                          </div>
                          <span className="ml-3 text-sm text-stone-700 shrink-0">
                            {r.score}점
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default GuildDetail;