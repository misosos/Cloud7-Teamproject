// frontend/src/pages/Guild/GuildDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import { joinGuildBackend, getGuildById, type GuildDTO } from "@/services/guildService";
import { useGuildStatus } from "@/hooks/useGuildStatus";

const GuildDetail: React.FC = () => {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;
  const navigate = useNavigate();
  const { status: myGuildStatus } = useGuildStatus();

  const [guild, setGuild] = useState<GuildDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // 내가 이미 가입한 연맹인지 확인
  const isMyGuild = myGuildStatus?.guild?.id === Number(guildId);
  const isPending = myGuildStatus?.status === "PENDING";

  useEffect(() => {
    if (!guildId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setNotFound(false);

      try {
        const res = await getGuildById(Number(guildId));
        if (!res) {
          setNotFound(true);
        } else {
          setGuild(res);
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [guildId]);

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7ede0]">
        <HeaderNav />
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-sm text-stone-600">연맹 정보를 불러오는 중이에요…</p>
        </main>
      </div>
    );
  }

  // 없는 길드
  if (notFound || !guild) {
    return (
      <div className="min-h-screen bg-[#f7ede0]">
        <HeaderNav />
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-800 hover:underline"
          >
            <span>←</span>
            <span>이전 페이지로 돌아가기</span>
          </button>
          <div className="rounded-3xl bg-[#fdf5ea] border border-dashed border-[#e2c49a] px-6 py-10 text-center text-sm text-stone-500 shadow-[0_10px_25px_rgba(120,80,40,0.12)]">
            해당 탐험가 연맹을 찾을 수 없어요.
          </div>
        </main>
      </div>
    );
  }

  if (!guild) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7ede0] to-[#f3e0c8]">
      <HeaderNav />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => navigate("/guild/explore")}
            className="
              nline-flex items-center gap-2
  text-sm sm:text-base font-semibold
  text-[#8b5e34]
  bg-[#f4e4cf]
  px-3 py-2 rounded-full
  shadow-[0_2px_4px_rgba(0,0,0,0.12)]
  hover:shadow-[0_6px_14px_rgba(0,0,0,0.18)]
  hover:-translate-y-[2px]
  hover:animate-[wobble_0.35s_ease-in-out]
  transition-all
            "
          >
            <span className="text-lg">←</span>
            <span>탐험가 연맹 목록으로 돌아가기</span>
          </button>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[#c09b6b]">
              explorer guild briefing
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              연맹 상세소개
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              이 탐험가 연맹이 어떤 분위기인지, 가입 전에 미리 살펴보세요.
            </p>
          </div>
        </section>

       
        <section className="rounded-[32px] bg-[#f8ead5] border border-[#e1c291] shadow-[0_18px_45px_rgba(120,80,40,0.18)] px-5 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row gap-6">
          
          <div className="w-full sm:w-40 md:w-44">
            <div className="relative w-full aspect-[4/3] sm:aspect-[3/4] rounded-[24px] bg-gradient-to-br from-[#f5e0bf] via-[#f0d2a4] to-[#e7bf8a] border border-[#d0a066] shadow-[0_10px_25px_rgba(120,80,40,0.35)] flex items-center justify-center">
              <div className="inset-[10px] absolute rounded-[20px] border border-[#f7e2c3]/70 pointer-events-none" />
              <div className="relative flex flex-col items-center gap-1 text-xs text-stone-700">
                <span className="text-3xl">🧭</span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-stone-700/70">
                  guild emblem
                </span>
                <span className="text-[10px] text-stone-600/70">
                  탐험가 연맹 우드 플라크
                </span>
              </div>
            </div>
          </div>

          
          <div className="flex-1 flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f3ddba] px-3 py-1 text-[10px] font-semibold text-[#7c552c] shadow-sm">
                <span>🌙 탐험가 연맹</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900">
                {guild.name}
              </h2>
              <p className="text-sm text-stone-700">
                {guild.description || "연맹 설명이 없습니다."}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs sm:text-[13px]">
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">
                  최대 인원
                </p>
                <p className="font-semibold text-stone-900">
                  {guild.maxMembers}명
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">
                  모집 여부
                </p>
                <p className="font-semibold text-[#2f7a39]">모집 중</p>
              </div>
              {guild.category && (
                <div className="space-y-0.5">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">
                    카테고리
                  </p>
                  <p className="font-semibold text-stone-900">
                    {guild.category}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        
        <section className="rounded-[32px] bg-[#fdf5ea]/95 border border-[#e4c89d] shadow-[0_14px_40px_rgba(120,80,40,0.12)] px-5 py-6 sm:px-8 sm:py-7 space-y-6">
         
          {guild.description && (
            <>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2">
                  <span className="h-6 w-1 rounded-full bg-[#c28a46]" />
                  <h3 className="text-sm sm:text-[15px] font-semibold text-stone-900">
                    연맹 소개
                  </h3>
                </div>
                <p className="text-sm sm:text-[13px] text-stone-800 leading-relaxed whitespace-pre-line">
                  {guild.description}
                </p>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#e2c49a] to-transparent" />
            </>
          )}

         
          {guild.tags && guild.tags.length > 0 && (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2">
                <span className="h-6 w-1 rounded-full bg-[#c28a46]" />
                <h3 className="text-sm sm:text-[15px] font-semibold text-stone-900">
                  태그
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {guild.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-[#f7ebdd] px-3 py-1 text-xs text-stone-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        
        <section className="space-y-4 pt-2">
          {isMyGuild ? (
            <div className="text-center">
              <p className="text-sm text-stone-600 mb-4">
                이미 가입한 연맹이에요.
              </p>
              <button
                type="button"
                onClick={() => navigate("/guild")}
                className="min-w-[110px] rounded-full bg-gradient-to-b from-[#c7924f] to-[#a97134] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(120,80,40,0.35)] hover:from-[#b8813f] hover:to-[#965e29] hover:-translate-y-[1px] active:translate-y-0 active:shadow-md transition"
              >
                내 연맹으로 가기
              </button>
            </div>
          ) : isPending ? (
            <div className="text-center">
              <p className="text-sm text-stone-600 mb-4">
                가입 신청이 완료되었어요. 연맹장의 승인을 기다려주세요.
              </p>
              <button
                type="button"
                onClick={() => navigate("/guild")}
                className="min-w-[110px] rounded-full bg-gradient-to-b from-[#c7924f] to-[#a97134] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(120,80,40,0.35)] hover:from-[#b8813f] hover:to-[#965e29] hover:-translate-y-[1px] active:translate-y-0 active:shadow-md transition"
              >
                연맹 홈으로
              </button>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="min-w-[110px] rounded-full border border-[#cfb392] bg-[#f7ebdd] px-6 py-2.5 text-sm font-semibold text-stone-700 shadow-[0_6px_16px_rgba(0,0,0,0.06)] hover:bg-[#f1dfcc] hover:-translate-y-[1px] active:translate-y-0 active:shadow-sm transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!guildId) return;

                  setJoining(true);
                  setJoinError(null);

                  try {
                    // 백엔드에 가입 신청 
                    await joinGuildBackend(guildId);

                    // 가입 신청 완료 메시지
                    alert(
                      "가입 신청이 완료되었어요!\n연맹장의 승인을 기다려주세요.",
                    );
                    navigate("/guild");
                  } catch (err: any) {
                    console.error("길드 가입 실패:", err);
                    setJoinError(
                      err?.data?.message || err?.message ||
                        "가입 신청에 실패했어요. 잠시 후 다시 시도해 주세요.",
                    );
                  } finally {
                    setJoining(false);
                  }
                }}
                disabled={joining}
                className="min-w-[110px] rounded-full bg-gradient-to-b from-[#c7924f] to-[#a97134] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(120,80,40,0.35)] hover:from-[#b8813f] hover:to-[#965e29] hover:-translate-y-[1px] active:translate-y-0 active:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? "신청 중..." : "가입 신청하기"}
              </button>
            </div>
          )}
          {joinError && (
            <p className="text-sm text-red-500 text-center">{joinError}</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default GuildDetail;
