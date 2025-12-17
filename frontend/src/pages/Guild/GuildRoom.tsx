// frontend/src/pages/Guild/GuildRoom.tsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import HeaderNav from "@/components/HeaderNav";
import Achievement from "@/components/Achievement";
import BookCard from "@/components/BookCard";
import GuildRecordModal from "@/components/GuildRecordModal";
import GuildRecordDetailModal from "@/components/GuildRecordDetailModal";
import GuildMissionModal from "@/components/GuildMissionModal";
import toast from "react-hot-toast";
import {
  fetchGuildDetail,
  type GuildDetailData,
} from "@/services/guildApi";
import { useAuthUser } from "@/store/authStore";
import { updateGuild } from "@/services/guildService";
import folderImage from "@/assets/ui/folder.png";
import { resolveImageUrl } from "@/api/apiClient";

const GuildRoom: React.FC = () => {
  
  const { guildId = "" } = useParams<{ guildId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthUser();

  const [data, setData] = useState<GuildDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rightTab, setRightTab] = useState<"dex" | "ranking">("dex");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showRecordDetailModal, setShowRecordDetailModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [guildRecords, setGuildRecords] = useState<any[]>([]);
  const [guildMissions, setGuildMissions] = useState<any[]>([]); // 진행 중인 미션
  const [completedMissions, setCompletedMissions] = useState<any[]>([]); // 완료된 미션
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1); // 페이지네이션: 현재 페이지 (도감 기록용)
  const [explorersPage, setExplorersPage] = useState(1); // 페이지네이션: 연맹 탐험가용 현재 페이지
  const [deletingMissionIds, setDeletingMissionIds] = useState<Set<string>>(new Set()); // 삭제 중인 미션 ID들

  // 길드 상세 목API 호출 및 도감 기록 로드
  useEffect(() => {
    if (!guildId) return;

    async function load() {
      setLoading(true);
      setNotFound(false);

      const res = await fetchGuildDetail(guildId);
      if (!res) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setData(res);
      
      // 도감 기록 가져오기
      try {
        const recordsResponse = await fetch(`/api/guilds/${guildId}/records`, {
          credentials: "include",
        });
        if (recordsResponse.ok) {
          const recordsJson = await recordsResponse.json();
          if (recordsJson.ok && recordsJson.data) {
            setGuildRecords(recordsJson.data);
          }
        }
      } catch (err) {
        console.error("도감 기록 로드 실패:", err);
      }

      // 미션 목록 가져오기 (진행 중인 미션만)
      try {
        const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
          credentials: "include",
        });
        if (missionsResponse.ok) {
          const missionsJson = await missionsResponse.json();
          if (missionsJson.ok && missionsJson.data) {
            setGuildMissions(missionsJson.data);
          }
        }
      } catch (err) {
        console.error("미션 목록 로드 실패:", err);
      }

      // 완료된 미션 목록 가져오기
      try {
        const completedMissionsResponse = await fetch(`/api/guilds/${guildId}/missions/completed`, {
          credentials: "include",
        });
        if (completedMissionsResponse.ok) {
          const completedMissionsJson = await completedMissionsResponse.json();
          if (completedMissionsJson.ok && completedMissionsJson.data) {
            setCompletedMissions(completedMissionsJson.data);
          }
        } else {
          console.error("완료된 미션 목록 응답 오류:", completedMissionsResponse.status);
        }
      } catch (err) {
        console.error("완료된 미션 목록 로드 실패:", err);
      }

      setLoading(false);
    }

    load();
  }, [guildId]);

  // URL 파라미터에서 recordId 확인하여 모달 열기
  useEffect(() => {
    // 로딩 중이면 기다림
    if (loading) return;
    
    const recordId = searchParams.get("recordId");
    if (recordId && recordId !== selectedRecordId) {
      // recordId가 있고, 현재 선택된 recordId와 다르면 모달 열기
      setSelectedRecordId(recordId);
      setShowRecordDetailModal(true);
      // URL에서 파라미터 제거 (히스토리에 남기지 않음)
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("recordId");
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [location.search, loading, selectedRecordId, setSearchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <p className="text-sm text-stone-600">연맹 공간을 여는 중이에요…</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#fdf8f1] flex items-center justify-center">
        <p className="text-sm text-stone-600">
          존재하지 않는 연맹이거나, 아직 준비 중인 연맹이에요.
        </p>
      </div>
    );
  }

  const { guild, explorers, guildDex, inProgressBooks, completedBooks, ranking } =
    data;

  // 내 랭킹이 있는지 확인
  const hasMyRank = ranking.myRank && ranking.myRank.rank > 0;

  // 연맹장인지 확인
  const isOwner = Boolean(
    guild &&
      user &&
      guild.ownerId !== undefined &&
      user.id !== undefined &&
      Number(guild.ownerId) === Number(user.id)
  );

  // -----------------------------
  // 연맹 도감 통계 (실제 기록 기반)
  // -----------------------------
  // 규칙: missionId가 null/undefined 인 기록만 "개인/연맹 도감"으로 취급
  const personalRecords = guildRecords.filter(
    (r) => r.missionId === null || r.missionId === undefined,
  );

  const now = new Date();
  const totalDexCount = personalRecords.length;
  const thisMonthDexCount = personalRecords.filter((r) => {
    if (!r.createdAt) return false;
    const d = new Date(r.createdAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  }).length;
  // 진행 중 도감: 진행 중인 개인 도감(inProgressBooks) + 진행 중인 연맹 미션 수
  const ongoingDexCount = (inProgressBooks?.length || 0) + guildMissions.length;
  // 달성 완료 도감: 완료된 개인 도감(completedBooks) + 완료된 연맹 미션 수
  const completedDexCount =
    (completedBooks?.length || 0) + completedMissions.length;

  // 데이터 리로드 함수
  const reloadData = async () => {
    if (!guildId) return;
    setLoading(true);
    setNotFound(false);

    const res = await fetchGuildDetail(guildId);
    if (!res) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setData(res);
    setLoading(false);
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!guild || !isOwner || !guildId) return;

    const file = event.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith("image/")) {
      setImageError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 제한 (예: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    try {
      // 1. 이미지 업로드
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/uploads/guilds", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(errorText || "이미지 업로드에 실패했습니다.");
      }

      const uploadJson = await uploadResponse.json();
      const uploadedUrl = uploadJson.url;

      if (!uploadJson.ok || !uploadedUrl) {
        throw new Error(uploadJson.error || "이미지 업로드에 실패했습니다.");
      }

      // 2. 연맹 정보 업데이트
      await updateGuild(guildId, { emblemUrl: uploadedUrl });

      // 3. 데이터 리로드
      await reloadData();
      toast.success("연맹 이미지가 업데이트되었습니다.");
    } catch (err: any) {
      console.error(err);
      setImageError(
        err?.message || "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setUploadingImage(false);
      // input 초기화
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f1]">
      <HeaderNav />

      
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-6 py-10 flex items-start gap-8">
        
        <aside className="w-64 bg-gradient-to-b from-[#6b4e2f] to-[#5a3e25] rounded-lg px-4 pt-6 pb-8 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#8b6f47] sticky top-24 self-start relative overflow-hidden">
          {/* 금속 장식 테두리 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
          
          <div className="flex flex-col items-stretch gap-5">
           
            <div className="relative w-40 h-40 mx-auto flex-shrink-0 group">
              {/* 나무 프레임 효과 */}
              <div className="absolute inset-0 rounded-lg border-4 border-[#5a3e25] shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_0_30px_rgba(139,90,43,0.4)] pointer-events-none z-10" style={{
                background: 'linear-gradient(135deg, rgba(139,90,43,0.3) 0%, rgba(90,62,37,0.5) 50%, rgba(139,90,43,0.3) 100%)',
                clipPath: 'polygon(8px 0, 100% 0, 100% 8px, 100% 100%, 0 100%, 0 8px)'
              }} />
              <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#5a3315] flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1)] overflow-hidden transition-all duration-300 group-hover:shadow-[0_16px_50px_rgba(201,169,97,0.5),inset_0_2px_4px_rgba(255,255,255,0.15)] group-hover:scale-105 border-2 border-[#6b4e2f]">
                {guild.emblemUrl ? (
                  <img
                    src={resolveImageUrl(guild.emblemUrl) || ''}
                    alt={`${guild.name} 연맹 이미지`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <span className="text-4xl text-[#f4d7aa] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-110">🛡️</span>
                )}
              </div>
              {isOwner && (
                <label className="absolute inset-0 cursor-pointer rounded-lg bg-black/0 hover:bg-black/20 transition flex items-center justify-center group z-20">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-black bg-black/70 px-3 py-1.5 rounded border border-[#c9a961] shadow-lg transition tracking-wide">
                    {uploadingImage ? "업로드 중..." : "⚔️ 이미지 변경"}
                  </span>
                </label>
              )}
              {imageError && (
                <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-400 text-center font-bold">
                  {imageError}
                </p>
              )}
            </div>

            
            <section className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg px-5 py-6 text-center flex flex-col justify-center gap-3 border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.3)] relative">
              {/* 고대 문서 장식 */}
              <div className="absolute top-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              
              <h2 className="text-xl font-black text-[#f4d7aa] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {guild.name}
              </h2>
              <p className="text-base leading-relaxed text-[#d4a574] whitespace-pre-line font-medium">
                {guild.description}
              </p>
            </section>

            
            <div className="flex gap-3 mt-1 justify-center">
              <button
                onClick={() => setShowRecordModal(true)}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-sm font-black tracking-wide hover:from-[#9b7f57] hover:to-[#7b5e3f] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
              >
                📜 도감 추가
              </button>
              <button
                onClick={() => setShowMissionModal(true)}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] text-sm font-black tracking-wide hover:from-[#5a4430] hover:to-[#4a3828] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
              >
                ⚔️ 연맹 미션 추가
              </button>
            </div>
          </div>
        </aside>

       
        <section className="flex-1 flex flex-col gap-8">
          
          <header>
            <h1 className="text-4xl font-black mb-6 text-[#5a3e25] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">⚔️ 탐험가 연맹</h1>

            <div className="flex gap-6">
              
              <div className="relative w-64 h-40 flex-shrink-0 group">
                {/* 나무 프레임 */}
                <div className="absolute inset-0 rounded-lg border-4 border-[#5a3e25] shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_0_30px_rgba(139,90,43,0.4)] pointer-events-none z-10" style={{
                  background: 'linear-gradient(135deg, rgba(139,90,43,0.3) 0%, rgba(90,62,37,0.5) 50%, rgba(139,90,43,0.3) 100%)',
                  clipPath: 'polygon(12px 0, 100% 0, 100% 12px, 100% 100%, 0 100%, 0 12px)'
                }} />
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#5a3315] border-2 border-[#6b4e2f] shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1)] overflow-hidden transition-all duration-300 group-hover:shadow-[0_16px_50px_rgba(201,169,97,0.5),inset_0_2px_4px_rgba(255,255,255,0.15)] group-hover:scale-[1.02]">
                  {guild.emblemUrl ? (
                    <img
                      src={resolveImageUrl(guild.emblemUrl) || ''}
                      alt={`${guild.name} 연맹 엠블럼`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#d4a574] transition-transform duration-300 group-hover:scale-110">
                      <span className="text-4xl mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">🖼️</span>
                      <span className="text-sm font-black tracking-wide">연맹 소개 사진</span>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <label className="absolute inset-0 cursor-pointer rounded-lg bg-black/0 hover:bg-black/20 transition flex items-center justify-center group z-20">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-black bg-black/70 px-3 py-1.5 rounded border border-[#c9a961] shadow-lg transition tracking-wide">
                      {uploadingImage ? "업로드 중..." : "📷 사진 변경"}
                    </span>
                  </label>
                )}
                {imageError && (
                  <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-400 text-center font-bold">
                    {imageError}
                  </p>
                )}
              </div>

             
              <div className="flex-1">
                <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-5 relative">
                  {/* 고대 문서 장식 */}
                  <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">📜</span>
                    <h2 className="text-xl font-black text-[#f4d7aa] tracking-wide">연맹 소개</h2>
                  </div>
                  <p className="text-base leading-relaxed whitespace-pre-line text-[#d4a574] font-medium">
                    {guild.intro}
                  </p>
                </div>
              </div>
            </div>
          </header>

         
          <section className="grid grid-cols-[2fr,1fr] gap-6">
            <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-5 border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] relative">
              {/* 고대 문서 장식 */}
              <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
              <h2 className="text-xl font-black mb-3 text-[#f4d7aa] tracking-wide">⚖️ 연맹 규칙</h2>
              <p className="whitespace-pre-line text-base leading-relaxed text-[#d4a574] font-medium">
                {guild.rules}
              </p>
            </div>

            <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-5 text-base space-y-2 border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)]">
              <p className="text-[#d4a574] font-bold">
                📊 총 연맹 도감 수{" "}
                <span className="text-[#f4d7aa]">{totalDexCount}</span>개
              </p>
              <p className="text-[#d4a574] font-bold">
                📅 이달의 도감{" "}
                <span className="text-[#f4d7aa]">{thisMonthDexCount}</span>개
              </p>
              <p className="text-[#d4a574] font-bold">
                🔄 진행 중 도감{" "}
                <span className="text-[#f4d7aa]">{ongoingDexCount}</span>개
              </p>
              <p className="text-[#d4a574] font-bold">
                ✅ 달성 완료 도감{" "}
                <span className="text-[#f4d7aa]">{completedDexCount}</span>개
              </p>
            </div>
          </section>

          
          <section>
            <h2 className="text-xl font-black mb-3 pb-2 text-[#5a3e25] tracking-wide border-b-2 border-[#6b4e2f]">
              🗺️ 연맹 탐험가 {explorers.length > 0 && `(${explorers.length}명)`}
            </h2>
            {(() => {
              const itemsPerPage = 4;
              const totalPages = Math.ceil(explorers.length / itemsPerPage);
              const startIndex = (explorersPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const currentExplorers = explorers.slice(startIndex, endIndex);
              const showPagination = explorers.length > itemsPerPage;

              return (
                <>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {currentExplorers.map((m) => (
                      <div
                        key={m.id}
                        className="min-w-[220px] bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-4 border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.3)]"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8b6f47] to-[#6b4e2f] text-base flex items-center justify-center text-white font-black shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30">
                            {m.name[0]}
                          </div>
                          <span className="text-base font-black text-[#f4d7aa] tracking-wide">{m.name}</span>
                        </div>
                        <p className="text-sm text-[#d4a574] font-medium">{m.intro}</p>
                      </div>
                    ))}
                  </div>

                  {/* 페이지네이션 컨트롤 (4명 이상일 때만 표시) */}
                  {showPagination && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {/* 이전 버튼 */}
                      <button
                        type="button"
                        onClick={() => setExplorersPage((prev) => Math.max(1, prev - 1))}
                        disabled={explorersPage === 1}
                        className="px-4 py-2 bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white rounded-lg hover:from-[#9b7f57] hover:to-[#7b5e3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                      >
                        이전
                      </button>

                      {/* 페이지 번호 */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setExplorersPage(page)}
                            className={`w-10 h-10 rounded-lg font-medium transition-all ${
                              explorersPage === page
                                ? "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white shadow-md scale-105"
                                : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      {/* 다음 버튼 */}
                      <button
                        type="button"
                        onClick={() =>
                          setExplorersPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        disabled={explorersPage === totalPages}
                        className="px-4 py-2 bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white rounded-lg hover:from-[#9b7f57] hover:to-[#7b5e3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                      >
                        다음
                      </button>
                    </div>
                  )}

                  {/* 페이지 정보 */}
                  {showPagination && (
                    <div className="mt-2 text-center text-sm text-stone-600">
                      {startIndex + 1} - {Math.min(endIndex, explorers.length)} / {explorers.length}명
                    </div>
                  )}
                </>
              );
            })()}
          </section>

         
          <section className="mt-4 space-y-8">
            <h2 className="text-xl font-black mb-2 pb-2 text-[#5a3e25] tracking-wide border-b-2 border-[#6b4e2f]">
              📚 기록
            </h2>

         
            {/* 진행중인 미션 섹션 */}
          {guildMissions.length > 0 && (
            <div>
              <h3 className="text-lg font-black mb-3 text-[#6b4e2f] tracking-wide">🔄 진행중인 미션</h3>
              <div className="relative pb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                  {/* 진행 중인 미션 폴더 */}
                  {guildMissions.map((mission) => {
                    // 백엔드에서 계산된 participantCount 사용 (실시간 반영)
                    const recordCount = mission.participantCount || 0;
                    
                    return (
                      <div
                        key={mission.id}
                        onClick={() => navigate(`/guild/${guildId}/missions/${mission.id}/records`)}
                        className="cursor-pointer transform transition-transform hover:scale-105"
                      >
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg border-2 border-[#6b4e2f] bg-gradient-to-br from-[#8b5a2b] to-[#5a3315]">
                          <img
                            src={folderImage}
                            alt={mission.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <p className="text-white font-bold text-sm truncate">
                              {mission.title}
                            </p>
                            <p className="text-white/80 text-xs truncate">
                              미션 후기 {recordCount}/{mission.limitCount}개
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* 기존 진행중인 도감 */}
                  {inProgressBooks.map((item) => (
                    <BookCard key={item.id} item={item} />
                  ))}
                </div>
             
                <div className="mt-4 h-2 bg-gradient-to-r from-[#6b4e2f] via-[#8b6f47] to-[#6b4e2f] rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-[#c9a961]/30" />
              </div>
            </div>
          )}

          {/* 완료된 연맹 미션 섹션 */}
          <div>
            <h3 className="text-lg font-black mb-3 text-[#6b4e2f] tracking-wide">📚 연맹 미션</h3>
            <div className="relative pb-8">
              {completedMissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                  {/* 완료된 미션 폴더 */}
                  {completedMissions.map((mission) => {
                    // 백엔드에서 계산된 participantCount 사용 (실시간 반영)
                    const recordCount = mission.participantCount || 0;
                    
                    return (
                      <div
                        key={mission.id}
                        onClick={() => navigate(`/guild/${guildId}/missions/${mission.id}/records`)}
                        className="cursor-pointer transform transition-transform hover:scale-105"
                      >
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg border-2 border-[#6b4e2f] bg-gradient-to-br from-[#8b5a2b] to-[#5a3315]">
                          <img
                            src={folderImage}
                            alt={mission.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <p className="text-white font-bold text-sm truncate">
                              {mission.title}
                            </p>
                            <p className="text-white/80 text-xs truncate">
                              미션 후기 {recordCount}/{mission.limitCount}개
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500">
                  <p>완료된 연맹 미션이 없습니다.</p>
                </div>
              )}
           
              <div className="mt-4 h-2 bg-gradient-to-r from-[#6b4e2f] via-[#8b6f47] to-[#6b4e2f] rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-[#c9a961]/30" />
            </div>
          </div>

           
            <div>
              <h3 className="text-lg font-black mb-3 text-[#6b4e2f] tracking-wide">
                ✅ 개인 도감 기록 {(() => {
                  // 규칙: missionId가 null이거나 undefined인 기록만 개인 도감 기록으로 표시
                  // missionId가 있는 기록(연맹 미션 후기)은 절대 개인 도감 기록 섹션에 나타나면 안 됨
                  const personalRecords = guildRecords.filter((r) => r.missionId === null || r.missionId === undefined);
                  return personalRecords.length > 0 ? `(${personalRecords.length}개)` : "";
                })()}
              </h3>
              <div className="relative pb-8">
                {/* 페이지네이션: 8개 이상일 때만 적용 */}
                {(() => {
                  // 규칙: missionId가 null이거나 undefined인 기록만 개인 도감 기록으로 표시
                  // missionId가 있는 기록(연맹 미션 후기)은 절대 개인 도감 기록 섹션에 나타나면 안 됨
                  const personalRecords = guildRecords.filter((r) => r.missionId === null || r.missionId === undefined);
                  const itemsPerPage = 8;
                  const totalPages = Math.ceil(personalRecords.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const currentRecords = personalRecords.slice(startIndex, endIndex);
                  const showPagination = personalRecords.length > itemsPerPage;

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                        {currentRecords.map((record) => (
                          <div
                            key={record.id}
                            onClick={() => {
                              setSelectedRecordId(record.id);
                              setShowRecordDetailModal(true);
                            }}
                            className="cursor-pointer transform transition-transform hover:scale-105"
                          >
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg border-2 border-[#6b4e2f] bg-gradient-to-br from-[#8b5a2b] to-[#5a3315]">
                              <img
                                src={folderImage}
                                alt={record.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                <p className="text-white font-bold text-sm truncate">
                                  {record.title}
                                </p>
                                <p className="text-white/80 text-xs truncate">
                                  {record.userName || record.userEmail}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 페이지네이션 컨트롤 (8개 이상일 때만 표시) */}
                      {showPagination && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                          {/* 이전 버튼 */}
                          <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white rounded-lg hover:from-[#9b7f57] hover:to-[#7b5e3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                          >
                            이전
                          </button>

                          {/* 페이지 번호 */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                  currentPage === page
                                    ? "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white shadow-md scale-105"
                                    : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          {/* 다음 버튼 */}
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                            }
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white rounded-lg hover:from-[#9b7f57] hover:to-[#7b5e3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                          >
                            다음
                          </button>
                        </div>
                      )}

                      {/* 페이지 정보 */}
                      {showPagination && (
                        <div className="mt-3 text-center text-sm text-stone-600">
                          {startIndex + 1} - {Math.min(endIndex, personalRecords.length)} /{" "}
                          {personalRecords.length}개
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="mt-4 h-2 bg-gradient-to-r from-[#6b4e2f] via-[#8b6f47] to-[#6b4e2f] rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-[#c9a961]/30" />
              </div>
            </div>
          </section>
        </section>

        
        <aside className="w-72 max-w-xs bg-gradient-to-b from-[#6b4e2f] to-[#5a3e25] rounded-lg p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#8b6f47] sticky top-24 self-start relative overflow-hidden">
          {/* 금속 장식 테두리 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
          
          <div className="flex flex-col gap-4">
           
            <div className="flex text-base font-black mb-2 border-b-2 border-[#6b4e2f]">
              <button
                onClick={() => setRightTab("dex")}
                className={`flex-1 py-2 text-center transition-all ${
                  rightTab === "dex"
                    ? "text-[#f4d7aa] border-b-2 border-[#c9a961] shadow-[0_2px_4px_rgba(201,169,97,0.3)]"
                    : "text-[#8b6f47] hover:text-[#d4a574]"
                }`}
              >
                📜 연맹도감
              </button>
              <button
                onClick={() => setRightTab("ranking")}
                className={`flex-1 py-2 text-center transition-all ${
                  rightTab === "ranking"
                    ? "text-[#f4d7aa] border-b-2 border-[#c9a961] shadow-[0_2px_4px_rgba(201,169,97,0.3)]"
                    : "text-[#8b6f47] hover:text-[#d4a574]"
                }`}
              >
                🏆 랭킹
              </button>
            </div>

            {/* 탭 내용 */}
            {rightTab === "dex" ? (
              <div className="flex flex-col gap-3">
                {/* 미션 목록 */}
                {guildMissions.map((mission) => {
                  const isDeleting = deletingMissionIds.has(mission.id);
                  
                  const handleDeleteMission = async (e: React.MouseEvent) => {
                    e.stopPropagation(); // 클릭 이벤트 전파 방지
                    if (!window.confirm(`"${mission.title}" 미션을 삭제하시겠습니까?`)) return;
                    
                    setDeletingMissionIds((prev) => new Set(prev).add(mission.id));
                    try {
                      const response = await fetch(`/api/guilds/${guildId}/missions/${mission.id}`, {
                        method: "DELETE",
                        credentials: "include",
                      });

                      if (!response.ok) {
                        const errorText = await response.text();
                        let errorMessage = "미션 삭제에 실패했습니다.";
                        try {
                          const errorJson = JSON.parse(errorText);
                          errorMessage = errorJson.message || errorMessage;
                        } catch {
                          errorMessage = errorText || errorMessage;
                        }
                        throw new Error(errorMessage);
                      }

                      const json = await response.json();
                      if (!json.ok) {
                        throw new Error(json.message || "미션 삭제에 실패했습니다.");
                      }

                      toast.success("미션이 삭제되었습니다.");
                      // 미션 목록 다시 로드
                      const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
                        credentials: "include",
                      });
                      if (missionsResponse.ok) {
                        const missionsJson = await missionsResponse.json();
                        if (missionsJson.ok && missionsJson.data) {
                          setGuildMissions(missionsJson.data);
                        }
                      }
                    } catch (err: any) {
                      console.error("미션 삭제 실패", err);
                      toast.error(err?.message || "미션 삭제에 실패했습니다.");
                    } finally {
                      setDeletingMissionIds((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(mission.id);
                        return newSet;
                      });
                    }
                  };

                  return (
                    <div
                      key={mission.id}
                      className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-3 border border-[#6b4e2f] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                    >
                      <div 
                        onClick={() => {
                          setSelectedMissionId(mission.id);
                          setShowRecordModal(true);
                        }}
                        className="cursor-pointer hover:from-[#6b4e3f] hover:to-[#5a4e30] transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-[#f4d7aa] tracking-wide">
                            {mission.title}
                          </span>
                          {/* 삭제 버튼 (연맹장만 표시) */}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={handleDeleteMission}
                              disabled={isDeleting}
                              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
                              title="미션 삭제"
                            >
                              {isDeleting ? "삭제 중..." : "✕"}
                            </button>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-[#d4a574]">
                          현재 참여 인원: {mission.participantCount}/{mission.limitCount}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* 연맹 도감 목록 */}
                {guildDex.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg p-2 flex items-center border border-[#6b4e2f] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                  >
                    <Achievement item={item} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] rounded-lg px-4 py-5 space-y-5 border border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] relative">
                {/* 고대 문서 장식 */}
                <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#c9a961]/40 to-transparent" />
                
                <div>
                  <p className="text-lg text-[#f4d7aa] mb-1 font-black tracking-wide">⚔️ 내 랭킹</p>
                  {hasMyRank ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black text-[#c9a961] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {ranking.myRank.rank}위
                      </span>
                      <span className="text-base text-[#d4a574] font-bold">
                        점수 {ranking.myRank.score}
                      </span>
                    </div>
                  ) : (
                    <p className="text-base text-[#d4a574] font-medium">
                      아직 랭킹에 오르지 않았어요.
                      <br />
                      연맹 활동을 꾸준히 하면 순위가 매겨질 거예요!
                    </p>
                  )}
                </div>

               
                <div>
                  <p className="text-lg text-[#f4d7aa] mb-2 font-black tracking-wide">🏅 상위 랭킹</p>
                  {ranking.top4.length > 0 ? (
                    <ul className="space-y-2">
                      {ranking.top4.map((r) => (
                        <li
                          key={r.rank}
                          className="flex items-center justify-between bg-gradient-to-r from-[#4a3420] to-[#3a2818] rounded-full px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border border-[#6b4e2f]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b6f47] to-[#6b4e2f] text-sm font-black text-[#f4d7aa] flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.5)] border border-[#c9a961]/30">
                              {r.rank}
                            </span>
                            <span className="text-base font-bold text-[#d4a574] whitespace-normal tracking-wide">
                              {r.name}
                            </span>
                          </div>
                          {r.score > 0 && (
                            <span className="ml-3 text-base text-[#c9a961] shrink-0 font-bold">
                              {r.score}점
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-base text-[#8b6f47] font-medium">
                      아직 랭킹 데이터가 없어요.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* 미션 추가 모달 */}
      <GuildMissionModal
        open={showMissionModal}
        onClose={() => setShowMissionModal(false)}
        guildId={guildId}
        onSaveSuccess={async () => {
          // 미션 목록 다시 로드 (미션 생성 후 진행 중인 미션 목록 갱신)
          try {
            // 진행 중인 미션 목록
            const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
              credentials: "include",
            });
            if (missionsResponse.ok) {
              const missionsJson = await missionsResponse.json();
              if (missionsJson.ok && missionsJson.data) {
                setGuildMissions(missionsJson.data);
              }
            }
            
            // 완료된 미션 목록도 함께 갱신
            const completedMissionsResponse = await fetch(`/api/guilds/${guildId}/missions/completed`, {
              credentials: "include",
            });
            if (completedMissionsResponse.ok) {
              const completedMissionsJson = await completedMissionsResponse.json();
              if (completedMissionsJson.ok && completedMissionsJson.data) {
                setCompletedMissions(completedMissionsJson.data);
              }
            }
          } catch (err) {
            console.error("미션 목록 로드 실패:", err);
          }
        }}
      />

      {/* 도감 추가 모달 (일반 도감 또는 미션 도감) */}
      <GuildRecordModal
        open={showRecordModal}
        onClose={() => {
          setShowRecordModal(false);
          setSelectedMissionId(null);
        }}
        guildId={guildId}
        missionId={selectedMissionId || undefined}
        onSaveSuccess={async () => {
          // 도감 기록 다시 로드
          try {
            const recordsResponse = await fetch(`/api/guilds/${guildId}/records`, {
              credentials: "include",
            });
            if (recordsResponse.ok) {
              const recordsJson = await recordsResponse.json();
              if (recordsJson.ok && recordsJson.data) {
                setGuildRecords(recordsJson.data);
                setCurrentPage(1);
              }
            }
          } catch (err) {
            console.error("도감 기록 로드 실패:", err);
          }
          // 미션 목록 다시 로드 (참여 인원 수 업데이트)
          // 규칙: 미션 인원이 가득 차면 다음 렌더링부터 guildMissions에서 사라지고 completedMissions에만 나타남
          // 백엔드가 participantCount >= limitCount인 미션을 자동으로 필터링함
          try {
            // 진행 중인 미션 목록 (participantCount < limitCount)
            const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
              credentials: "include",
            });
            if (missionsResponse.ok) {
              const missionsJson = await missionsResponse.json();
              if (missionsJson.ok && missionsJson.data) {
                setGuildMissions(missionsJson.data);
              }
            }
            
            // 완료된 미션 목록 (participantCount >= limitCount)
            const completedMissionsResponse = await fetch(`/api/guilds/${guildId}/missions/completed`, {
              credentials: "include",
            });
            if (completedMissionsResponse.ok) {
              const completedMissionsJson = await completedMissionsResponse.json();
              if (completedMissionsJson.ok && completedMissionsJson.data) {
                setCompletedMissions(completedMissionsJson.data);
              }
            }
          } catch (err) {
            console.error("미션 목록 로드 실패:", err);
          }
          // 랭킹도 다시 로드
          await reloadData();
          if (selectedMissionId) {
            toast.success("미션 후기가 작성되었습니다! 20점을 획득했습니다.");
          } else {
            toast.success("도감이 추가되었습니다! 10점을 획득했습니다.");
          }
          setSelectedMissionId(null);
        }}
      />

      {/* 도감 상세 보기 모달 */}
      {selectedRecordId && (
        <GuildRecordDetailModal
          open={showRecordDetailModal}
          onClose={() => {
            setShowRecordDetailModal(false);
            setSelectedRecordId(null);
            // URL에서도 recordId 제거
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete("recordId");
            setSearchParams(newSearchParams, { replace: true });
          }}
          recordId={selectedRecordId}
          guildId={guildId}
          onDeleteSuccess={async () => {
            // 도감 기록 삭제 후 데이터 갱신
            await reloadData();
            // 미션 목록도 갱신 (미션 후기 삭제 시 participantCount 업데이트)
            try {
              const missionsResponse = await fetch(`/api/guilds/${guildId}/missions`, {
                credentials: "include",
              });
              if (missionsResponse.ok) {
                const missionsJson = await missionsResponse.json();
                if (missionsJson.ok && missionsJson.data) {
                  setGuildMissions(missionsJson.data);
                }
              }
              
              const completedMissionsResponse = await fetch(`/api/guilds/${guildId}/missions/completed`, {
                credentials: "include",
              });
              if (completedMissionsResponse.ok) {
                const completedMissionsJson = await completedMissionsResponse.json();
                if (completedMissionsJson.ok && completedMissionsJson.data) {
                  setCompletedMissions(completedMissionsJson.data);
                }
              }
            } catch (err) {
              console.error("미션 목록 로드 실패:", err);
            }
          }}
        />
      )}
    </div>
  );
};

export default GuildRoom;
