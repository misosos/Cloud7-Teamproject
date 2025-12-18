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
  const user = useAuthUser();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [limitCount, setLimitCount] = useState(4);
  const [difficulty, setDifficulty] = useState("");
  
  // 이미지 상태: 메인 이미지와 추가 이미지(최대 5개)
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [extraImageFiles, setExtraImageFiles] = useState<File[]>([]);
  const [extraImagePreviews, setExtraImagePreviews] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 난이도 옵션
  const difficultyOptions = [
    "쉬움",
    "보통",
    "어려움",
  ];

  // 컴포넌트 언마운트 시 preview URL 정리
  useEffect(() => {
    return () => {
      if (mainImagePreview) {
        URL.revokeObjectURL(mainImagePreview);
      }
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mainImagePreview, extraImagePreviews]);

  // 모달이 닫힐 때 preview URL 정리
  useEffect(() => {
    if (!open) {
      if (mainImagePreview) {
        URL.revokeObjectURL(mainImagePreview);
        setMainImagePreview(null);
      }
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setExtraImagePreviews([]);
      // 폼 초기화
      setTitle("");
      setContent("");
      setLimitCount(4);
      setDifficulty("");
      setMainImageFile(null);
      setExtraImageFiles([]);
      setErrorMessage(null);
    }
  }, [open]);

  if (!open) return null;

  // 메인 이미지 선택 핸들러
  const handleMainImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setMainImageFile(null);
      if (mainImagePreview) {
        URL.revokeObjectURL(mainImagePreview);
      }
      setMainImagePreview(null);
      return;
    }

    const file = files[0];
    if (mainImagePreview) {
      URL.revokeObjectURL(mainImagePreview);
    }
    setMainImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setMainImagePreview(previewUrl);
  };

  // 메인 이미지 삭제 핸들러
  const handleRemoveMainImage = () => {
    if (mainImagePreview) {
      URL.revokeObjectURL(mainImagePreview);
    }
    setMainImageFile(null);
    setMainImagePreview(null);
  };

  // 추가 이미지 선택 핸들러: 최대 5개까지 업로드 가능
  const handleExtraImagesChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

  // 추가 이미지 개별 삭제 핸들러
  const handleRemoveExtraImage = (index: number) => {
    URL.revokeObjectURL(extraImagePreviews[index]);
    
    const updatedFiles = extraImageFiles.filter((_, i) => i !== index);
    const updatedPreviews = extraImagePreviews.filter((_, i) => i !== index);
    
    setExtraImageFiles(updatedFiles);
    setExtraImagePreviews(updatedPreviews);
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    // 세션 확인
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
          const errorText = await uploadResponse.text().catch(() => "");
          let errorMessage = "메인 이미지 업로드에 실패했습니다.";
          
          if (uploadResponse.status === 401) {
            errorMessage = "로그인이 필요합니다. 페이지를 새로고침해주세요.";
          } else if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
          
          throw new Error(errorMessage);
        }

        const uploadJson =
          (await uploadResponse.json()) as UploadImageResponse;
        mainImageUrl = uploadJson.url ?? uploadJson.data?.url ?? null;

        if (!uploadJson.ok || !mainImageUrl) {
          throw new Error("메인 이미지 업로드에 실패했습니다.");
        }
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
          continue;
        }

        const uploadJson =
          (await uploadResponse.json()) as UploadImageResponse;
        const url = uploadJson.url ?? uploadJson.data?.url;
        if (url) {
          extraImageUrls.push(url);
        }
      }

      // 미션 생성
      const missionData = {
        title,
        content: content || null,
        limitCount,
        difficulty: difficulty || null,
        mainImage: mainImageUrl,
        extraImages: extraImageUrls,
      };
      
      const response = await fetch(`/api/guilds/${guildId}/missions`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(missionData),
      });

      if (!response.ok) {
        let errorMessage = "저장에 실패했습니다.";
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch (err) {
          // 에러 파싱 실패는 무시
        }
        throw new Error(errorMessage);
      }

      const json = (await response.json()) as CreateGuildMissionResponse;

      if (!json.ok || !json.data) {
        throw new Error(json.error || "저장에 실패했습니다.");
      }
      // 입력값 초기화
      setTitle("");
      setContent("");
      setLimitCount(4);
      setDifficulty("");
      if (mainImagePreview) {
        URL.revokeObjectURL(mainImagePreview);
      }
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setMainImageFile(null);
      setMainImagePreview(null);
      setExtraImageFiles([]);
      setExtraImagePreviews([]);

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      onClose();
      toast.success("미션이 생성되었습니다.");
    } catch (error: any) {
      console.error("미션 저장 실패", error);
      setErrorMessage(
        error?.message ||
          "미션 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(88,58,21,0.7)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 rounded-lg bg-gradient-to-b from-[#5a3e25] to-[#4a3420] border-2 border-[#6b4e2f] shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 금속 장식 테두리 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b-2 border-[#6b4e2f]">
          <div className="flex items-center gap-2">
            <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              ⚔️
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#f4d7aa] tracking-wide">
              연맹 미션 추가
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative z-50 text-[#d4a574] hover:text-[#f4d7aa] hover:bg-[#6b4e2f]/60 rounded-full w-9 h-9 flex items-center justify-center transition text-lg font-black cursor-pointer active:scale-95 border border-[#6b4e2f]"
          >
            ×
          </button>
        </div>

        {/* 폼 내용 */}
        <div className="p-6 sm:p-7 space-y-6 text-[15px]">
          {/* 메인 이미지와 기본 정보 */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* 메인 이미지 업로드 */}
            <div className="w-full md:w-64 h-52 md:h-64 flex-shrink-0">
              {mainImagePreview ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-[#6b4e2f] shadow-[0_8px_24px_rgba(0,0,0,0.5)] group bg-[#3a2818]">
                  <img
                    src={mainImagePreview}
                    alt="메인 이미지 미리보기"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveMainImage}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-sm font-bold shadow-lg"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="w-full h-full flex items-center justify-center border-2 border-dashed border-[#6b4e2f] rounded-lg cursor-pointer hover:border-[#c9a961] bg-gradient-to-b from-[#4a3420] to-[#3a2818] transition-colors shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                  />
                  <div className="text-center text-[#d4a574]">
                    <div className="text-3xl mb-1">📷</div>
                    <div className="text-sm font-bold">미션 이미지 추가</div>
                  </div>
                </label>
              )}
            </div>

            {/* 제목과 설명 */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
                  미션 제목 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="미션 제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                />
              </div>
              <div>
                <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
                  미션 설명
                </label>
                <textarea
                  placeholder="미션 설명을 입력하세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 h-24 resize-none text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                />
              </div>
            </div>
          </div>

          {/* 선착순 인원과 난이도 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
                선착순 인원 <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={limitCount}
                onChange={(e) => setLimitCount(Number(e.target.value))}
                className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
              />
            </div>
            <div>
              <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
                난이도
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
              >
                <option value="">선택하세요</option>
                {difficultyOptions.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 추가 사진: 최대 5개까지 업로드 가능 */}
          <div>
            <label className="block text-sm font-black text-[#f4d7aa] mb-2 tracking-wide">
              추가 사진 {extraImageFiles.length > 0 && `(${extraImageFiles.length}/5)`}
            </label>
            <div className="space-y-3">
              {extraImageFiles.length > 0 && (
                <div className="grid grid-cols-5 gap-3">
                {extraImageFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-[#6b4e2f] shadow-[0_4px_16px_rgba(0,0,0,0.5)] group bg-[#3a2818]"
                  >
                    <img
                      src={extraImagePreviews[index]}
                      alt={`추가 이미지 ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-xs font-bold shadow-lg"
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}
                </div>
              )}
              
              {extraImageFiles.length < 5 && (
                <label className="inline-flex items-center justify-center w-32 h-32 border-2 border-dashed border-[#6b4e2f] rounded-lg cursor-pointer hover:border-[#c9a961] bg-gradient-to-b from-[#4a3420] to-[#3a2818] transition-colors shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleExtraImagesChange}
                    className="hidden"
                    multiple
                  />
                  <div className="text-center">
                    <div className="text-2xl mb-1 text-[#d4a574]">🖼️</div>
                    <div className="text-xs text-[#d4a574] font-bold">추가</div>
                  </div>
                </label>
              )}
              
              {extraImageFiles.length >= 5 && (
                <p className="text-xs text-[#8b6f47]">
                  최대 5개까지 업로드할 수 있습니다.
                </p>
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {errorMessage && (
            <p className="text-sm text-red-400 font-bold">{errorMessage}</p>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#6b4e2f]">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2.5 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] text-lg font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-lg font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

