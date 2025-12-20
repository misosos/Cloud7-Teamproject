// frontend/src/pages/AfterLogin/MyGuild.tsx
import { useState } from "react";
import { useGuildStatus } from "@/hooks/useGuildStatus";
import { createGuild } from "@/services/guildService";

export default function MyGuildPage() {
  const { loading, status, error } = useGuildStatus();

  // Theme tokens (Warm Oak)
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

  // 연맹 생성 폼 상태
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [maxMembers, setMaxMembers] = useState<number | "">("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreateGuild(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      if (!name.trim()) {
        setCreateError("연맹 이름을 입력해 주세요.");
        setCreating(false);
        return;
      }

      const guild = await createGuild({
        name: name.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        rules: rules.trim() || undefined,
        maxMembers: typeof maxMembers === "number" ? maxMembers : undefined,
      });

      console.log("created guild:", guild);
      window.location.reload();
    } catch (err: any) {
      console.error("연맹 생성 에러:", err);
      console.error("에러 상세:", {
        message: err?.message,
        status: err?.status,
        data: err?.data,
        stack: err?.stack,
      });

      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "연맹 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setCreateError(errorMessage);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center px-4"
        style={{ backgroundColor: THEME.bg, color: THEME.text }}
      >
        <div
          className="w-full max-w-md rounded-2xl border shadow-[0_18px_50px_rgba(43,29,18,0.15)] p-6 text-center"
          style={{ background: THEME.surface, borderColor: "rgba(201,169,97,0.35)" }}
        >
          <div className="mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center"
               style={{ background: "rgba(201,169,97,0.14)", border: "1px solid rgba(201,169,97,0.35)" }}>
            <i className="fas fa-spinner fa-spin" style={{ color: THEME.brand }} aria-hidden="true" />
          </div>
          <p className="text-base font-black" style={{ color: THEME.text }}>
            내 연맹 정보를 불러오는 중입니다...
          </p>
          <p className="text-sm mt-1" style={{ color: THEME.muted }}>
            잠시만 기다려 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center px-4"
        style={{ backgroundColor: THEME.bg, color: THEME.text }}
      >
        <div
          className="w-full max-w-md rounded-2xl border p-6 shadow-[0_18px_50px_rgba(43,29,18,0.15)]"
          style={{
            background: THEME.surface,
            borderColor: "rgba(180,35,24,0.30)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(180,35,24,0.10)",
                border: "1px solid rgba(180,35,24,0.22)",
              }}
            >
              <i className="fas fa-triangle-exclamation" style={{ color: THEME.danger }} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-black" style={{ color: THEME.danger }}>
                내 연맹 정보를 불러오는 중 오류가 발생했어요.
              </p>
              <p className="text-sm mt-1 break-words" style={{ color: THEME.muted }}>
                {error.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 아직 한 번도 연맹을 만들거나 가입하지 않은 상태
  if (!status || status.status === "NONE") {
    return (
      <div className="min-h-[calc(100vh-64px)]" style={{ backgroundColor: THEME.bg }}>
        <div className="max-w-3xl mx-auto py-10 px-4">
          <div className="mb-8 text-center">
            <div
              className="mx-auto mb-3 w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(201,169,97,0.14)",
                border: "1px solid rgba(201,169,97,0.35)",
                boxShadow: "0 14px 30px rgba(43,29,18,0.10)",
              }}
            >
              <i className="fas fa-users" style={{ color: THEME.brand }} aria-hidden="true" />
            </div>

            <h1 className="text-2xl font-black mb-2" style={{ color: THEME.text }}>
              현재 가입한 연맹이 없습니다.
            </h1>
            <p className="text-sm" style={{ color: THEME.muted }}>
              나만의 탐험가 연맹을 만들어서 다른 탐험가들을 모아보세요!
            </p>
          </div>

          {/* 연맹 만들기 폼 */}
          <form
            onSubmit={handleCreateGuild}
            className="space-y-4 rounded-2xl p-6 border shadow-[0_22px_60px_rgba(43,29,18,0.15)]"
            style={{
              background: THEME.surface,
              borderColor: "rgba(201,169,97,0.30)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black" style={{ color: THEME.brand3 }}>
                새 연맹 만들기
              </h2>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(201,169,97,0.14)",
                  color: THEME.brand3,
                  border: "1px solid rgba(201,169,97,0.28)",
                }}
              >
                <i className="fas fa-wand-magic-sparkles" aria-hidden="true" style={{ color: THEME.brand }} />
                Warm Oak
              </span>
            </div>

            <div>
              <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                연맹 이름<span className="ml-1" style={{ color: THEME.danger }}>*</span>
              </label>
              <div className="relative">
                <i
                  className="fas fa-pen-nib absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: THEME.muted }}
                  aria-hidden="true"
                />
                <input
                  className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-sm border
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)] focus:outline-none focus:ring-2"
                  style={{
                    background: THEME.surface,
                    borderColor: "rgba(201,169,97,0.35)",
                    color: THEME.text,
                  }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예) 야간 러닝 탐험가 연맹"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                카테고리
              </label>
              <div className="relative">
                <i
                  className="fas fa-tags absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: THEME.muted }}
                  aria-hidden="true"
                />
                <input
                  className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-sm border
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)] focus:outline-none focus:ring-2"
                  style={{
                    background: THEME.surface,
                    borderColor: "rgba(201,169,97,0.35)",
                    color: THEME.text,
                  }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예) 러닝, 보드게임, 스터디..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                연맹 설명
              </label>
              <div className="relative">
                <i
                  className="fas fa-scroll absolute left-3 top-3"
                  style={{ color: THEME.muted }}
                  aria-hidden="true"
                />
                <textarea
                  className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-sm border min-h-[90px]
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)] focus:outline-none focus:ring-2"
                  style={{
                    background: THEME.surface,
                    borderColor: "rgba(201,169,97,0.35)",
                    color: THEME.text,
                  }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="연맹 분위기, 모집 대상, 활동 시간대 등을 적어 주세요."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                연맹 규칙
              </label>
              <div className="relative">
                <i
                  className="fas fa-gavel absolute left-3 top-3"
                  style={{ color: THEME.muted }}
                  aria-hidden="true"
                />
                <textarea
                  className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-sm border min-h-[90px]
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)] focus:outline-none focus:ring-2"
                  style={{
                    background: THEME.surface,
                    borderColor: "rgba(201,169,97,0.35)",
                    color: THEME.text,
                  }}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="연맹원들이 지켜야 할 규칙을 적어 주세요."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black mb-1" style={{ color: THEME.brand3 }}>
                제한 인원 (선택)
              </label>
              <div className="relative">
                <i
                  className="fas fa-user-group absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: THEME.muted }}
                  aria-hidden="true"
                />
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-sm border
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)] focus:outline-none focus:ring-2"
                  style={{
                    background: THEME.surface,
                    borderColor: "rgba(201,169,97,0.35)",
                    color: THEME.text,
                  }}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="예) 20"
                />
              </div>

              <p className="text-xs mt-1" style={{ color: THEME.muted }}>
                지금은 아직 DB에 저장되진 않고, 나중에 Guild 스키마에 칼럼 추가하면서 연결하면 됨.
              </p>
            </div>

            {createError && (
              <div
                className="rounded-2xl px-4 py-3 border"
                style={{
                  background: "rgba(180,35,24,0.08)",
                  borderColor: "rgba(180,35,24,0.25)",
                }}
              >
                <p className="text-sm font-bold flex items-center gap-2" style={{ color: THEME.danger }}>
                  <i className="fas fa-triangle-exclamation" aria-hidden="true" />
                  {createError}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-2xl py-3 font-black transition
                shadow-[0_16px_34px_rgba(43,29,18,0.18)]
                disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
              style={{
                background: `linear-gradient(180deg, ${THEME.brand2}, ${THEME.brand3})`,
                color: "#fff",
                border: "1px solid rgba(201,169,97,0.22)",
              }}
            >
              {creating ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                  연맹 만드는 중...
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <i className="fas fa-hammer" aria-hidden="true" />
                  연맹 만들기
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const guild = status.guild!;

  return (
    <div className="min-h-[calc(100vh-64px)]" style={{ backgroundColor: THEME.bg }}>
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-1" style={{ color: THEME.text }}>
            내 연맹
          </h1>
          <p className="text-sm" style={{ color: THEME.muted }}>
            지금 내가 속한 탐험가 연맹 정보입니다.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 border shadow-[0_22px_60px_rgba(43,29,18,0.14)]"
          style={{
            background: THEME.surface,
            borderColor: "rgba(201,169,97,0.30)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(201,169,97,0.14)",
                    border: "1px solid rgba(201,169,97,0.28)",
                  }}
                >
                  <i className="fas fa-shield-heart" style={{ color: THEME.brand }} aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-black truncate" style={{ color: THEME.brand3 }}>
                    {guild.name}
                  </h2>
                  {guild.category && (
                    <p className="text-sm mt-0.5" style={{ color: THEME.muted }}>
                      <i className="fas fa-tag mr-1" aria-hidden="true" />
                      {guild.category}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 엠블럼 자리 */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.55)",
                border: "1px dashed rgba(201,169,97,0.40)",
              }}
              title="엠블럼 자리"
            >
              <i className="fas fa-crown text-lg" style={{ color: THEME.brand2 }} aria-hidden="true" />
            </div>
          </div>

          {guild.description && (
            <p className="text-sm whitespace-pre-line mb-4 leading-relaxed" style={{ color: THEME.text }}>
              {guild.description}
            </p>
          )}

          {guild.tags && guild.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {guild.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border"
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
          )}

          <div className="text-xs flex items-center gap-2" style={{ color: THEME.muted }}>
            <i className="fas fa-clock" aria-hidden="true" />
            생성일: {new Date(guild.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}