// frontend/src/pages/Guild/GuildDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import toast from "react-hot-toast";
import {
  joinGuildBackend,
  getGuildById,
  getGuildMembers,
  type GuildDTO,
} from "@/services/guildService";
import { useGuildStatus } from "@/hooks/useGuildStatus";
import { resolveImageUrl } from "@/api/apiClient";

const GuildDetail: React.FC = () => {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;
  const navigate = useNavigate();
  const { status: myGuildStatus } = useGuildStatus();

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

  const [guild, setGuild] = useState<GuildDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [memberCount, setMemberCount] = useState(0);

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
      <div
        className="min-h-screen relative overflow-hidden bg-warm-oak-stripe"
        style={{ color: THEME.text }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,169,97,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(107,78,47,0.18),transparent_55%)]" />
        <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.12)]" />

        <div className="relative">
          <HeaderNav />
          <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
            <div
              className="rounded-2xl border p-6 shadow-[0_18px_50px_rgba(43,29,18,0.14)]"
              style={{
                background: THEME.surface,
                borderColor: "rgba(201,169,97,0.30)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(201,169,97,0.14)",
                    border: "1px solid rgba(201,169,97,0.30)",
                  }}
                >
                  <i
                    className="fas fa-spinner fa-spin"
                    style={{ color: THEME.brand }}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="font-black" style={{ color: THEME.brand3 }}>
                    연맹 정보를 불러오는 중…
                  </p>
                  <p className="text-sm mt-1 font-medium" style={{ color: THEME.muted }}>
                    잠시만 기다려 주세요.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 없는 길드
  if (notFound || !guild) {
    return (
      <div
        className="min-h-screen relative overflow-hidden bg-warm-oak-stripe"
        style={{ color: THEME.text }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,169,97,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(107,78,47,0.18),transparent_55%)]" />
        <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.12)]" />

        <div className="relative">
          <HeaderNav />
          <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-black hover:underline"
              style={{ color: THEME.muted }}
            >
              <i className="fas fa-arrow-left" aria-hidden="true" />
              <span>이전 페이지로 돌아가기</span>
            </button>

            <div
              className="rounded-2xl border px-6 py-10 text-center shadow-[0_18px_50px_rgba(43,29,18,0.14)]"
              style={{
                background: THEME.surface,
                borderColor: "rgba(201,169,97,0.30)",
                color: THEME.muted,
              }}
            >
              해당 탐험가 연맹을 찾을 수 없어요.
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-warm-oak-stripe"
      style={{ color: THEME.text }}
    >
      {/* Warm Oak stripe + glow overlay (match BeforeLogin) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,169,97,0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(107,78,47,0.18),transparent_55%)]" />
      <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.12)]" />

      <div className="relative">
        <HeaderNav />

        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {/* 헤더 */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => navigate("/guild/explore")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition"
              style={{
                background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                color: "#fff",
                borderColor: "rgba(201,169,97,0.25)",
              }}
            >
              <i className="fas fa-arrow-left" aria-hidden="true" />
              <span>탐험가 연맹 목록으로 돌아가기</span>
            </button>

            <div className="flex flex-col items-center gap-1 text-center">
              <p
                className="text-sm tracking-[0.18em] uppercase font-bold"
                style={{ color: THEME.brand2 }}
              >
                explorer guild briefing
              </p>

              <h1
                className="text-3xl sm:text-4xl font-black tracking-wider"
                style={{ color: THEME.brand3 }}
              >
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-scroll" style={{ color: THEME.brand }} aria-hidden="true" />
                  연맹 상세소개
                </span>
              </h1>

              <p className="text-sm sm:text-base font-medium" style={{ color: THEME.muted }}>
                이 탐험가 연맹이 어떤 분위기인지, 가입 전에 미리 살펴보세요.
              </p>
            </div>
          </section>

          {/* 요약 카드 */}
          <section
            className="rounded-2xl border px-5 py-6 sm:px-8 sm:py-7 shadow-[0_22px_60px_rgba(43,29,18,0.14)] flex flex-col sm:flex-row gap-6 relative overflow-hidden"
            style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
          >
            <div className="w-full sm:w-40 md:w-44">
              <div className="relative w-full aspect-[4/3] sm:aspect-[3/4] group">
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    border: "1px solid rgba(201,169,97,0.22)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.20)",
                  }}
                />
                <div
                  className="w-full h-full rounded-2xl border flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-[0_16px_50px_rgba(201,169,97,0.22)]"
                  style={{
                    borderColor: "rgba(201,169,97,0.26)",
                    background: "linear-gradient(135deg, rgba(201,169,97,0.10), rgba(255,255,255,0.55))",
                  }}
                >
                  {guild.emblemUrl ? (
                    <img
                      src={resolveImageUrl(guild.emblemUrl) || ""}
                      alt={`${guild.name} 연맹 엠블럼`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="relative flex flex-col items-center gap-1 z-0">
                      <i
                        className="fas fa-shield-halved"
                        style={{ color: THEME.brand2, fontSize: 28 }}
                        aria-hidden="true"
                      />
                      <span
                        className="text-xs tracking-[0.15em] uppercase font-black"
                        style={{ color: THEME.muted }}
                      >
                        guild emblem
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: THEME.muted }}>
                        연맹 기본 엠블럼
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black border"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    color: THEME.brand3,
                    borderColor: "rgba(201,169,97,0.28)",
                  }}
                >
                  <i className="fas fa-compass" style={{ color: THEME.brand }} aria-hidden="true" />
                  탐험가 연맹
                </div>

                <h2
                  className="text-2xl sm:text-3xl font-black tracking-wider"
                  style={{ color: THEME.brand3 }}
                >
                  {guild.name}
                </h2>

                <p className="text-base font-medium" style={{ color: THEME.muted }}>
                  {guild.description || "연맹 설명이 없습니다."}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm sm:text-base">
                <div className="space-y-0.5">
                  <p className="text-xs uppercase tracking-[0.12em] font-bold" style={{ color: THEME.brand2 }}>
                    최대 인원
                  </p>
                  <p className="font-black" style={{ color: THEME.brand3 }}>
                    {guild.maxMembers}명
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs uppercase tracking-[0.12em] font-bold" style={{ color: THEME.brand2 }}>
                    모집 여부
                  </p>
                  <p
                    className="text-lg font-black"
                    style={{ color: isClosed ? THEME.danger : "#2F6B4E" }}
                  >
                    {isClosed ? "모집 마감" : "모집 중"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs uppercase tracking-[0.12em] font-bold" style={{ color: THEME.brand2 }}>
                    현재 인원
                  </p>
                  <p className="font-black" style={{ color: THEME.brand3 }}>
                    {memberCount} / {guild.maxMembers ?? 20}명
                  </p>
                </div>

                {guild.category && (
                  <div className="space-y-0.5">
                    <p
                      className="text-xs uppercase tracking-[0.12em] font-bold"
                      style={{ color: THEME.brand2 }}
                    >
                      카테고리
                    </p>
                    <p className="font-black" style={{ color: THEME.brand3 }}>
                      {guild.category}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 소개/태그 */}
          <section
            className="rounded-2xl border px-5 py-6 sm:px-8 sm:py-7 space-y-6 shadow-[0_22px_60px_rgba(43,29,18,0.14)] relative"
            style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.30)" }}
          >
            {guild.description && (
              <>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2">
                    <span className="h-6 w-1 rounded-full" style={{ background: THEME.brand }} />
                    <h3
                      className="text-base sm:text-lg font-black tracking-wide"
                      style={{ color: THEME.brand3 }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <i className="fas fa-scroll" style={{ color: THEME.brand }} aria-hidden="true" />
                        연맹 소개
                      </span>
                    </h3>
                  </div>

                  <p
                    className="text-base leading-relaxed whitespace-pre-line font-medium"
                    style={{ color: THEME.muted }}
                  >
                    {guild.description}
                  </p>
                </div>

                <div
                  className="h-px w-full"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(201,169,97,0.45), transparent)" }}
                />
              </>
            )}

            {guild.tags && guild.tags.length > 0 && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2">
                  <span className="h-6 w-1 rounded-full" style={{ background: THEME.brand }} />
                  <h3
                    className="text-base sm:text-lg font-black tracking-wide"
                    style={{ color: THEME.brand3 }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <i className="fas fa-hashtag" style={{ color: THEME.brand }} aria-hidden="true" />
                      태그
                    </span>
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {guild.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold border"
                      style={{
                        background: "rgba(255,255,255,0.55)",
                        color: THEME.brand3,
                        borderColor: "rgba(201,169,97,0.28)",
                      }}
                    >
                      <i className="fas fa-hashtag" style={{ color: THEME.brand }} aria-hidden="true" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 액션 */}
          <section className="space-y-4 pt-2">
            {isMyGuild ? (
              <div className="text-center">
                <p className="text-base mb-4 font-medium" style={{ color: THEME.muted }}>
                  이미 가입한 연맹이에요.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/guild")}
                  className="min-w-[110px] rounded-2xl px-6 py-2.5 text-base font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition"
                  style={{
                    background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                    color: "#fff",
                    borderColor: "rgba(201,169,97,0.25)",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="fas fa-people-group" aria-hidden="true" />
                    내 연맹으로 가기
                  </span>
                </button>
              </div>
            ) : isPending ? (
              <div className="text-center">
                <p className="text-base mb-4 font-medium" style={{ color: THEME.muted }}>
                  가입 신청이 완료되었어요. 연맹장의 승인을 기다려주세요.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/guild")}
                  className="min-w-[110px] rounded-2xl px-6 py-2.5 text-base font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition"
                  style={{
                    background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                    color: "#fff",
                    borderColor: "rgba(201,169,97,0.25)",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="fas fa-house" aria-hidden="true" />
                    연맹 홈으로
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="min-w-[110px] rounded-2xl px-6 py-2.5 text-base font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.12)] active:scale-[0.99] transition"
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
                  onClick={() => setShowJoinForm(true)}
                  className="min-w-[110px] rounded-2xl px-6 py-2.5 text-base font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition"
                  style={{
                    background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                    color: "#fff",
                    borderColor: "rgba(201,169,97,0.25)",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="fas fa-right-to-bracket" aria-hidden="true" />
                    가입 신청하기
                  </span>
                </button>
              </div>
            )}

            {joinError && (
              <div
                className="mx-auto max-w-3xl rounded-2xl border px-4 py-3 text-center font-bold"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  borderColor: "rgba(180,35,24,0.35)",
                  color: THEME.danger,
                }}
              >
                {joinError}
              </div>
            )}
          </section>
        </main>

        {/* 가입 신청 모달 */}
        {showJoinForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4">
            <div
              className="w-full max-w-2xl rounded-2xl border p-8 relative max-h-[90vh] overflow-y-auto shadow-[0_22px_60px_rgba(43,29,18,0.18)]"
              style={{
                background: THEME.surface,
                borderColor: "rgba(201,169,97,0.30)",
                color: THEME.text,
              }}
            >
              {/* 닫기 */}
              <button
                type="button"
                onClick={() => {
                  setShowJoinForm(false);
                  setJoinMessage("");
                  setJoinError(null);
                }}
                className="absolute top-6 right-6 z-50 w-10 h-10 rounded-2xl border flex items-center justify-center active:scale-[0.98] transition"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  borderColor: "rgba(201,169,97,0.30)",
                  color: THEME.brand3,
                }}
                aria-label="닫기"
              >
                <i className="fas fa-xmark" aria-hidden="true" />
              </button>

              {/* 헤더 */}
              <div className="mb-6 text-center">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-4"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    borderColor: "rgba(201,169,97,0.30)",
                    boxShadow: "0 14px 30px rgba(43,29,18,0.12)",
                  }}
                >
                  <i
                    className="fas fa-scroll"
                    style={{ color: THEME.brand, fontSize: 28 }}
                    aria-hidden="true"
                  />
                </div>

                <h2 className="text-2xl font-black mb-2 tracking-wide" style={{ color: THEME.brand3 }}>
                  탐험가 가입 신청서
                </h2>

                <p className="text-base font-medium" style={{ color: THEME.muted }}>
                  {guild.name} 연맹에 가입을 신청합니다
                </p>
              </div>

              {/* 연맹 카드 */}
              <div
                className="mb-6 rounded-2xl border p-4 shadow-[0_16px_40px_rgba(43,29,18,0.14)]"
                style={{ background: "rgba(255,255,255,0.55)", borderColor: "rgba(201,169,97,0.28)" }}
              >
                <div className="flex items-center gap-3">
                  {guild.emblemUrl ? (
                    <img
                      src={resolveImageUrl(guild.emblemUrl) || ""}
                      alt={guild.name}
                      className="w-16 h-16 rounded-2xl object-cover border shadow-[0_12px_30px_rgba(43,29,18,0.14)]"
                      style={{ borderColor: "rgba(201,169,97,0.28)" }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-[0_12px_30px_rgba(43,29,18,0.14)]"
                      style={{
                        background: "rgba(201,169,97,0.10)",
                        borderColor: "rgba(201,169,97,0.28)",
                      }}
                    >
                      <i
                        className="fas fa-shield-halved"
                        style={{ color: THEME.brand2, fontSize: 22 }}
                        aria-hidden="true"
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-black tracking-wide" style={{ color: THEME.brand3 }}>
                      {guild.name}
                    </h3>
                    <p className="text-sm line-clamp-1 font-medium" style={{ color: THEME.muted }}>
                      {guild.description || "연맹 설명이 없습니다."}
                    </p>
                  </div>
                </div>
              </div>

              {/* 폼 */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!guildId) return;

                  setJoining(true);
                  setJoinError(null);

                  try {
                    await joinGuildBackend(guildId, joinMessage.trim() || undefined);
                    toast.success("가입 신청이 완료되었어요!\n연맹장의 승인을 기다려주세요.");
                    setShowJoinForm(false);
                    setJoinMessage("");
                    navigate("/guild");
                  } catch (err: any) {
                    console.error("길드 가입 실패:", err);
                    setJoinError(
                      err?.data?.message ||
                        err?.message ||
                        "가입 신청에 실패했어요. 잠시 후 다시 시도해 주세요.",
                    );
                  } finally {
                    setJoining(false);
                  }
                }}
                className="space-y-6"
              >
                <div>
                  <label
                    className="block text-base font-black mb-2 tracking-wide"
                    style={{ color: THEME.brand3 }}
                  >
                    <span className="flex items-center gap-2">
                      <i className="fas fa-pen-nib" style={{ color: THEME.brand }} aria-hidden="true" />
                      <span>가입 동기 및 자기소개</span>
                    </span>
                    <span className="text-sm font-normal ml-2" style={{ color: THEME.muted }}>
                      (선택사항)
                    </span>
                  </label>

                  <textarea
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="이 연맹에 가입하고 싶은 이유나 간단한 자기소개를 적어주세요. 연맹장이 검토할 때 도움이 됩니다."
                    className="w-full rounded-2xl border px-4 py-3 text-base focus:outline-none focus:ring-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition resize-none min-h-[120px]"
                    style={{
                      background: "rgba(255,255,255,0.55)",
                      borderColor: "rgba(201,169,97,0.30)",
                      color: THEME.text,
                    }}
                    maxLength={500}
                  />

                  <p className="text-sm mt-1.5 text-right font-medium" style={{ color: THEME.muted }}>
                    {joinMessage.length} / 500자
                  </p>
                </div>

                {/* 안내 */}
                <div
                  className="rounded-2xl border p-4 shadow-[0_16px_40px_rgba(43,29,18,0.12)]"
                  style={{ background: "rgba(255,255,255,0.55)", borderColor: "rgba(201,169,97,0.28)" }}
                >
                  <div className="flex items-start gap-3">
                    <i
                      className="fas fa-circle-info"
                      style={{ color: THEME.brand, fontSize: 18 }}
                      aria-hidden="true"
                    />
                    <div className="text-sm leading-relaxed" style={{ color: THEME.muted }}>
                      <p className="font-black mb-1" style={{ color: THEME.brand3 }}>
                        가입 신청 안내
                      </p>
                      <ul className="space-y-1 list-disc list-inside font-medium">
                        <li>가입 신청 후 연맹장의 승인이 필요합니다.</li>
                        <li>승인 여부는 연맹 홈에서 확인할 수 있습니다.</li>
                        <li>가입 동기는 선택사항이지만, 작성하시면 승인에 도움이 됩니다.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {joinError && (
                  <div
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.55)",
                      borderColor: "rgba(180,35,24,0.35)",
                    }}
                  >
                    <p className="text-base font-bold" style={{ color: THEME.danger }}>
                      {joinError}
                    </p>
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
                    className="flex-1 px-4 py-3 rounded-2xl text-base font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.12)] active:scale-[0.99] transition"
                    style={{
                      background: "rgba(255,255,255,0.55)",
                      color: THEME.brand3,
                      borderColor: "rgba(201,169,97,0.30)",
                    }}
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    disabled={joining}
                    className="flex-1 px-4 py-3 rounded-2xl text-base font-black tracking-wide border shadow-[0_16px_34px_rgba(43,29,18,0.18)] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                      color: "#fff",
                      borderColor: "rgba(201,169,97,0.25)",
                    }}
                  >
                    {joining ? "신청 중..." : "가입 신청 제출하기"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuildDetail;