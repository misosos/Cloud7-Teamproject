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
      console.error(err);
      alert(
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
      console.error(err);
      alert(err?.data?.message || err?.message || "가입 신청 거절에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f1]">
        <HeaderNav />
        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
          <p className="text-sm text-stone-600">가입 신청 목록을 불러오는 중...</p>
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
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => navigate("/guild")}
              className="text-sm text-[#b8834a] hover:underline"
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
            className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-flex items-center gap-1"
          >
            ← 연맹 홈으로
          </button>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            가입 신청 관리
          </h1>
          <p className="text-sm text-stone-600">
            연맹에 가입을 신청한 사람들의 목록이에요. 승인 또는 거절할 수 있어요.
          </p>
        </header>

        {pending.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-[#f7ebdd] flex items-center justify-center text-3xl mx-auto">
              ✉️
            </div>
            <h2 className="text-lg font-semibold text-stone-900 mb-2">
              대기 중인 가입 신청이 없어요
            </h2>
            <p className="text-sm text-stone-600">
              새로운 가입 신청이 들어오면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-stone-200 flex items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-900 mb-1">
                    {member.userName || "이름 없음"}
                  </h3>
                  <p className="text-sm text-stone-600">{member.userEmail}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    신청일: {new Date(member.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(member.id)}
                    disabled={processing === member.id}
                    className="px-4 py-2 rounded-lg bg-[#b8834a] text-white text-sm font-semibold hover:bg-[#a8733a] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === member.id ? "처리 중..." : "승인"}
                  </button>
                  <button
                    onClick={() => handleReject(member.id)}
                    disabled={processing === member.id}
                    className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    거절
                  </button>
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

