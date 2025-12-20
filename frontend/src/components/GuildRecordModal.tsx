// frontend/src/components/GuildRecordModal.tsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface GuildRecordModalProps {
  open: boolean;
  onClose: () => void;
  guildId: string;
  missionId?: string; // 미션 참여 기록인 경우 missionId 전달
  kakaoPlaceId?: string; // 추천 장소 달성 기록인 경우 카카오 장소 ID
  placeName?: string; // 추천 장소 달성 기록인 경우 장소 이름 (제목 미리 채우기용)
  onSaveSuccess?: (recordId?: string) => void; // 기록 ID 전달
  onError?: (error: string) => void; // 에러 발생 시 콜백
}

type UploadImageResponse = {
  ok: boolean;
  url?: string;
  data?: { url?: string };
  error?: string;
};

type CreateGuildRecordResponse = {
  ok: boolean;
  data: any;
  error?: string;
  message?: string;
};

export default function GuildRecordModal({
  open,
  onClose,
  guildId,
  missionId,
  kakaoPlaceId,
  placeName,
  onSaveSuccess,
  onError,
}: GuildRecordModalProps) {
  // Theme tokens (Warm Oak)
 

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");

  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [extraImageFiles, setExtraImageFiles] = useState<File[]>([]);
  const [extraImagePreviews, setExtraImagePreviews] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const predefinedHashtags = [
    "#주말",
    "#친구",
    "#혼자",
    "#가성비",
    "#재방문",
    "#신작",
    "#핫플",
    "#클래식",
  ];

  const categoryOptions = [
    "영화",
    "공연",
    "전시",
    "문화시설",
    "관광명소",
    "카페",
    "식당",
    "기타",
  ];

  // 언마운트 시 preview URL 정리
  useEffect(() => {
    return () => {
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mainImagePreview, extraImagePreviews]);

  // 모달 닫힐 때 preview URL 정리
  useEffect(() => {
    if (!open) {
      if (mainImagePreview) {
        URL.revokeObjectURL(mainImagePreview);
        setMainImagePreview(null);
      }
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setExtraImagePreviews([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 추천 장소 달성 기록인 경우 제목 미리 채우기
  useEffect(() => {
    if (open && kakaoPlaceId && placeName && !title.trim()) setTitle(placeName);
  }, [open, kakaoPlaceId, placeName, title]);

  if (!open) return null;

  // 메인 이미지 선택
  const handleMainImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setMainImageFile(null);
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      setMainImagePreview(null);
      return;
    }

    const file = files[0];
    if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);

    setMainImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setMainImagePreview(previewUrl);
  };

  const handleRemoveMainImage = () => {
    if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
    setMainImageFile(null);
    setMainImagePreview(null);
  };

  // 추가 이미지: 최대 5개
  const handleExtraImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const existingCount = extraImageFiles.length;
    const remainingSlots = 5 - existingCount;

    if (remainingSlots <= 0) {
      toast.error("추가 사진은 최대 5개까지 업로드할 수 있습니다.");
      return;
    }

    const newFiles = Array.from(files).slice(0, remainingSlots);
    const updatedFiles = [...extraImageFiles, ...newFiles];
    setExtraImageFiles(updatedFiles);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setExtraImagePreviews([...extraImagePreviews, ...newPreviews]);

    event.target.value = "";
  };

  const handleRemoveExtraImage = (index: number) => {
    URL.revokeObjectURL(extraImagePreviews[index]);

    const updatedFiles = extraImageFiles.filter((_, i) => i !== index);
    const updatedPreviews = extraImagePreviews.filter((_, i) => i !== index);

    setExtraImageFiles(updatedFiles);
    setExtraImagePreviews(updatedPreviews);
  };

  // 태그
  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    const clean = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
    if (!clean || hashtags.includes(clean)) return;

    setHashtags((prev) => [...prev, clean]);
    setTagInput("");
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagInput.trim()) handleAddTag(tagInput);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setHashtags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const togglePredefinedHashtag = (tag: string) => {
    const clean = tag.startsWith("#") ? tag.slice(1) : tag;
    setHashtags((prev) => (prev.includes(clean) ? prev.filter((t) => t !== clean) : [...prev, clean]));
  };

  // 저장
  const handleSave = async () => {
    if (isSaving) return;

    if (!title.trim()) {
      setErrorMessage("도감 제목을 입력해주세요.");
      return;
    }

    if (kakaoPlaceId && !mainImageFile) {
      setErrorMessage("추천 장소 기록은 사진이 필수입니다. 사진을 추가해주세요.");
      return;
    }

    if (category === "기타" && !customCategory.trim()) {
      setErrorMessage("카테고리를 직접 입력해주세요.");
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      let mainImageUrl: string | null = null;
      const extraImageUrls: string[] = [];

      // 메인 이미지 업로드
      if (mainImageFile) {
        const formData = new FormData();
        formData.append("file", mainImageFile);

        const uploadResponse = await fetch("/api/uploads/guild-records", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadResponse.ok) {
          let msg = "메인 이미지 업로드에 실패했습니다.";
          try {
            const errorJson = await uploadResponse.json();
            msg = errorJson.message || errorJson.error || msg;
            if (uploadResponse.status === 401) msg = "로그인이 필요합니다. 페이지를 새로고침해주세요.";
          } catch {
            if (uploadResponse.status === 401) msg = "로그인이 필요합니다. 페이지를 새로고침해주세요.";
          }
          throw new Error(msg);
        }

        const uploadJson = (await uploadResponse.json()) as UploadImageResponse;
        mainImageUrl = uploadJson.url ?? uploadJson.data?.url ?? null;

        if (!uploadJson.ok || !mainImageUrl) throw new Error("메인 이미지 업로드에 실패했습니다.");
      }

      // 추가 이미지 업로드
      for (const file of extraImageFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("/api/uploads/guild-records", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadResponse.ok) {
          if (uploadResponse.status === 401) {
            throw new Error("로그인이 필요합니다. 페이지를 새로고침해주세요.");
          }
          continue;
        }

        const uploadJson = (await uploadResponse.json()) as UploadImageResponse;
        const url = uploadJson.url ?? uploadJson.data?.url;
        if (url) extraImageUrls.push(url);
      }

      const finalCategory = category === "기타" ? customCategory.trim() : category;

      const endpoint = missionId
        ? `/api/guilds/${guildId}/missions/${missionId}/records`
        : `/api/guilds/${guildId}/records`;

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          desc: desc || null,
          content: content || null,
          category: finalCategory || null,
          recordedAt: recordDate || null,
          rating: rating > 0 ? rating : null,
          mainImage: mainImageUrl,
          extraImages: extraImageUrls,
          hashtags,
          kakaoPlaceId: kakaoPlaceId || null,
        }),
      });

      if (!response.ok) {
        let msg = "저장에 실패했습니다.";
        try {
          const errorJson = await response.json();
          msg = errorJson.message || errorJson.error || msg;

          if (errorJson.error === "MISSION_FULL" || msg.includes("끝난 미션")) msg = "아쉽지만 이미 끝난 미션입니다.";
          else if (errorJson.error === "ALREADY_PARTICIPATED" || msg.includes("이미 참여")) msg = "이미 참여한 미션입니다.";
          else if (errorJson.error === "BAD_REQUEST") msg = errorJson.message || msg;
        } catch {
          msg = "저장에 실패했습니다. 잠시 후 다시 시도해주세요.";
        }
        throw new Error(msg);
      }

      const json = (await response.json()) as CreateGuildRecordResponse;

      if (!json.ok || !json.data) {
        let msg = json.message || json.error || "저장에 실패했습니다.";

        if (json.error === "MISSION_FULL" || msg.includes("끝난 미션")) msg = "아쉽지만 이미 끝난 미션입니다.";
        else if (json.error === "ALREADY_PARTICIPATED" || msg.includes("이미 참여")) msg = "이미 참여한 미션입니다.";
        else if (json.error === "BAD_REQUEST") {
          msg = json.message || msg;
          if (msg.includes("5분 이상 머물러야") || msg.includes("10분 이상 머물러야")) {
            msg = "해당 장소에서 최소 5분 이상 머물러야 기록을 작성할 수 있습니다.";
          }
        }

        throw new Error(msg);
      }

      // 입력값 초기화
      setTitle("");
      setDesc("");
      setCategory("");
      setCustomCategory("");
      setRecordDate("");
      setRating(0);
      setContent("");

      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));

      setHashtags([]);
      setTagInput("");
      setMainImageFile(null);
      setMainImagePreview(null);
      setExtraImageFiles([]);
      setExtraImagePreviews([]);

      const createdRecordId = json.data?.id;
      onSaveSuccess?.(createdRecordId);
      onClose();
    } catch (error: any) {
      console.error("도감 기록 저장 실패", error);
      const msg =
        error?.message || "기록 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      setErrorMessage(msg);

      if (msg.includes("끝난 미션")) toast.error("아쉽지만 이미 끝난 미션입니다.");
      onError?.(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(247,240,230,0.70)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 rounded-2xl
          bg-[rgba(255,255,255,0.55)] backdrop-blur-md
          border border-[#C9A961]/45
          shadow-[0_24px_70px_rgba(43,29,18,0.22)]
          relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 골드 포인트 라인 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A961]/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A961]/70 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#C9A961]/25">
          <div className="flex items-center gap-2">
            <i
              className={`fas ${missionId ? "fa-shield-halved" : "fa-scroll"} text-lg text-[#C9A961]`}
              aria-hidden="true"
            />
            <h2 className="text-xl sm:text-2xl font-black text-[#4A3420] tracking-tight">
              {missionId ? "미션 후기 작성" : "연맹 도감 추가"}
            </h2>
          </div>

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

        {/* Body */}
        <div className="p-6 sm:p-7 space-y-6 text-[15px] text-[#2B1D12]">
          {/* Main image + basics */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Main image */}
            <div className="w-full md:w-64 h-52 md:h-64 flex-shrink-0">
              {mainImagePreview ? (
                <div
                  className="relative w-full h-full rounded-2xl overflow-hidden
                    border border-[#C9A961]/30
                    shadow-[0_18px_44px_rgba(43,29,18,0.18)]
                    group bg-white/40"
                >
                  <img
                    src={mainImagePreview}
                    alt="메인 이미지 미리보기"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {!kakaoPlaceId && (
                    <button
                      type="button"
                      onClick={handleRemoveMainImage}
                      className="absolute top-2 right-2 w-8 h-8
                        rounded-full flex items-center justify-center
                        bg-[rgba(180,35,24,0.12)]
                        text-[#B42318]
                        border border-[#B42318]/35
                        opacity-0 group-hover:opacity-100 transition
                        hover:bg-[rgba(180,35,24,0.18)]"
                      title="삭제"
                      aria-label="메인 이미지 삭제"
                    >
                      <i className="fas fa-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ) : (
                <label
                  className={`w-full h-full flex items-center justify-center rounded-2xl cursor-pointer
                    bg-[rgba(255,255,255,0.55)]
                    border border-dashed
                    shadow-[0_12px_28px_rgba(43,29,18,0.10)]
                    transition
                    ${
                      kakaoPlaceId
                        ? "border-[#B42318]/55 hover:border-[#B42318]/70"
                        : "border-[#C9A961]/35 hover:border-[#C9A961]/60"
                    }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                    required={!!kakaoPlaceId}
                  />
                  <div className="text-center">
                    <div className="mb-2">
                      <i className="fas fa-camera text-2xl text-[#C9A961]" aria-hidden="true" />
                    </div>
                    <div className="text-sm font-black text-[#4A3420]">
                      {kakaoPlaceId ? "표지 이미지 추가 (필수)" : "표지 이미지 추가"}
                    </div>
                    {kakaoPlaceId && (
                      <div className="text-xs mt-1 text-[#B42318] font-semibold">
                        추천 장소 기록은 사진이 필수입니다
                      </div>
                    )}
                    <div className="text-xs mt-2 text-[#6B4E2F]">
                      클릭해서 사진 업로드
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Title/Desc */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-base font-black text-[#4A3420] mb-1 tracking-tight">
                  도감 제목 <span className="text-[#B42318]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="도감 제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  readOnly={!!kakaoPlaceId}
                  className={`w-full rounded-2xl px-3 py-2.5 text-base
                    bg-[rgba(255,255,255,0.55)]
                    text-[#2B1D12]
                    placeholder:text-[#6B4E2F]/70
                    border border-[#C9A961]/35
                    focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)]
                    ${kakaoPlaceId ? "opacity-75 cursor-not-allowed" : ""}`}
                />
              </div>

              <div>
                <label className="block text-base font-black text-[#4A3420] mb-1 tracking-tight">
                  도감 세부 정리
                </label>
                <input
                  type="text"
                  placeholder="도감 세부 정리"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-2xl px-3 py-2.5 text-base
                    bg-[rgba(255,255,255,0.55)]
                    text-[#2B1D12]
                    placeholder:text-[#6B4E2F]/70
                    border border-[#C9A961]/35
                    focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
                />
              </div>
            </div>
          </div>

          {/* Category + Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-black text-[#4A3420] mb-1 tracking-tight">
                도감 카테고리
              </label>

              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value !== "기타") setCustomCategory("");
                  }}
                  className="w-full rounded-2xl px-3 py-2.5 text-base
                    bg-[rgba(255,255,255,0.55)]
                    text-[#2B1D12]
                    border border-[#C9A961]/35
                    focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)]
                    appearance-none pr-10"
                >
                  <option value="">선택하세요</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <i
                  className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#6B4E2F]"
                  aria-hidden="true"
                />
              </div>

              {category === "기타" && (
                <div className="mt-2">
                  <label className="block text-sm font-black text-[#6B4E2F] mb-1">
                    직접 입력 <span className="text-[#B42318]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="카테고리를 입력하세요"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      if (errorMessage && e.target.value.trim()) setErrorMessage(null);
                    }}
                    className="w-full rounded-2xl px-3 py-2 text-base
                      bg-[rgba(255,255,255,0.55)]
                      text-[#2B1D12]
                      placeholder:text-[#6B4E2F]/70
                      border border-[#C9A961]/35
                      focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                      shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-base font-black text-[#4A3420] mb-1 tracking-tight">
                날짜
              </label>

              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full rounded-2xl px-3 py-2.5 text-base
                      bg-[rgba(255,255,255,0.55)]
                      text-[#2B1D12]
                      border border-[#C9A961]/35
                      focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                      shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
                  />
                </div>

                <span
                  className="w-10 h-10 rounded-2xl flex items-center justify-center
                    bg-[rgba(201,169,97,0.14)]
                    border border-[#C9A961]/30
                    text-[#4A3420]"
                  aria-hidden="true"
                >
                  <i className="fas fa-calendar-day" />
                </span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-base font-black text-[#4A3420] mb-2 tracking-tight">
              별점
            </label>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition
                      border
                      ${
                        active
                          ? "bg-[rgba(201,169,97,0.16)] border-[#C9A961]/50"
                          : "bg-[rgba(255,255,255,0.55)] border-[#C9A961]/25 hover:bg-[rgba(201,169,97,0.12)]"
                      }`}
                    aria-label={`${star}점`}
                  >
                    <i
                      className={`fas fa-star text-lg ${active ? "text-[#C9A961]" : "text-[#6B4E2F]/60"}`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}

              {rating > 0 && (
                <span className="ml-2 text-sm text-[#6B4E2F] font-bold">{rating}점</span>
              )}
            </div>
          </div>

          {/* Extra images */}
          <div>
            <label className="block text-base font-black text-[#4A3420] mb-2 tracking-tight">
              추가 사진 {extraImageFiles.length > 0 && `(${extraImageFiles.length}/5)`}
            </label>

            <div className="space-y-3">
              {extraImageFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {extraImageFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      className="relative w-full aspect-square rounded-2xl overflow-hidden
                        border border-[#C9A961]/28
                        shadow-[0_14px_32px_rgba(43,29,18,0.12)]
                        group bg-white/40"
                    >
                      <img
                        src={extraImagePreviews[index]}
                        alt={`추가 이미지 ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraImage(index)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full
                          flex items-center justify-center
                          bg-[rgba(180,35,24,0.12)]
                          text-[#B42318]
                          border border-[#B42318]/35
                          opacity-0 group-hover:opacity-100 transition
                          hover:bg-[rgba(180,35,24,0.18)]"
                        title="삭제"
                        aria-label="추가 이미지 삭제"
                      >
                        <i className="fas fa-trash" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {extraImageFiles.length < 5 && (
                <label
                  className="inline-flex items-center justify-center w-32 h-32 rounded-2xl cursor-pointer
                    bg-[rgba(255,255,255,0.55)]
                    border border-dashed border-[#C9A961]/35
                    hover:border-[#C9A961]/60
                    shadow-[0_12px_28px_rgba(43,29,18,0.10)]
                    transition"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleExtraImagesChange}
                    className="hidden"
                    multiple
                  />
                  <div className="text-center">
                    <i className="fas fa-images text-2xl text-[#C9A961]" aria-hidden="true" />
                    <div className="text-xs mt-2 text-[#6B4E2F] font-bold">추가</div>
                  </div>
                </label>
              )}

              {extraImageFiles.length >= 5 && (
                <p className="text-xs text-[#6B4E2F]">최대 5개까지 업로드할 수 있습니다.</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-base font-black text-[#4A3420] mb-2 tracking-tight">
              도감 내용
            </label>
            <textarea
              placeholder="도감 후기를 작성해주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-2xl px-3 py-2.5 h-32 text-base
                bg-[rgba(255,255,255,0.55)]
                text-[#2B1D12]
                placeholder:text-[#6B4E2F]/70
                border border-[#C9A961]/35
                focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-base font-black text-[#4A3420] mb-2 tracking-tight">
              해시 태그
            </label>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="태그를 입력하고 Enter 또는 쉼표(,)를 누르세요"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  className="flex-1 rounded-2xl px-3 py-2.5 text-base
                    bg-[rgba(255,255,255,0.55)]
                    text-[#2B1D12]
                    placeholder:text-[#6B4E2F]/70
                    border border-[#C9A961]/35
                    focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  disabled={!tagInput.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl
                    bg-gradient-to-b from-[#8B6F47] to-[#4A3420]
                    text-sm font-black text-white tracking-tight
                    shadow-[0_14px_30px_rgba(43,29,18,0.20),inset_0_1px_0_rgba(255,255,255,0.22)]
                    border border-[#C9A961]/20
                    hover:from-[#9a7d52] hover:to-[#5a3f28]
                    disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <i className="fas fa-plus" aria-hidden="true" />
                  추가
                </button>
              </div>

              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold
                        bg-[rgba(255,255,255,0.55)]
                        text-[#4A3420]
                        border border-[#C9A961]/28"
                    >
                      <i className="fas fa-hashtag text-[#C9A961]" aria-hidden="true" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="w-6 h-6 rounded-full flex items-center justify-center
                          text-[#6B4E2F]
                          hover:text-[#2B1D12]
                          hover:bg-[rgba(201,169,97,0.14)]
                          transition"
                        title="삭제"
                        aria-label="태그 삭제"
                      >
                        <i className="fas fa-times" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-[#C9A961]/20">
                <p className="text-xs text-[#6B4E2F] mb-2">추천 태그</p>
                <div className="flex flex-wrap gap-2">
                  {predefinedHashtags.map((tag) => {
                    const clean = tag.startsWith("#") ? tag.slice(1) : tag;
                    const isSelected = hashtags.includes(clean);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePredefinedHashtag(tag)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition
                          border
                          ${
                            isSelected
                              ? "bg-[rgba(201,169,97,0.18)] text-[#2B1D12] border-[#C9A961]/55"
                              : "bg-[rgba(255,255,255,0.55)] text-[#6B4E2F] border-[#C9A961]/25 hover:bg-[rgba(201,169,97,0.12)]"
                          }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div
              className="rounded-2xl px-4 py-3
                bg-[rgba(180,35,24,0.08)]
                border border-[#B42318]/25"
            >
              <p className="text-sm text-[#B42318] font-bold flex items-center gap-2">
                <i className="fas fa-triangle-exclamation" aria-hidden="true" />
                {errorMessage}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#C9A961]/25">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-2xl
                bg-[rgba(255,255,255,0.55)]
                text-[#6B4E2F]
                font-black tracking-tight
                border border-[#C9A961]/30
                hover:bg-[rgba(201,169,97,0.14)]
                transition"
            >
              <i className="fas fa-xmark" aria-hidden="true" />
              취소
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-2xl
                bg-gradient-to-b from-[#8B6F47] to-[#4A3420]
                text-white font-black tracking-tight
                shadow-[0_14px_30px_rgba(43,29,18,0.20),inset_0_1px_0_rgba(255,255,255,0.22)]
                border border-[#C9A961]/20
                hover:from-[#9a7d52] hover:to-[#5a3f28]
                disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                  등록 중...
                </>
              ) : (
                <>
                  <i className="fas fa-floppy-disk" aria-hidden="true" />
                  등록
                </>
              )}
            </button>
          </div>

          {/* subtle footer note (optional) */}
          <div className="pt-2 text-xs text-[#6B4E2F] flex items-center gap-2">
            <i className="fab fa-pagelines text-[#C9A961]" aria-hidden="true" />
            Warm Oak · surface UI
          </div>
        </div>
      </div>
    </div>
  );
}