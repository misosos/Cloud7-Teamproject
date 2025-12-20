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
      record.extraImages.forEach((img) => {
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
        const response = await fetch(`/api/guilds/${guildId}/records/${recordId}/comments`, {
          credentials: "include",
        });

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
      const response = await fetch(`/api/guilds/${guildId}/records/${recordId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentContent.trim() }),
      });

      if (!response.ok) throw new Error("댓글 작성에 실패했습니다.");

      const json = (await response.json()) as CreateCommentResponse;
      if (!json.ok || !json.data) throw new Error("댓글 작성에 실패했습니다.");

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
      const response = await fetch(`/api/guilds/${guildId}/records/${recordId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentCommentId }),
      });

      if (!response.ok) throw new Error("답글 작성에 실패했습니다.");

      const json = (await response.json()) as CreateCommentResponse;
      if (!json.ok || !json.data) throw new Error("답글 작성에 실패했습니다.");

      await reloadComments();

      setReplyContent((prev) => {
        const next = { ...prev };
        delete next[parentCommentId];
        return next;
      });
      setReplyingTo(null);
      toast.success("답글이 등록되었습니다.");
    } catch (err: any) {
      console.error("답글 작성 실패", err);
      toast.error(err?.message || "답글 작성에 실패했습니다.");
    } finally {
      setIsSubmittingReply((prev) => {
        const next = { ...prev };
        delete next[parentCommentId];
        return next;
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
      if (!json.ok) throw new Error(json.message || "도감 기록 삭제에 실패했습니다.");

      toast.success(isMissionRecord ? "미션 후기가 삭제되었습니다." : "도감 기록이 삭제되었습니다.");
      onClose();
      onDeleteSuccess?.();
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
        { method: "DELETE", credentials: "include" },
      );

      if (!response.ok) throw new Error("댓글 삭제에 실패했습니다.");

      await reloadComments();
      toast.success("댓글이 삭제되었습니다.");
    } catch (err: any) {
      console.error("댓글 삭제 실패", err);
      toast.error(err?.message || "댓글 삭제에 실패했습니다.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  // 댓글 목록 다시 로드
  const reloadComments = async () => {
    try {
      const commentsResponse = await fetch(`/api/guilds/${guildId}/records/${recordId}/comments`, {
        credentials: "include",
      });

      if (commentsResponse.ok) {
        const commentsJson = (await commentsResponse.json()) as GuildRecordCommentsResponse;
        if (commentsJson.ok && commentsJson.data) setComments(commentsJson.data);
      }
    } catch (err) {
      console.error("댓글 로드 실패", err);
    }
  };

  // 총 댓글 수 계산 (최상위 댓글 + 모든 대댓글)
  const totalCommentCount = useMemo(() => {
    const topLevelCount = comments.length;
    const replyCount = comments.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0);
    return topLevelCount + replyCount;
  }, [comments]);

  // Lightbox handlers
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);

  const navigateLightbox = (direction: "prev" | "next") => {
    if (lightboxImages.length === 0) return;
    const totalImages = lightboxImages.length;
    setLightboxIndex((prev) =>
      direction === "prev" ? (prev - 1 + totalImages) % totalImages : (prev + 1) % totalImages,
    );
  };

  // ESC key handler for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [lightboxOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
        bg-[rgba(247,240,230,0.70)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 rounded-2xl
          bg-[rgba(255,255,255,0.55)] backdrop-blur-md
          border border-[#C9A961]/45
          shadow-[0_24px_70px_rgba(43,29,18,0.22)]
          relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warm Oak 골드 포인트 라인 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A961]/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A961]/70 to-transparent" />

        <div className="p-6 sm:p-8 text-[15px] text-[#2B1D12]">
          {loading && (
            <div className="text-center py-12">
              <p className="text-base text-[#6B4E2F]">도감 기록을 불러오는 중이에요…</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-base text-[#B42318] font-bold">{error}</p>
            </div>
          )}

          {record && !loading && !error && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2">
                  <i className="fas fa-scroll text-xl text-[#C9A961]" aria-hidden="true" />
                  <h2 className="text-2xl sm:text-3xl font-black text-[#4A3420] tracking-tight">
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
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-black rounded-xl
                        bg-[rgba(180,35,24,0.10)]
                        text-[#B42318]
                        border border-[#B42318]/35
                        hover:bg-[rgba(180,35,24,0.16)]
                        disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      <i className="fas fa-trash" aria-hidden="true" />
                      {isDeletingRecord ? "삭제 중..." : "삭제"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="닫기"
                    className="relative z-50 w-9 h-9 rounded-full
                      border border-[#C9A961]/40
                      text-[#6B4E2F]
                      hover:text-[#2B1D12]
                      hover:bg-[rgba(201,169,97,0.14)]
                      active:scale-95 transition flex items-center justify-center"
                  >
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#C9A961]/25">
                <div
                  className="w-12 h-12 rounded-full
                    bg-gradient-to-br from-[#8B6F47] to-[#4A3420]
                    text-base flex items-center justify-center text-white font-black flex-shrink-0
                    shadow-[0_10px_22px_rgba(43,29,18,0.18)]
                    ring-2 ring-[#C9A961]/30"
                >
                  {record.userName?.[0] || record.userEmail[0]}
                </div>

                <div className="min-w-0">
                  <p className="font-black text-[#2B1D12] text-lg tracking-tight truncate">
                    {record.userName || record.userEmail}
                  </p>
                  <p className="text-sm text-[#6B4E2F] mt-0.5 font-medium">
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
                  className="w-full aspect-video rounded-2xl overflow-hidden
                    border border-[#C9A961]/35
                    shadow-[0_18px_44px_rgba(43,29,18,0.20)]
                    cursor-pointer group"
                  onClick={() => openLightbox(0)}
                >
                  <img
                    src={resolveImageUrl(record.mainImage) || ""}
                    alt={record.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
              )}

              {/* Main Info */}
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-[#2B1D12] leading-tight tracking-tight">
                  {record.title}
                </h3>

                {record.desc && (
                  <p className="text-lg text-[#6B4E2F] leading-relaxed font-medium">
                    {record.desc}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {record.category && (
                    <span
                      className="px-4 py-1.5 rounded-full text-sm font-bold
                        bg-[rgba(255,255,255,0.55)]
                        text-[#4A3420]
                        border border-[#C9A961]/28
                        shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    >
                      {record.category}
                    </span>
                  )}

                  {record.recordedAt && (
                    <span
                      className="px-4 py-1.5 rounded-full text-sm font-bold
                        bg-[rgba(255,255,255,0.55)]
                        text-[#4A3420]
                        border border-[#C9A961]/28
                        shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    >
                      {new Date(record.recordedAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                      })}
                    </span>
                  )}

                  {record.rating && (
                    <div
                      className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold
                        bg-[rgba(255,255,255,0.55)]
                        text-[#2B1D12]
                        border border-[#C9A961]/28"
                      aria-label={`별점 ${record.rating}점`}
                    >
                      <span className="flex items-center gap-1 text-[#C9A961]">
                        {Array.from({ length: record.rating }).map((_, i) => (
                          <i key={i} className="fas fa-star" aria-hidden="true" />
                        ))}
                      </span>
                      <span className="text-[#6B4E2F]">{record.rating}점</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Images */}
              {record.extraImages && record.extraImages.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-[#6B4E2F] uppercase tracking-[0.2em]">
                    추가 사진
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {record.extraImages.map((img, index) => (
                      <div
                        key={index}
                        className="w-full aspect-video rounded-2xl overflow-hidden
                          border border-[#C9A961]/30
                          shadow-[0_14px_34px_rgba(43,29,18,0.16)]
                          cursor-pointer group"
                        onClick={() => openLightbox(extraImageOffset + index)}
                      >
                        <img
                          src={resolveImageUrl(img) || ""}
                          alt={`추가 이미지 ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              {record.content && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-[#6B4E2F] uppercase tracking-[0.2em]">
                    도감 내용
                  </h4>
                  <p className="text-lg text-[#2B1D12] whitespace-pre-line leading-relaxed font-medium">
                    {record.content}
                  </p>
                </div>
              )}

              {/* Tags */}
              {record.hashtags && record.hashtags.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-[#6B4E2F] uppercase tracking-[0.2em]">
                    해시태그
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {record.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-bold
                          bg-[rgba(255,255,255,0.55)]
                          text-[#4A3420]
                          border border-[#C9A961]/28"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="border-t border-[#C9A961]/25 pt-8 mt-8">
                <div className="flex items-center gap-2 mb-6">
                  <i className="fas fa-comments text-lg text-[#C9A961]" aria-hidden="true" />
                  <h4 className="text-xl font-black text-[#4A3420] tracking-tight">
                    댓글 ({totalCommentCount})
                  </h4>
                </div>

                {/* Comment input */}
                {user && (
                  <div className="mb-8">
                    <div className="flex gap-3">
                      <textarea
                        placeholder="댓글을 입력하세요..."
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) handleSubmitComment();
                        }}
                        className="flex-1 rounded-2xl px-4 py-3 h-28 resize-none
                          bg-[rgba(255,255,255,0.55)]
                          text-[#2B1D12]
                          placeholder:text-[#6B4E2F]/70
                          border border-[#C9A961]/30
                          focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                          shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
                      />

                      <button
                        onClick={handleSubmitComment}
                        disabled={!commentContent.trim() || isSubmittingComment}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                          bg-gradient-to-b from-[#8B6F47] to-[#4A3420]
                          text-white text-base font-black tracking-tight
                          shadow-[0_14px_30px_rgba(43,29,18,0.20),inset_0_1px_0_rgba(255,255,255,0.22)]
                          border border-[#C9A961]/20
                          hover:from-[#9a7d52] hover:to-[#5a3f28]
                          active:scale-[0.99]
                          disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <i className="fas fa-paper-plane" aria-hidden="true" />
                        등록
                      </button>
                    </div>
                  </div>
                )}

                {/* Comment list */}
                <div className="space-y-5">
                  {comments.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-base text-[#6B4E2F]">
                        아직 댓글이 없습니다. 첫 번째 코멘트를 남겨보세요.
                      </p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="space-y-4">
                        {/* Comment card */}
                        <div
                          className="rounded-2xl p-5
                            bg-[rgba(255,255,255,0.55)]
                            border border-[#C9A961]/28
                            shadow-[0_18px_40px_rgba(43,29,18,0.12)]"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="w-10 h-10 rounded-full
                                bg-gradient-to-br from-[#8B6F47] to-[#4A3420]
                                text-sm flex items-center justify-center text-white font-black flex-shrink-0
                                ring-2 ring-[#C9A961]/25"
                            >
                              {comment.userName?.[0] || comment.userEmail[0]}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2 gap-3">
                                <div className="flex items-center gap-3 flex-wrap min-w-0">
                                  <span className="font-black text-[#2B1D12] text-lg truncate">
                                    {comment.userName || comment.userEmail}
                                  </span>
                                  <span className="text-xs sm:text-sm text-[#6B4E2F] font-medium">
                                    {new Date(comment.createdAt).toLocaleString("ko-KR")}
                                  </span>
                                </div>

                                {user && comment.userId === Number(user.id) && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    disabled={deletingCommentId === comment.id}
                                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold
                                      text-[#B42318]
                                      bg-[rgba(180,35,24,0.10)]
                                      hover:bg-[rgba(180,35,24,0.16)]
                                      border border-[#B42318]/30
                                      px-2.5 py-1.5 rounded-xl
                                      disabled:opacity-50 transition"
                                  >
                                    <i className="fas fa-trash" aria-hidden="true" />
                                    {deletingCommentId === comment.id ? "삭제 중..." : "삭제"}
                                  </button>
                                )}
                              </div>

                              <p className="mt-2 text-base text-[#2B1D12] whitespace-pre-line break-words leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-6 space-y-3 border-l-2 border-[#C9A961]/35 pl-6">
                            {comment.replies.map((reply) => (
                              <div
                                key={reply.id}
                                className="rounded-2xl p-4
                                  bg-[rgba(255,255,255,0.55)]
                                  border border-[#C9A961]/22
                                  shadow-[0_14px_32px_rgba(43,29,18,0.10)]"
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className="w-10 h-10 rounded-full
                                      bg-gradient-to-br from-[#8B6F47] to-[#4A3420]
                                      text-sm flex items-center justify-center text-white font-black flex-shrink-0
                                      ring-2 ring-[#C9A961]/22"
                                  >
                                    {reply.userName?.[0] || reply.userEmail[0]}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2 gap-3">
                                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                                        <span className="font-black text-[#2B1D12] text-base truncate">
                                          {reply.userName || reply.userEmail}
                                        </span>
                                        <span className="text-xs sm:text-sm text-[#6B4E2F] font-medium">
                                          {new Date(reply.createdAt).toLocaleString("ko-KR")}
                                        </span>
                                      </div>

                                      {user && reply.userId === Number(user.id) && (
                                        <button
                                          onClick={() => handleDeleteComment(reply.id)}
                                          disabled={deletingCommentId === reply.id}
                                          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold
                                            text-[#B42318]
                                            bg-[rgba(180,35,24,0.10)]
                                            hover:bg-[rgba(180,35,24,0.16)]
                                            border border-[#B42318]/30
                                            px-2.5 py-1.5 rounded-xl
                                            disabled:opacity-50 transition"
                                        >
                                          <i className="fas fa-trash" aria-hidden="true" />
                                          {deletingCommentId === reply.id ? "삭제 중..." : "삭제"}
                                        </button>
                                      )}
                                    </div>

                                    <p className="mt-2 text-base text-[#2B1D12] whitespace-pre-line break-words leading-relaxed">
                                      {reply.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply composer */}
                        {user && (
                          <div className="ml-6">
                            {replyingTo === comment.id ? (
                              <div
                                className="rounded-2xl p-4 space-y-3
                                  bg-[rgba(255,255,255,0.55)]
                                  border border-[#C9A961]/25
                                  shadow-[0_18px_40px_rgba(43,29,18,0.12)]"
                              >
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
                                    if (e.key === "Enter" && e.ctrlKey) handleSubmitReply(comment.id);
                                  }}
                                  className="w-full rounded-2xl px-4 py-3 h-24 resize-none text-base
                                    bg-[rgba(255,255,255,0.55)]
                                    text-[#2B1D12]
                                    placeholder:text-[#6B4E2F]/70
                                    border border-[#C9A961]/30
                                    focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                                    shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
                                />

                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyContent((prev) => {
                                        const next = { ...prev };
                                        delete next[comment.id];
                                        return next;
                                      });
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-base font-black rounded-2xl
                                      text-[#6B4E2F]
                                      bg-[rgba(255,255,255,0.55)]
                                      border border-[#C9A961]/25
                                      hover:bg-[rgba(201,169,97,0.14)]
                                      transition"
                                  >
                                    <i className="fas fa-times" aria-hidden="true" />
                                    취소
                                  </button>

                                  <button
                                    onClick={() => handleSubmitReply(comment.id)}
                                    disabled={!replyContent[comment.id]?.trim() || isSubmittingReply[comment.id]}
                                    className="inline-flex items-center gap-2 px-5 py-2 text-base rounded-2xl
                                      bg-gradient-to-b from-[#8B6F47] to-[#4A3420]
                                      text-white font-black tracking-tight
                                      shadow-[0_14px_30px_rgba(43,29,18,0.20),inset_0_1px_0_rgba(255,255,255,0.22)]
                                      border border-[#C9A961]/20
                                      hover:from-[#9a7d52] hover:to-[#5a3f28]
                                      active:scale-[0.99]
                                      disabled:opacity-50 disabled:cursor-not-allowed transition"
                                  >
                                    <i className="fas fa-reply" aria-hidden="true" />
                                    {isSubmittingReply[comment.id] ? "등록 중..." : "등록"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setReplyingTo(comment.id)}
                                className="inline-flex items-center gap-2 text-sm font-bold
                                  text-[#4A3420]
                                  px-3.5 py-2 rounded-2xl
                                  bg-[rgba(255,255,255,0.55)]
                                  border border-[#C9A961]/25
                                  hover:bg-[rgba(201,169,97,0.14)]
                                  transition"
                              >
                                <i className="fas fa-reply" aria-hidden="true" />
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

      {/* Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={closeLightbox}>
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10
              bg-white/10 hover:bg-white/20 text-white rounded-full
              flex items-center justify-center transition-colors"
            aria-label="닫기"
          >
            <i className="fas fa-times text-xl" aria-hidden="true" />
          </button>

          {/* Nav */}
          {lightboxImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("prev");
                }}
                className="absolute left-4 z-10 w-12 h-12
                  bg-white/10 hover:bg-white/20 text-white rounded-full
                  flex items-center justify-center transition-colors"
                aria-label="이전 이미지"
              >
                <i className="fas fa-chevron-left text-xl" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("next");
                }}
                className="absolute right-4 z-10 w-12 h-12
                  bg-white/10 hover:bg-white/20 text-white rounded-full
                  flex items-center justify-center transition-colors"
                aria-label="다음 이미지"
              >
                <i className="fas fa-chevron-right text-xl" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`도감 이미지 ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-2xl"
            />
          </div>

          {/* Counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}