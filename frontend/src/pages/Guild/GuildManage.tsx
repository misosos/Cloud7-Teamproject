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
          err?.data?.message || err?.message ||
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
      // 목록에서 제거
      setPending((prev) => prev.filter((m) => m.id !== membershipId));
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

    if (!confirm("정말 이 가입 신청을 거절하시겠어요?")) {
      return;
    }

    setProcessing(membershipId);
    try {
      await rejectMembership(Number(guildId), membershipId);
      // 목록에서 제거
      setPending((prev) => prev.filter((m) => m.id !== membershipId));
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "가입 신청 거절에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f1]">
        <HeaderNav />
        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
          <p className="text-base text-[#6b4e2f] font-medium">가입 신청 목록을 불러오는 중...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fdf8f1]">
        <HeaderNav />
        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
          <div className="text-center space-y-2">
            <p className="text-base text-red-400 font-bold">{error}</p>
            <button
              onClick={() => navigate("/guild")}
              className="text-base text-[#8b6f47] hover:text-[#6b4e2f] font-bold hover:underline"
            >
              연맹 홈으로 돌아가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8f1]">
      <HeaderNav />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
        <header className="mb-8">
          <button
            onClick={() => navigate("/guild")}
            className="text-base text-[#6b4e2f] hover:text-[#5a3e25] mb-4 inline-flex items-center gap-2 font-black tracking-wide"
          >
            <span className="text-lg">←</span>
            <span>연맹 홈으로</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-black text-[#5a3e25] mb-2 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
            📋 가입 신청 관리
          </h1>
          <p className="text-base text-[#6b4e2f] font-medium">
            연맹에 가입을 신청한 사람들의 목록이에요. 승인 또는 거절할 수 있어요.
          </p>
        </header>

        {pending.length === 0 ? (
          <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-8 text-center border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] relative overflow-hidden">
            {/* 금속 장식 테두리 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            
            <div className="w-16 h-16 mb-4 rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#6b4321] flex items-center justify-center text-3xl mx-auto border-2 border-[#6b4e2f] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              ✉️
            </div>
            <h2 className="text-xl font-black text-[#f4d7aa] mb-2 tracking-wide">
              대기 중인 가입 신청이 없어요
            </h2>
            <p className="text-base text-[#d4a574] font-medium">
              새로운 가입 신청이 들어오면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((member) => (
              <div
                key={member.id}
                className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-5 border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.3)] relative overflow-hidden"
              >
                {/* 고대 문서 장식 */}
                <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
                
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-black text-[#f4d7aa] mb-1 tracking-wide">
                      {member.userName || "이름 없음"}
                    </h3>
                    <p className="text-sm text-[#d4a574] font-medium">{member.userEmail}</p>
                    {member.message && (
                      <div className="mt-3 p-3 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                        <p className="text-xs text-[#8b6f47] font-bold mb-1.5">✍️ 가입 동기 및 자기소개</p>
                        <p className="text-sm text-[#d4a574] font-medium whitespace-pre-line leading-relaxed">
                          {member.message}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-[#8b6f47] mt-2 font-medium">
                      신청일: {new Date(member.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>

                  <div className="flex gap-2 sm:flex-col sm:shrink-0">
                    <button
                      onClick={() => handleApprove(member.id)}
                      disabled={processing === member.id}
                      className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === member.id ? "처리 중..." : "✅ 승인"}
                    </button>
                    <button
                      onClick={() => handleReject(member.id)}
                      disabled={processing === member.id}
                      className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ❌ 거절
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

