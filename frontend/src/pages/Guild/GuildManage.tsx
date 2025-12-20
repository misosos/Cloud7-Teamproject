// frontend/src/pages/Guild/GuildManage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import {
  fetchPendingMemberships,
  approveMembership,
  rejectMembership,
  type PendingMembership,
} from "@/services/guildService";
import toast from "react-hot-toast";

const BG = "#F7F0E6";
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const DANGER = "#B42318";

const GuildManage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();

  const [pending, setPending] = useState<PendingMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    if (!guildId) {
      setError("연맹 ID가 없습니다.");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPendingMemberships(Number(guildId));
        setPending(data);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.data?.message ||
            err?.message ||
            "가입 신청 목록을 불러오는 중 오류가 발생했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [guildId]);

  const handleApprove = async (membershipId: number) => {
    if (!guildId) return;

    setProcessing(membershipId);
    try {
      await approveMembership(Number(guildId), membershipId);
      setPending((prev) => prev.filter((m) => m.id !== membershipId));
      toast.success("가입 신청을 승인했어요.");
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "가입 신청 승인에 실패했습니다.",
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (membershipId: number) => {
    if (!guildId) return;

    if (!confirm("정말 이 가입 신청을 거절하시겠어요?")) return;

    setProcessing(membershipId);
    try {
      await rejectMembership(Number(guildId), membershipId);
      setPending((prev) => prev.filter((m) => m.id !== membershipId));
      toast.success("가입 신청을 거절했어요.");
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "가입 신청 거절에 실패했습니다.",
      );
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-warm-oak-stripe"
        style={{ color: TEXT, backgroundColor: BG }}
      >
        <HeaderNav />
        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
          <p className="text-base font-medium" style={{ color: MUTED }}>
            가입 신청 목록을 불러오는 중...
          </p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen bg-warm-oak-stripe"
        style={{ color: TEXT, backgroundColor: BG }}
      >
        <HeaderNav />
        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
          <div
            className="rounded-2xl backdrop-blur px-6 py-7 text-center space-y-3"
            style={{
              background: SURFACE,
              border: "1px solid rgba(201,169,97,0.28)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.12)",
            }}
          >
            <p className="text-base font-bold" style={{ color: DANGER }}>
              <span className="inline-flex items-center gap-2 justify-center">
                <i className="fas fa-triangle-exclamation" aria-hidden="true" />
                {error}
              </span>
            </p>
            <button
              onClick={() => navigate("/guild")}
              className="text-base font-bold hover:underline"
              style={{ color: BRAND2 }}
            >
              연맹 홈으로 돌아가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-warm-oak-stripe"
      style={{ color: TEXT, backgroundColor: BG }}
    >
      <HeaderNav />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
        <header className="mb-8">
          <button
            onClick={() => navigate("/guild")}
            className="mb-4 inline-flex items-center gap-2 font-black tracking-wide hover:underline"
            style={{ color: MUTED }}
          >
            <i className="fas fa-arrow-left" aria-hidden="true" />
            <span>연맹 홈으로</span>
          </button>

          <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight" style={{ color: TEXT }}>
            <span className="inline-flex items-center gap-2">
              <i className="fas fa-clipboard-list" aria-hidden="true" style={{ color: BRAND }} />
              가입 신청 관리
            </span>
          </h1>

          <p className="text-base font-medium" style={{ color: MUTED }}>
            연맹에 가입을 신청한 사람들의 목록이에요. 승인 또는 거절할 수 있어요.
          </p>
        </header>

        {pending.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center relative overflow-hidden backdrop-blur"
            style={{
              background: SURFACE,
              border: "1px dashed rgba(201,169,97,0.38)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.12)",
            }}
          >
            <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_at_20%_20%,rgba(201,169,97,0.22),transparent_55%)]" />
            <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_85%_75%,rgba(107,78,47,0.14),transparent_58%)]" />

            <div className="relative">
              <div
                className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center text-3xl mx-auto"
                style={{
                  background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                  border: "1px solid rgba(201,169,97,0.30)",
                  boxShadow:
                    "0 10px 26px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
                  color: "white",
                }}
              >
                <i className="fas fa-envelope-open-text" aria-hidden="true" />
              </div>

              <h2 className="text-xl font-black mb-2" style={{ color: TEXT }}>
                대기 중인 가입 신청이 없어요
              </h2>
              <p className="text-base font-medium" style={{ color: MUTED }}>
                새로운 가입 신청이 들어오면 여기에 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl p-5 relative overflow-hidden backdrop-blur"
                style={{
                  background: SURFACE,
                  border: "1px solid rgba(201,169,97,0.22)",
                  boxShadow: "0 14px 45px rgba(0,0,0,0.12)",
                }}
              >
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_0%,rgba(201,169,97,0.18),transparent_55%)]" />
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_90%_30%,rgba(107,78,47,0.12),transparent_58%)]" />

                <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-black mb-1 tracking-wide" style={{ color: TEXT }}>
                      {member.userName || "이름 없음"}
                    </h3>

                    <p className="text-sm font-medium" style={{ color: MUTED }}>
                      <span className="inline-flex items-center gap-2">
                        <i className="fas fa-at" aria-hidden="true" style={{ color: BRAND2 }} />
                        {member.userEmail}
                      </span>
                    </p>

                    {member.message && (
                      <div
                        className="mt-3 p-3 rounded-2xl"
                        style={{
                          background: "rgba(255,255,255,0.34)",
                          border: "1px solid rgba(107,78,47,0.18)",
                          boxShadow: "inset 0 2px 12px rgba(0,0,0,0.06)",
                        }}
                      >
                        <p className="text-xs font-bold mb-1.5" style={{ color: BRAND2 }}>
                          <span className="inline-flex items-center gap-2">
                            <i className="fas fa-pen-nib" aria-hidden="true" />
                            가입 동기 및 자기소개
                          </span>
                        </p>

                        <p
                          className="text-sm font-medium whitespace-pre-line leading-relaxed"
                          style={{ color: MUTED }}
                        >
                          {member.message}
                        </p>
                      </div>
                    )}

                    <p className="text-xs mt-2 font-medium" style={{ color: MUTED }}>
                      <span className="inline-flex items-center gap-2">
                        <i className="fas fa-calendar-day" aria-hidden="true" style={{ color: BRAND2 }} />
                        신청일:{" "}
                        {new Date(member.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2 sm:flex-col sm:shrink-0">
                    <button
                      onClick={() => handleApprove(member.id)}
                      disabled={processing === member.id}
                      className="px-4 py-2 rounded-xl text-sm font-black tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                        color: "white",
                        border: "1px solid rgba(201,169,97,0.30)",
                        boxShadow:
                          "0 10px 26px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <i className="fas fa-circle-check" aria-hidden="true" />
                        {processing === member.id ? "처리 중..." : "승인"}
                      </span>
                    </button>

                    <button
                      onClick={() => handleReject(member.id)}
                      disabled={processing === member.id}
                      className="px-4 py-2 rounded-xl text-sm font-black tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: "rgba(180,35,24,0.10)",
                        color: DANGER,
                        border: "1px solid rgba(180,35,24,0.28)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <i className="fas fa-circle-xmark" aria-hidden="true" />
                        거절
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default GuildManage;