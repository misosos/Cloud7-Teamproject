// frontend/src/components/GuildRecordDetailModal.tsx
import { useEffect, useState, useMemo } from "react";
import { useAuthUser } from "@/store/authStore";
import toast from "react-hot-toast";
import { resolveImageUrl } from "@/api/apiClient";

interface GuildRecordDetailModalProps {
  open: boolean;
  onClose: () => void;
  recordId: string;
  guildId: string;
  onDeleteSuccess?: () => void; // 삭제 성공 시 콜백
}

type GuildRecordDetail = {
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
  kakaoPlaceId: string | null; // 추천 장소 달성 기록인 경우 카카오 장소 ID
  createdAt: string;
  updatedAt: string;
};

type GuildRecordDetailResponse = {
  ok: boolean;
  data: GuildRecordDetail;
  error?: string;
};

type GuildRecordComment = {
  id: string;
  recordId: string;
  userId: number;
  userName: string | null;
  userEmail: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  replies?: GuildRecordComment[];
};

type GuildRecordCommentsResponse = {
  ok: boolean;
  data: GuildRecordComment[];
  error?: string;
};

type CreateCommentResponse = {
  ok: boolean;
  data: GuildRecordComment;
  error?: string;
};

export default function GuildRecordDetailModal({
  open,
  onClose,
  recordId,
  guildId,
  onDeleteSuccess,
}: GuildRecordDetailModalProps) {
  const [record, setRecord] = useState<GuildRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<GuildRecordComment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState<{ [key: string]: boolean }>({});
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const user = useAuthUser();

  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ✅ 라이트박스에서 쓸 이미지 배열 (메인 + 추가)
  const lightboxImages = useMemo(() => {
    if (!record) return [];
    const images: string[] = [];
    if (record.mainImage) {
      const resolved = resolveImageUrl(record.mainImage);
      if (resolved) images.push(resolved);
    }
    if (record.extraImages && record.extraImages.length > 0) {
      record.extraImages.forEach(img => {
        const resolved = resolveImageUrl(img);
        if (resolved) images.push(resolved);
      });
    }
    return images;
  }, [record]);

  // 메인 이미지가 있으면 추가 이미지 인덱스는 +1부터 시작
  const extraImageOffset = record?.mainImage ? 1 : 0;

  // 도감 기록 로드
  useEffect(() => {
    if (!open || !recordId) return;

    async function loadRecord() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/guilds/${guildId}/records/${recordId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("도감 기록을 불러오는데 실패했습니다.");
        }

        const json = (await response.json()) as GuildRecordDetailResponse;

        if (!json.ok || !json.data) {
          throw new Error(json.error || "도감 기록을 불러오는데 실패했습니다.");
        }

        setRecord(json.data);
      } catch (err: any) {
        console.error("도감 기록 로드 실패", err);
        setError(err?.message || "도감 기록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadRecord();
  }, [open, recordId, guildId]);

  // 댓글 로드
  useEffect(() => {
    if (!open || !recordId) return;

    async function loadComments() {
      try {
        const response = await fetch(
          `/api/guilds/${guildId}/records/${recordId}/comments`,
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const json = (await response.json()) as GuildRecordCommentsResponse;
          if (json.ok && json.data) {
            setComments(json.data);
          }
        }
      } catch (err) {
        console.error("댓글 로드 실패", err);
      }
    }

    loadComments();
  }, [open, recordId, guildId]);

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!commentContent.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);

    try {
      const response = await fetch(
        `/api/guilds/${guildId}/records/${recordId}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: commentContent.trim(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("댓글 작성에 실패했습니다.");
      }

      const json = (await response.json()) as CreateCommentResponse;

      if (!json.ok || !json.data) {
        throw new Error("댓글 작성에 실패했습니다.");
      }

      // 댓글 목록 다시 로드
      await reloadComments();
      setCommentContent("");
      toast.success("댓글이 등록되었습니다.");
    } catch (err: any) {
      console.error("댓글 작성 실패", err);
      toast.error(err?.message || "댓글 작성에 실패했습니다.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 대댓글 작성
  const handleSubmitReply = async (parentCommentId: string) => {
    const content = replyContent[parentCommentId]?.trim();
    if (!content || isSubmittingReply[parentCommentId]) return;

    setIsSubmittingReply((prev) => ({ ...prev, [parentCommentId]: true }));

    try {
      const response = await fetch(
        `/api/guilds/${guildId}/records/${recordId}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            parentCommentId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("답글 작성에 실패했습니다.");
      }

      const json = (await response.json()) as CreateCommentResponse;

      if (!json.ok || !json.data) {
        throw new Error("답글 작성에 실패했습니다.");
      }

      // 댓글 목록 다시 로드
      await reloadComments();

      setReplyContent((prev) => {
        const newContent = { ...prev };
        delete newContent[parentCommentId];
        return newContent;
      });
      setReplyingTo(null);
      toast.success("답글이 등록되었습니다.");
    } catch (err: any) {
      console.error("답글 작성 실패", err);
      toast.error(err?.message || "답글 작성에 실패했습니다.");
    } finally {
      setIsSubmittingReply((prev) => {
        const newState = { ...prev };
        delete newState[parentCommentId];
        return newState;
      });
    }
  };

  // 도감 기록 삭제
  const handleDeleteRecord = async () => {
    if (!record) return;
    
    const isMissionRecord = record.missionId !== null;
    const confirmMessage = isMissionRecord
      ? "미션 후기를 삭제하시겠습니까? 삭제 시 20점이 차감됩니다."
      : "도감 기록을 삭제하시겠습니까? 삭제 시 10점이 차감됩니다.";
    
    if (!window.confirm(confirmMessage)) return;

    setIsDeletingRecord(true);
    try {
      const response = await fetch(`/api/guilds/${guildId}/records/${recordId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "도감 기록 삭제에 실패했습니다.";
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
        throw new Error(json.message || "도감 기록 삭제에 실패했습니다.");
      }

      toast.success(isMissionRecord ? "미션 후기가 삭제되었습니다." : "도감 기록이 삭제되었습니다.");
      onClose();
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err: any) {
      console.error("도감 기록 삭제 실패", err);
      toast.error(err?.message || "도감 기록 삭제에 실패했습니다.");
    } finally {
      setIsDeletingRecord(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    setDeletingCommentId(commentId);

    try {
      const response = await fetch(
        `/api/guilds/${guildId}/records/${recordId}/comments/${commentId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("댓글 삭제에 실패했습니다.");
      }

      // 댓글 목록 다시 로드
      await reloadComments();
      toast.success("댓글이 삭제되었습니다.");
    } catch (err: any) {
      console.error("댓글 삭제 실패", err);
      toast.error(err?.message || "댓글 삭제에 실패했습니다.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  // 댓글 목록 다시 로드하는 함수
  const reloadComments = async () => {
    try {
      const commentsResponse = await fetch(
        `/api/guilds/${guildId}/records/${recordId}/comments`,
        {
          credentials: "include",
        },
      );

      if (commentsResponse.ok) {
        const commentsJson =
          (await commentsResponse.json()) as GuildRecordCommentsResponse;
        if (commentsJson.ok && commentsJson.data) {
          setComments(commentsJson.data);
        }
      }
    } catch (err) {
      console.error("댓글 로드 실패", err);
    }
  };

  // 총 댓글 수 계산 (최상위 댓글 + 모든 대댓글)
  const totalCommentCount = useMemo(() => {
    const topLevelCount = comments.length;
    const replyCount = comments.reduce(
      (sum, comment) => sum + (comment.replies?.length || 0),
      0,
    );
    return topLevelCount + replyCount;
  }, [comments]);

  // Image lightbox handlers
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (lightboxImages.length === 0) return;
    const totalImages = lightboxImages.length;
    if (direction === "prev") {
      setLightboxIndex((prev) => (prev - 1 + totalImages) % totalImages);
    } else {
      setLightboxIndex((prev) => (prev + 1) % totalImages);
    }
  };

  // ESC key handler for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [lightboxOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(88,58,21,0.7)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 금속 장식 테두리 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />

        <div className="p-6 sm:p-8 text-[15px]">
          {loading && (
            <div className="text-center py-12">
              <p className="text-base text-[#d4a574]">도감 기록을 불러오는 중이에요…</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-base text-red-400 font-bold">{error}</p>
            </div>
          )}

          {record && !loading && !error && (
            <div className="space-y-8">
              {/* Header Section: Title + Close Button */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    📜
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#f4d7aa] tracking-wide">
                    도감 상세
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* 삭제 버튼 (작성자만 표시) */}
                  {user && record.userId === Number(user.id) && (
                    <button
                      type="button"
                      onClick={handleDeleteRecord}
                      disabled={isDeletingRecord}
                      className="px-4 py-2 text-xs sm:text-sm font-black rounded-lg bg-gradient-to-b from-[#4a1f1f] to-[#3a1818] text-red-200 border border-red-600/50 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:from-[#5a2f2f] hover:to-[#4a2828] disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {isDeletingRecord ? "삭제 중..." : "삭제"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="relative z-50 text-[#d4a574] hover:text-[#f4d7aa] hover:bg-[#6b4e2f]/60 rounded-full w-9 h-9 flex items-center justify-center transition text-lg font-black cursor-pointer active:scale-95 border border-[#6b4e2f] -mt-1"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#6b4e2f]">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8b6f47] to-[#6b4e2f] text-base flex items-center justify-center text-white font-black flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/40">
                  {record.userName?.[0] || record.userEmail[0]}
                </div>
                <div>
                  <p className="font-black text-[#f4d7aa] text-lg tracking-wide">
                    {record.userName || record.userEmail}
                  </p>
                  <p className="text-sm text-[#8b6f47] mt-0.5 font-medium">
                    {new Date(record.createdAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Cover Image */}
              {record.mainImage && (
                <div
                  className="w-full aspect-video rounded-xl overflow-hidden border-2 border-[#6b4e2f] shadow-[0_8px_24px_rgba(0,0,0,0.5)] cursor-pointer group"
                  onClick={() => openLightbox(0)} // ✅ 메인 이미지 클릭시 라이트박스
                >
                  <img
                    src={resolveImageUrl(record.mainImage) || ''}
                    alt={record.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
              )}

              {/* Main Info Block */}
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-[#f4d7aa] leading-tight tracking-wide">
                  {record.title}
                </h3>

                {record.desc && (
                  <p className="text-lg text-[#d4a574] leading-relaxed font-medium">
                    {record.desc}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {record.category && (
                    <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                      {record.category}
                    </span>
                  )}
                  {record.recordedAt && (
                    <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                      {new Date(record.recordedAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {record.rating && (
                    <div className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#f4d7aa] border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                      <span className="text-amber-400">
                        {"⭐".repeat(record.rating)}
                      </span>
                      <span>{record.rating}점</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Images */}
              {record.extraImages && record.extraImages.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-[#d4a574] uppercase tracking-[0.2em]">
                    추가 사진
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {record.extraImages.map((img, index) => (
                      <div
                        key={index}
                        className="w-full aspect-video rounded-lg overflow-hidden border border-[#6b4e2f] shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer group"
                        onClick={() => openLightbox(extraImageOffset + index)} // ✅ 오프셋 적용
                      >
                        <img
                          src={resolveImageUrl(img) || ''}
                          alt={`추가 이미지 ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Section */}
              {record.content && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-[#d4a574] uppercase tracking-[0.2em]">
                    도감 내용
                  </h4>
                  <p className="text-lg text-[#f4d7aa] whitespace-pre-line leading-relaxed font-medium">
                    {record.content}
                  </p>
                </div>
              )}

              {/* Tag Section */}
              {record.hashtags && record.hashtags.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-[#d4a574] uppercase tracking-[0.2em]">
                    해시태그
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {record.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-gradient-to-b from-[#4a3420] to-[#3a2818] px-3.5 py-1.5 text-sm text-[#d4a574] font-bold border border-[#6b4e2f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 댓글 섹션 */}
              <div className="border-t border-[#6b4e2f] pt-8 mt-8">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    💬
                  </span>
                  <h4 className="text-xl font-black text-[#f4d7aa] tracking-wide">
                    댓글 ({totalCommentCount})
                  </h4>
                </div>

                {/* 댓글 입력 */}
                {user && (
                  <div className="mb-8">
                    <div className="flex gap-3">
                      <textarea
                        placeholder="댓글을 입력하세요..."
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) {
                            handleSubmitComment();
                          }
                        }}
                      className="flex-1 border-2 border-[#6b4e2f] rounded-lg px-4 py-3 h-28 resize-none bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] transition-all text-base placeholder:text-[#8b6f47] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                      />
                      <button
                        onClick={handleSubmitComment}
                        disabled={!commentContent.trim() || isSubmittingComment}
                      className="px-7 py-3 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-base font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        등록
                      </button>
                    </div>
                  </div>
                )}

                {/* 댓글 목록 */}
                <div className="space-y-5">
                  {comments.length === 0 ? (
                    <div className="text-center py-12">
                    <p className="text-base text-[#8b6f47]">
                      아직 댓글이 없습니다. 첫 번째 코멘트를 남겨보세요.
                    </p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="space-y-4">
                        {/* 댓글 카드 */}
                        <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border border-[#6b4e2f] rounded-lg shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8b6f47] to-[#6b4e2f] text-sm flex items-center justify-center text-white font-black flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/40">
                              {comment.userName?.[0] || comment.userEmail[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="font-bold text-[#f4d7aa] text-lg">
                                    {comment.userName || comment.userEmail}
                                  </span>
                                  <span className="text-xs sm:text-sm text-[#8b6f47] font-medium">
                                    {new Date(comment.createdAt).toLocaleString(
                                      "ko-KR",
                                    )}
                                  </span>
                                </div>
                                {user && comment.userId === Number(user.id) && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    disabled={deletingCommentId === comment.id}
                                    className="text-xs sm:text-sm text-red-300 hover:text-red-200 disabled:opacity-50 transition-colors px-2.5 py-1 rounded bg-[#4a1f1f] hover:bg-[#5a2f2f] border border-red-600/40"
                                  >
                                    {deletingCommentId === comment.id
                                      ? "삭제 중..."
                                      : "삭제"}
                                  </button>
                                )}
                              </div>
                              <p className="mt-2">
                                <span className="text-base text-[#d4a574] whitespace-pre-line break-words leading-relaxed">
                                {comment.content}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 답글 목록 */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-6 space-y-3 border-l-2 border-[#6b4e2f] pl-6">
                            {comment.replies.map((reply) => (
                              <div
                                key={reply.id}
                                className="bg-gradient-to-b from-[#4a3420] to-[#3a2818] border border-[#6b4e2f] rounded-lg shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8b6f47] to-[#6b4e2f] text-sm flex items-center justify-center text-white font-black flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/40">
                                    {reply.userName?.[0] || reply.userEmail[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-bold text-[#f4d7aa] text-base">
                                          {reply.userName || reply.userEmail}
                                        </span>
                                        <span className="text-xs sm:text-sm text-[#8b6f47] font-medium">
                                          {new Date(
                                            reply.createdAt,
                                          ).toLocaleString("ko-KR")}
                                        </span>
                                      </div>
                                      {user && reply.userId === Number(user.id) && (
                                        <button
                                          onClick={() =>
                                            handleDeleteComment(reply.id)
                                          }
                                          disabled={
                                            deletingCommentId === reply.id
                                          }
                                          className="text-xs sm:text-sm text-red-300 hover:text-red-200 disabled:opacity-50 transition-colors px-2.5 py-1 rounded bg-[#4a1f1f] hover:bg-[#5a2f2f] border border-red-600/40"
                                        >
                                          {deletingCommentId === reply.id
                                            ? "삭제 중..."
                                            : "삭제"}
                                        </button>
                                      )}
                                    </div>
                                    <p className="mt-2">
                                      <span className="text-base text-[#d4a574] whitespace-pre-line break-words leading-relaxed">
                                      {reply.content}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 대댓글 작성 UI */}
                        {user && (
                          <div className="ml-6">
                            {replyingTo === comment.id ? (
                              <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border border-[#6b4e2f] rounded-lg shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] p-4 space-y-3">
                                <textarea
                                  placeholder="답글을 입력하세요..."
                                  value={replyContent[comment.id] || ""}
                                  onChange={(e) =>
                                    setReplyContent((prev) => ({
                                      ...prev,
                                      [comment.id]: e.target.value,
                                    }))
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter" && e.ctrlKey) {
                                      handleSubmitReply(comment.id);
                                    }
                                  }}
                                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-4 py-3 h-24 resize-none text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] transition-all placeholder:text-[#8b6f47] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyContent((prev) => {
                                        const newContent = { ...prev };
                                        delete newContent[comment.id];
                                        return newContent;
                                      });
                                    }}
                                    className="px-4 py-2 text-base text-[#d4a574] hover:text-[#f4d7aa] bg-gradient-to-b from-[#4a3420] to-[#3a2818] hover:from-[#5a4430] hover:to-[#4a3828] rounded-lg transition-colors font-black border border-[#6b4e2f]"
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={() => handleSubmitReply(comment.id)}
                                    disabled={
                                      !replyContent[comment.id]?.trim() ||
                                      isSubmittingReply[comment.id]
                                    }
                                    className="px-5 py-2 text-base rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                                  >
                                    {isSubmittingReply[comment.id]
                                      ? "등록 중..."
                                      : "등록"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setReplyingTo(comment.id)}
                                className="text-sm text-[#d4a574] hover:text-[#f4d7aa] px-3.5 py-1.5 rounded bg-gradient-to-b from-[#4a3420] to-[#3a2818] hover:from-[#5a4430] hover:to-[#4a3828] transition-colors font-bold border border-[#6b4e2f]"
                              >
                                답글 달기
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Image Lightbox Modal: 메인 + 추가 이미지 모두 사용 */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-2xl font-bold transition-colors"
            aria-label="닫기"
          >
            ×
          </button>

          {/* Navigation Buttons */}
          {lightboxImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("prev");
                }}
                className="absolute left-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                aria-label="이전 이미지"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("next");
                }}
                className="absolute right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                aria-label="다음 이미지"
              >
                ›
              </button>
            </>
          )}

          {/* Image Container */}
          <div
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`도감 이미지 ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Image Counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}