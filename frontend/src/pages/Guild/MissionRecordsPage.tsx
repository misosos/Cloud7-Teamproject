// frontend/src/pages/Guild/MissionRecordsPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import GuildRecordDetailModal from "@/components/GuildRecordDetailModal";
import { resolveImageUrl } from "@/api/apiClient";

type MissionRecord = {
  id: string;
  guildId: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  title: string;
  desc: string | null;
  content: string | null;
  category: string | null;
  recordedAt: string | null;
  rating: number | null;
  mainImage: string | null;
  extraImages: string[];
  hashtags: string[];
  missionId: string | null; // 규칙: missionId가 null이면 개인 도감 기록, null이 아니면 연맹 미션 기록
  createdAt: string;
  updatedAt: string;
};

type MissionRecordsResponse = {
  ok: boolean;
  data: MissionRecord[];
  error?: string;
};

export default function MissionRecordsPage() {
  const { guildId = "", missionId = "" } = useParams<{
    guildId: string;
    missionId: string;
  }>();
  const navigate = useNavigate();

  const [records, setRecords] = useState<MissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!guildId || !missionId) return;

    async function loadRecords() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/guilds/${guildId}/missions/${missionId}/records`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error("미션 후기를 불러오는데 실패했습니다.");
        }

        const json = (await response.json()) as MissionRecordsResponse;

        if (!json.ok || !json.data) {
          throw new Error(json.error || "미션 후기를 불러오는데 실패했습니다.");
        }

        setRecords(json.data);
      } catch (err: any) {
        console.error("미션 후기 로드 실패", err);
        setError(err?.message || "미션 후기를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, [guildId, missionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <p className="text-sm text-stone-600">미션 후기를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-base text-red-400 font-bold">{error}</p>
          <button
            onClick={() => navigate(`/guild/${guildId}/room`)}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-sm font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
          >
            연맹 공간으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8f1]">
      <HeaderNav />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
        <header className="mb-8">
          <button
            onClick={() => navigate(`/guild/${guildId}/room`)}
            className="text-lg text-[#6b4e2f] hover:text-[#5a3e25] mb-4 inline-flex items-center gap-2 font-black tracking-wide"
          >
            <span className="text-lg">←</span>
            <span>연맹 공간으로 돌아가기</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-black text-[#5a3e25] mb-3 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
            📜 미션 후기 도감
          </h1>
          <p className="text-lg text-[#6b4e2f] font-medium">
            이 미션을 함께 수행한 연맹원들의 기록이에요. 총{" "}
            <span className="font-black text-[#5a3e25]">{records.length}</span> 개의
            후기가 남겨졌어요.
          </p>
        </header>

        {records.length === 0 ? (
          <section className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-8 text-center border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] relative overflow-hidden">
            {/* 금속 장식 테두리 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />

            <div className="w-16 h-16 mb-4 rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#6b4321] flex items-center justify-center text-3xl mx-auto border-2 border-[#6b4e2f] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              📖
            </div>
            <h2 className="text-xl font-black text-[#f4d7aa] mb-2 tracking-wide">
              아직 기록된 미션 후기가 없어요
            </h2>
            <p className="text-base text-[#d4a574] font-medium">
              첫 번째 탐험 기록을 남겨보세요. 연맹 도감에 멋진 페이지가 추가될 거예요.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map((record) => (
              <div
                key={record.id}
                onClick={() => {
                  setSelectedRecordId(record.id);
                  setShowDetailModal(true);
                }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] cursor-pointer hover:-translate-y-0.5 hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_12px_32px_rgba(201,169,97,0.3)] transition-transform text-[15px]"
              >
                {/* 고대 문서 장식 */}
                <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />

                {record.mainImage && (
                  <div className="w-full aspect-video overflow-hidden border-b-2 border-[#6b4e2f] bg-[#3a2818]">
                    <img
                      src={resolveImageUrl(record.mainImage) || ''}
                      alt={record.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <h3 className="font-black text-xl text-[#f4d7aa] leading-snug line-clamp-2 tracking-wide">
                    {record.title}
                  </h3>
                  {record.desc && (
                    <p className="text-base text-[#d4a574] line-clamp-2 font-medium">
                      {record.desc}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-[#8b6f47] mt-2">
                    <span className="font-bold truncate mr-2">
                      {record.userName || record.userEmail}
                    </span>
                    <span className="font-medium flex-shrink-0">
                      {new Date(record.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* 후기 상세 모달 */}
      {selectedRecordId && (
        <GuildRecordDetailModal
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRecordId(null);
          }}
          recordId={selectedRecordId}
          guildId={guildId}
        />
      )}
    </div>
  );
}

