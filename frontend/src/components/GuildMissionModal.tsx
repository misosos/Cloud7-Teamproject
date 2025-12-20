// frontend/src/components/GuildMissionModal.tsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuthUser } from "@/store/authStore";

interface GuildMissionModalProps {
  open: boolean;
  onClose: () => void;
  guildId: string;
  onSaveSuccess?: () => void;
}

type UploadImageResponse = {
  ok: boolean;
  url?: string;
  data?: { url?: string };
  error?: string;
};

type CreateGuildMissionResponse = {
  ok: boolean;
  data: any;
  error?: string;
};

export default function GuildMissionModal({
  open,
  onClose,
  guildId,
  onSaveSuccess,
}: GuildMissionModalProps) {
  // Warm Oak tokens
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

  const user = useAuthUser();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [limitCount, setLimitCount] = useState(4);
  const [difficulty, setDifficulty] = useState("");

  // 이미지 상태
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [extraImageFiles, setExtraImageFiles] = useState<File[]>([]);
  const [extraImagePreviews, setExtraImagePreviews] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const difficultyOptions = ["쉬움", "보통", "어려움"];

  useEffect(() => {
    return () => {
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mainImagePreview, extraImagePreviews]);

  useEffect(() => {
    if (!open) {
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));

      setMainImagePreview(null);
      setExtraImagePreviews([]);

      setTitle("");
      setContent("");
      setLimitCount(4);
      setDifficulty("");
      setMainImageFile(null);
      setExtraImageFiles([]);
      setErrorMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

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
    setMainImagePreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const handleRemoveMainImage = () => {
    if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
    setMainImageFile(null);
    setMainImagePreview(null);
  };

  const handleExtraImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const existingCount = extraImageFiles.length;
    const remainingSlots = 5 - existingCount;

    if (remainingSlots <= 0) {
      toast.error("추가 사진은 최대 5개까지 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    const newFiles = Array.from(files).slice(0, remainingSlots);
    setExtraImageFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setExtraImagePreviews((prev) => [...prev, ...newPreviews]);

    event.target.value = "";
  };

  const handleRemoveExtraImage = (index: number) => {
    const target = extraImagePreviews[index];
    if (target) URL.revokeObjectURL(target);

    setExtraImageFiles((prev) => prev.filter((_, i) => i !== index));
    setExtraImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!user) {
      toast.error("로그인이 필요합니다. 페이지를 새로고침해주세요.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("미션 제목을 입력해주세요.");
      return;
    }

    if (!limitCount || limitCount < 1) {
      setErrorMessage("선착순 인원은 1명 이상이어야 합니다.");
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      let mainImageUrl: string | null = null;
      const extraImageUrls: string[] = [];

      if (mainImageFile) {
        const formData = new FormData();
        formData.append("file", mainImageFile);

        const uploadResponse = await fetch("/api/uploads/guild-records", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => "");
          let msg = "메인 이미지 업로드에 실패했습니다.";

          if (uploadResponse.status === 401) {
            msg = "로그인이 필요합니다. 페이지를 새로고침해주세요.";
          } else if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              msg = errorJson.message || msg;
            } catch {
              msg = errorText || msg;
            }
          }
          throw new Error(msg);
        }

        const uploadJson = (await uploadResponse.json()) as UploadImageResponse;
        mainImageUrl = uploadJson.url ?? uploadJson.data?.url ?? null;

        if (!uploadJson.ok || !mainImageUrl) {
          throw new Error("메인 이미지 업로드에 실패했습니다.");
        }
      }

      for (const file of extraImageFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("/api/uploads/guild-records", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadResponse.ok) continue;

        const uploadJson = (await uploadResponse.json()) as UploadImageResponse;
        const url = uploadJson.url ?? uploadJson.data?.url;
        if (uploadJson.ok && url) extraImageUrls.push(url);
      }

      const missionData = {
        title: title.trim(),
        content: content?.trim() ? content.trim() : null,
        limitCount,
        difficulty: difficulty || null,
        mainImage: mainImageUrl,
        extraImages: extraImageUrls,
      };

      const response = await fetch(`/api/guilds/${guildId}/missions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(missionData),
      });

      if (!response.ok) {
        let msg = "저장에 실패했습니다.";
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              msg = errorJson.message || errorJson.error || msg;
            } catch {
              msg = errorText || msg;
            }
          }
        } catch {}
        throw new Error(msg);
      }

      const json = (await response.json()) as CreateGuildMissionResponse;
      if (!json.ok || !json.data) throw new Error(json.error || "저장에 실패했습니다.");

      setTitle("");
      setContent("");
      setLimitCount(4);
      setDifficulty("");

      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));

      setMainImageFile(null);
      setMainImagePreview(null);
      setExtraImageFiles([]);
      setExtraImagePreviews([]);

      onSaveSuccess?.();
      onClose();
      toast.success("미션이 생성되었습니다.");
    } catch (error: any) {
      console.error("미션 저장 실패", error);
      setErrorMessage(
        error?.message || "미션 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
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
          relative isolate"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 골드 포인트 라인 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A961]/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A961]/70 to-transparent" />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#C9A961]/25 bg-[rgba(255,255,255,0.92)] backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <i className="fas fa-clipboard-list text-[#C9A961]" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-black text-[#4A3420] tracking-tight">
              연맹 미션 추가
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
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* 폼 */}
        <div className="p-6 sm:p-7 space-y-6 text-[15px]" style={{ color: THEME.text }}>
          <div className="flex flex-col md:flex-row gap-6">
            {/* 메인 이미지 */}
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
                </div>
              ) : (
                <label
                  className="w-full h-full flex items-center justify-center rounded-2xl cursor-pointer
                    bg-[rgba(255,255,255,0.55)]
                    border border-dashed border-[#C9A961]/35
                    hover:border-[#C9A961]/60
                    shadow-[0_12px_28px_rgba(43,29,18,0.10)]
                    transition"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="mb-2">
                      <i className="fas fa-camera text-2xl text-[#C9A961]" aria-hidden="true" />
                    </div>
                    <div className="text-sm font-black text-[#4A3420]">미션 이미지 추가</div>
                    <div className="text-xs mt-2 text-[#6B4E2F]">클릭해서 업로드</div>
                  </div>
                </label>
              )}
            </div>

            {/* 제목/설명 */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-base font-black text-[#4A3420] mb-1 tracking-tight">
                  미션 제목 <span className="text-[#B42318]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="미션 제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl px-3 py-2.5 text-base
                    bg-[rgba(255,255,255,0.55)]
                    text-[#2B1D12]
                    placeholder:text-[#6B4E2F]/70
                    border border-[#C9A961]/35
                    focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
                />
              </div>

              <div>
                <label className="block text-base font-black text-[#4A3420] mb-1 tracking-tight">
                  미션 설명
                </label>
                <textarea
                  placeholder="미션 설명을 입력하세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-2xl px-3 py-2.5 h-28 resize-none text-base
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

          {/* 인원/난이도 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-black text-[#4A3420] mb-1 tracking-tight">
                선착순 인원 <span className="text-[#B42318]">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={limitCount}
                onChange={(e) => setLimitCount(Number(e.target.value))}
                className="w-full rounded-2xl px-3 py-2.5 text-base
                  bg-[rgba(255,255,255,0.55)]
                  text-[#2B1D12]
                  border border-[#C9A961]/35
                  focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                  shadow-[0_10px_24px_rgba(43,29,18,0.10)]"
              />
            </div>

            <div>
              <label className="block text-base font-black text-[#4A3420] mb-1 tracking-tight">
                난이도
              </label>

              <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full rounded-2xl px-3 py-2.5 text-base
                    bg-[rgba(255,255,255,0.55)]
                    text-[#2B1D12]
                    border border-[#C9A961]/35
                    focus:outline-none focus:ring-2 focus:ring-[#C9A961]/55 focus:border-[#C9A961]/55
                    shadow-[0_10px_24px_rgba(43,29,18,0.10)]
                    appearance-none pr-10"
                >
                  <option value="">선택하세요</option>
                  {difficultyOptions.map((diff) => (
                    <option key={diff} value={diff}>
                      {diff}
                    </option>
                  ))}
                </select>
                <i
                  className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#6B4E2F]"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* 추가 사진 */}
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
                        aria-label={`추가 이미지 ${index + 1} 삭제`}
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
                    <div className="text-[11px] mt-1 text-[#6B4E2F]/70">최대 5개</div>
                  </div>
                </label>
              )}

              {extraImageFiles.length >= 5 && (
                <p className="text-xs text-[#6B4E2F]">최대 5개까지 업로드할 수 있습니다.</p>
              )}
            </div>
          </div>

          {/* 에러 */}
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

          {/* 버튼 */}
          <div
            className="flex justify-end gap-3 pt-4 border-t border-[#C9A961]/25
              bg-[rgba(255,255,255,0.92)] backdrop-blur-sm
              -mx-6 sm:-mx-7 px-6 sm:px-7 pb-6 sm:pb-7 rounded-b-2xl"
          >
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

          {/* subtle footer note */}
          <div className="pt-2 text-xs text-[#6B4E2F] flex items-center gap-2">
            <i className="fas fa-leaf text-[#C9A961]" aria-hidden="true" />
            Warm Oak · surface UI
          </div>
        </div>
      </div>
    </div>
  );
}