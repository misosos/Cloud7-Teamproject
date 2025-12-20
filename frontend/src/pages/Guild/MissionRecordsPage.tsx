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
  missionId: string | null;
  createdAt: string;
  updatedAt: string;
};

type MissionRecordsResponse = {
  ok: boolean;
  data: MissionRecord[];
  error?: string;
};

const BG = "#F7F0E6";
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const BRAND3 = "#4A3420";
const DANGER = "#B42318";

const cardStyle: React.CSSProperties = {
  background: SURFACE,
  border: "1px solid rgba(201,169,97,0.22)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.10)",
  backdropFilter: "blur(10px)",
};

const innerStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.34)",
  border: "1px solid rgba(107,78,47,0.18)",
  boxShadow: "inset 0 2px 12px rgba(0,0,0,0.06)",
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
          { credentials: "include" },
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: BG, color: TEXT }}
      >
        <p className="text-sm font-medium" style={{ color: MUTED }}>
          미션 후기를 불러오는 중...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: BG, color: TEXT }}
      >
        <div className="text-center space-y-4">
          <p className="text-base font-black" style={{ color: DANGER }}>
            {error}
          </p>
          <button
            onClick={() => navigate(`/guild/${guildId}/room`)}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-black tracking-wide transition active:scale-[0.99]"
            style={{
              background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
              color: "white",
              border: "1px solid rgba(201,169,97,0.30)",
              boxShadow:
                "0 12px 28px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              <i className="fas fa-arrow-left" aria-hidden="true" />
              연맹 공간으로 돌아가기
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: TEXT }}>
      <HeaderNav />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
        <header className="mb-8">
          <button
            onClick={() => navigate(`/guild/${guildId}/room`)}
            className="mb-4 inline-flex items-center gap-2 font-black tracking-wide transition"
            style={{ color: MUTED }}
          >
            <i className="fas fa-arrow-left" aria-hidden="true" style={{ color: BRAND2 }} />
            <span className="text-base hover:opacity-90" style={{ color: MUTED }}>
              연맹 공간으로 돌아가기
            </span>
          </button>

          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight" style={{ color: TEXT }}>
            <span className="inline-flex items-center gap-3">
              <i className="fas fa-scroll" aria-hidden="true" style={{ color: BRAND }} />
              미션 후기 도감
            </span>
          </h1>

          <p className="text-base font-medium" style={{ color: MUTED }}>
            이 미션을 함께 수행한 연맹원들의 기록이에요. 총{" "}
            <span className="font-black" style={{ color: TEXT }}>
              {records.length}
            </span>
            개의 후기가 남겨졌어요.
          </p>
        </header>

        {records.length === 0 ? (
          <section className="rounded-2xl p-8 text-center" style={cardStyle}>
            <div
              className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center mx-auto"
              style={{
                background: "rgba(255,255,255,0.34)",
                border: "1px solid rgba(201,169,97,0.22)",
                boxShadow: "0 14px 40px rgba(0,0,0,0.10)",
              }}
            >
              <i className="fas fa-book-open text-2xl" aria-hidden="true" style={{ color: BRAND3 }} />
            </div>

            <h2 className="text-xl font-black mb-2 tracking-tight" style={{ color: TEXT }}>
              아직 기록된 미션 후기가 없어요
            </h2>
            <p className="text-base font-medium" style={{ color: MUTED }}>
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
                className="group relative overflow-hidden rounded-2xl cursor-pointer transition-transform hover:-translate-y-0.5"
                style={{
                  ...cardStyle,
                  boxShadow: "0 18px 60px rgba(0,0,0,0.10)",
                }}
              >
                {record.mainImage && (
                  <div
                    className="w-full aspect-video overflow-hidden"
                    style={{
                      borderBottom: "1px solid rgba(201,169,97,0.20)",
                      background: "rgba(74,52,32,0.10)",
                    }}
                  >
                    <img
                      src={resolveImageUrl(record.mainImage) || ""}
                      alt={record.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                )}

                <div className="p-4 space-y-2" style={innerStyle}>
                  <h3 className="font-black text-xl leading-snug line-clamp-2 tracking-tight" style={{ color: TEXT }}>
                    {record.title}
                  </h3>

                  {record.desc && (
                    <p className="text-base line-clamp-2 font-medium" style={{ color: MUTED }}>
                      {record.desc}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm mt-2" style={{ color: MUTED }}>
                    <span className="font-bold truncate mr-2 inline-flex items-center gap-2">
                      <i className="fas fa-user" aria-hidden="true" style={{ color: BRAND2 }} />
                      {record.userName || record.userEmail}
                    </span>
                    <span className="font-medium flex-shrink-0 inline-flex items-center gap-2">
                      <i className="fas fa-calendar" aria-hidden="true" style={{ color: BRAND2 }} />
                      {new Date(record.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>

                {/* subtle highlight */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition"
                  style={{
                    boxShadow: "inset 0 0 0 1px rgba(201,169,97,0.22)",
                  }}
                />
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