// frontend/src/pages/Guild/GuildDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import toast from "react-hot-toast";
import { joinGuildBackend, getGuildById, getGuildMembers, type GuildDTO } from "@/services/guildService";
import { useGuildStatus } from "@/hooks/useGuildStatus";
import { resolveImageUrl } from "@/api/apiClient";

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
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [memberCount, setMemberCount] = useState(0); // 현재 멤버 수

  // 내가 이미 가입한 연맹인지 확인
  const isMyGuild = myGuildStatus?.guild?.id === Number(guildId);
  const isPending = myGuildStatus?.status === "PENDING";
  
  // 모집 마감 여부 확인
  const isClosed = guild ? memberCount >= (guild.maxMembers ?? 20) : false;

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
          
          // 멤버 수 조회
          try {
            const members = await getGuildMembers(Number(guildId));
            setMemberCount(members?.length ?? 0);
          } catch {
            setMemberCount(0);
          }
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
          <p className="text-base text-stone-600">연맹 정보를 불러오는 중이에요…</p>
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
            className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-800 hover:underline"
          >
            <span>←</span>
            <span>이전 페이지로 돌아가기</span>
          </button>
          <div className="rounded-3xl bg-[#fdf5ea] border border-dashed border-[#e2c49a] px-6 py-10 text-center text-base text-stone-500 shadow-[0_10px_25px_rgba(120,80,40,0.12)]">
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
            className="inline-flex items-center gap-2 text-base sm:text-lg font-black tracking-wide text-white bg-gradient-to-b from-[#4a3420] to-[#3a2818] px-4 py-2.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] hover:-translate-y-[1px] active:translate-y-0 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition-all drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            <span className="text-lg font-black">←</span>
            <span className="font-black">탐험가 연맹 목록으로 돌아가기</span>
          </button>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm tracking-[0.18em] uppercase text-[#8b6f47] font-bold">
              explorer guild briefing
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#5a3e25] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              ⚔️ 연맹 상세소개
            </h1>
            <p className="text-sm sm:text-base text-[#6b4e2f] font-medium">
              이 탐험가 연맹이 어떤 분위기인지, 가입 전에 미리 살펴보세요.
            </p>
          </div>
        </section>

       
        <section className="rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-5 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row gap-6 relative overflow-hidden">
          {/* 금속 장식 테두리 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
          
          <div className="w-full sm:w-40 md:w-44">
            <div className="relative w-full aspect-[4/3] sm:aspect-[3/4] group">
              {/* 나무 프레임 */}
              <div className="absolute inset-0 rounded-lg border-4 border-[#5a3e25] shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_0_30px_rgba(139,90,43,0.4)] pointer-events-none z-10" style={{
                background: 'linear-gradient(135deg, rgba(139,90,43,0.3) 0%, rgba(90,62,37,0.5) 50%, rgba(139,90,43,0.3) 100%)',
                clipPath: 'polygon(12px 0, 100% 0, 100% 12px, 100% 100%, 0 100%, 0 12px)'
              }} />
              <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#5a3315] border-2 border-[#6b4e2f] shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-[0_16px_50px_rgba(201,169,97,0.5),inset_0_2px_4px_rgba(255,255,255,0.15)] group-hover:scale-[1.02]">
                {guild.emblemUrl ? (
                  <img
                    src={resolveImageUrl(guild.emblemUrl) || ''}
                    alt={`${guild.name} 연맹 엠블럼`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="relative flex flex-col items-center gap-1 text-sm text-[#d4a574] z-0">
                    <span className="text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">🧭</span>
                    <span className="text-xs tracking-[0.15em] uppercase font-bold">
                      guild emblem
                    </span>
                    <span className="text-[11px] font-medium">
                      탐험가 연맹 우드 플라크
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          
          <div className="flex-1 flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-3 py-1 text-xs font-black text-[#f4d7aa] shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30">
                <span>🌙 탐험가 연맹</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#f4d7aa] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {guild.name}
              </h2>
              <p className="text-base text-[#d4a574] font-medium">
                {guild.description || "연맹 설명이 없습니다."}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm sm:text-base">
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-[0.12em] text-[#8b6f47] font-bold">
                  최대 인원
                </p>
                <p className="font-black text-[#f4d7aa]">
                  {guild.maxMembers}명
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-[0.12em] text-[#8b6f47] font-bold">
                  모집 여부
                </p>
                <p className={`text-lg font-black ${isClosed ? "text-red-500" : "text-green-500"}`}>
                  {isClosed ? "모집 마감" : "모집 중"}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-[0.12em] text-[#8b6f47] font-bold">
                  현재 인원
                </p>
                <p className="font-black text-[#f4d7aa]">
                  {memberCount} / {guild.maxMembers ?? 20}명
                </p>
              </div>
              {guild.category && (
                <div className="space-y-0.5">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8b6f47] font-bold">
                    카테고리
                  </p>
                  <p className="font-black text-[#f4d7aa]">
                    {guild.category}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        
        <section className="rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] px-5 py-6 sm:px-8 sm:py-7 space-y-6 relative">
          {/* 고대 문서 장식 */}
          <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
         
          {guild.description && (
            <>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2">
                  <span className="h-6 w-1 rounded-full bg-[#c9a961]" />
                  <h3 className="text-base sm:text-lg font-black text-[#f4d7aa] tracking-wide">
                    📜 연맹 소개
                  </h3>
                </div>
                <p className="text-base text-[#d4a574] leading-relaxed whitespace-pre-line font-medium">
                  {guild.description}
                </p>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
            </>
          )}

         
          {guild.tags && guild.tags.length > 0 && (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2">
                <span className="h-6 w-1 rounded-full bg-[#c9a961]" />
                <h3 className="text-base sm:text-lg font-black text-[#f4d7aa] tracking-wide">
                  🏷️ 태그
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {guild.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-gradient-to-b from-[#4a3420] to-[#3a2818] px-3 py-1 text-sm text-[#d4a574] font-bold border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
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
              <p className="text-base text-[#6b4e2f] mb-4 font-medium">
                이미 가입한 연맹이에요.
              </p>
              <button
                type="button"
                onClick={() => navigate("/guild")}
                className="min-w-[110px] rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-6 py-2.5 text-base font-black text-white tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
              >
                ⚔️ 내 연맹으로 가기
              </button>
            </div>
          ) : isPending ? (
            <div className="text-center">
              <p className="text-base text-[#6b4e2f] mb-4 font-medium">
                가입 신청이 완료되었어요. 연맹장의 승인을 기다려주세요.
              </p>
              <button
                type="button"
                onClick={() => navigate("/guild")}
                className="min-w-[110px] rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-6 py-2.5 text-base font-black text-white tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
              >
                🏠 연맹 홈으로
              </button>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="min-w-[110px] rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] px-6 py-2.5 text-base font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(true)}
                className="min-w-[110px] rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] px-6 py-2.5 text-base font-black text-white tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
              >
                ⚔️ 가입 신청하기
              </button>
            </div>
          )}
          {joinError && (
            <p className="text-base text-red-400 text-center font-bold">{joinError}</p>
          )}
        </section>
      </main>

      {/* 탐험가 가입 신청서 모달 */}
      {showJoinForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(88,58,21,0.6)] backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[0_25px_70px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] p-8 relative max-h-[90vh] overflow-y-auto">
            {/* 금속 장식 테두리 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            
            {/* 탐험가 스타일 장식 요소 */}
            <div className="absolute top-6 right-6 text-3xl opacity-20 pointer-events-none">🗺️</div>
            <div className="absolute top-8 left-8 text-2xl opacity-15 pointer-events-none">⚔️</div>
            <div className="absolute bottom-6 right-8 text-xl opacity-15 pointer-events-none">🧭</div>

            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => {
                setShowJoinForm(false);
                setJoinMessage("");
                setJoinError(null);
              }}
              className="absolute top-6 right-6 z-50 text-[#d4a574] hover:text-[#f4d7aa] hover:bg-[#6b4e2f]/60 rounded-full w-9 h-9 flex items-center justify-center transition text-lg font-black cursor-pointer active:scale-95 border border-[#6b4e2f]"
              aria-label="닫기"
            >
              ✕
            </button>

            {/* 신청서 헤더 */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#6b4321] shadow-[0_8px_20px_rgba(107,67,33,0.6),inset_0_2px_4px_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] mb-4">
                <span className="text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">📜</span>
              </div>
              <h2 className="text-2xl font-black text-[#f4d7aa] mb-2 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                탐험가 가입 신청서
              </h2>
              <p className="text-base text-[#d4a574] font-medium">
                {guild.name} 연맹에 가입을 신청합니다
              </p>
            </div>

            {/* 연맹 정보 카드 */}
            <div className="mb-6 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] border-2 border-[#6b4e2f] p-4 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-3">
                {guild.emblemUrl ? (
                  <img
                    src={resolveImageUrl(guild.emblemUrl) || ''}
                    alt={guild.name}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-[#6b4e2f] shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#6b4321] flex items-center justify-center border-2 border-[#6b4e2f] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                    <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">🛡️</span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-[#f4d7aa] tracking-wide">{guild.name}</h3>
                  <p className="text-sm text-[#d4a574] line-clamp-1 font-medium">
                    {guild.description || "연맹 설명이 없습니다."}
                  </p>
                </div>
              </div>
            </div>

            {/* 신청서 폼 */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!guildId) return;

                setJoining(true);
                setJoinError(null);

                try {
                  // 백엔드에 가입 신청 (메시지 포함)
                  await joinGuildBackend(guildId, joinMessage.trim() || undefined);

                  // 가입 신청 완료 메시지
                  toast.success("⚔️ 가입 신청이 완료되었어요!\n연맹장의 승인을 기다려주세요.");
                  setShowJoinForm(false);
                  setJoinMessage("");
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
              className="space-y-6"
            >
              <div>
                <label className="block text-base font-black mb-2 text-[#f4d7aa] tracking-wide">
                  <span className="flex items-center gap-2">
                    <span>✍️</span>
                    <span>가입 동기 및 자기소개</span>
                  </span>
                  <span className="text-sm font-normal text-[#8b6f47] ml-2">
                    (선택사항)
                  </span>
                </label>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="이 연맹에 가입하고 싶은 이유나 간단한 자기소개를 적어주세요. 연맹장이 검토할 때 도움이 됩니다."
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-4 py-3 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] transition resize-none min-h-[120px] placeholder:text-[#8b6f47]"
                  maxLength={500}
                />
                <p className="text-sm text-[#8b6f47] mt-1.5 text-right font-medium">
                  {joinMessage.length} / 500자
                </p>
              </div>

              {/* 안내 문구 */}
              <div className="rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] border-2 border-[#6b4e2f] p-4 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                <div className="flex items-start gap-3">
                  <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">ℹ️</span>
                  <div className="text-sm text-[#d4a574] leading-relaxed">
                    <p className="font-black mb-1 text-[#f4d7aa]">가입 신청 안내</p>
                    <ul className="space-y-1 list-disc list-inside text-[#d4a574] font-medium">
                      <li>가입 신청 후 연맹장의 승인이 필요합니다.</li>
                      <li>승인 여부는 연맹 홈에서 확인할 수 있습니다.</li>
                      <li>가입 동기는 선택사항이지만, 작성하시면 승인에 도움이 됩니다.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {joinError && (
                <div className="rounded-lg bg-gradient-to-b from-[#4a1f1f] to-[#3a1818] border-2 border-red-600/50 px-4 py-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                  <p className="text-base text-red-400 font-bold">{joinError}</p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinForm(false);
                    setJoinMessage("");
                    setJoinError(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] text-base font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] hover:from-[#9b7f57] hover:to-[#7b5e3f] text-white text-base font-black tracking-wide transition shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-[#8b6f47] disabled:hover:to-[#6b4e2f]"
                >
                  {joining ? "⚔️ 신청 중..." : "⚔️ 가입 신청 제출하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildDetail;
