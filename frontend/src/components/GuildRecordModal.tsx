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
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState(""); // Custom category input when "기타" is selected
  const [recordDate, setRecordDate] = useState("");
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  
  // 태그 상태: 문자열 배열로 관리, 사용자 입력으로 추가
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // 이미지 상태: 메인 이미지와 추가 이미지(최대 5개)
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [extraImageFiles, setExtraImageFiles] = useState<File[]>([]);
  const [extraImagePreviews, setExtraImagePreviews] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 미리 정의된 해시태그 옵션 (선택 사항으로 유지)
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

  // 카테고리 옵션
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
    }
  }, [open]);

  // 추천 장소 달성 기록인 경우 제목 미리 채우기
  useEffect(() => {
    if (open && kakaoPlaceId && placeName && !title.trim()) {
      setTitle(placeName);
    }
  }, [open, kakaoPlaceId, placeName]);

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
    // 기존 preview URL 정리
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

    // 기존 파일과 새 파일 합치기, 최대 5개 제한
    const existingCount = extraImageFiles.length;
    const remainingSlots = 5 - existingCount;
    
    if (remainingSlots <= 0) {
      toast.error("추가 사진은 최대 5개까지 업로드할 수 있습니다.");
      return;
    }

    const newFiles = Array.from(files).slice(0, remainingSlots);
    const updatedFiles = [...extraImageFiles, ...newFiles];
    setExtraImageFiles(updatedFiles);
    
    // 기존 preview URL 정리 및 새 preview 생성
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setExtraImagePreviews([...extraImagePreviews, ...newPreviews]);
    
    // input 초기화 (같은 파일 다시 선택 가능하도록)
    event.target.value = "";
  };

  // 추가 이미지 개별 삭제 핸들러
  const handleRemoveExtraImage = (index: number) => {
    // 기존 preview URL 정리
    URL.revokeObjectURL(extraImagePreviews[index]);
    
    const updatedFiles = extraImageFiles.filter((_, i) => i !== index);
    const updatedPreviews = extraImagePreviews.filter((_, i) => i !== index);
    
    setExtraImageFiles(updatedFiles);
    setExtraImagePreviews(updatedPreviews);
  };

  // 해시태그 추가: Enter 또는 쉼표로 추가, 중복 방지
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    // # 제거 후 추가 (사용자가 #를 입력해도 자동 처리)
    const cleanTag = trimmedTag.startsWith("#") 
      ? trimmedTag.slice(1) 
      : trimmedTag;
    
    // 중복 체크
    if (hashtags.includes(cleanTag)) {
      return;
    }
    
    setHashtags((prev) => [...prev, cleanTag]);
    setTagInput("");
  };

  // 태그 입력 핸들러: Enter 또는 쉼표로 태그 추가
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag(tagInput);
      }
    }
  };

  // 태그 개별 삭제
  const handleRemoveTag = (tagToRemove: string) => {
    setHashtags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  // 미리 정의된 태그 토글 (기존 기능 유지)
  const togglePredefinedHashtag = (tag: string) => {
    const cleanTag = tag.startsWith("#") ? tag.slice(1) : tag;
    setHashtags((prev) =>
      prev.includes(cleanTag) 
        ? prev.filter((t) => t !== cleanTag) 
        : [...prev, cleanTag],
    );
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (isSaving) return;

    if (!title.trim()) {
      setErrorMessage("도감 제목을 입력해주세요.");
      return;
    }

    // 추천 장소 기록인 경우 이미지 필수
    if (kakaoPlaceId && !mainImageFile) {
      setErrorMessage("추천 장소 기록은 사진이 필수입니다. 사진을 추가해주세요.");
      return;
    }

    // Custom category validation
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
          let errorMessage = "메인 이미지 업로드에 실패했습니다.";
          try {
            const errorJson = await uploadResponse.json();
            errorMessage = errorJson.message || errorJson.error || errorMessage;
            
            if (uploadResponse.status === 401) {
              errorMessage = "로그인이 필요합니다. 페이지를 새로고침해주세요.";
            }
          } catch {
            if (uploadResponse.status === 401) {
              errorMessage = "로그인이 필요합니다. 페이지를 새로고침해주세요.";
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
          // 401 에러인 경우 전체 프로세스 중단
          if (uploadResponse.status === 401) {
            throw new Error("로그인이 필요합니다. 페이지를 새로고침해주세요.");
          }
          // 그 외 에러는 추가 이미지이므로 계속 진행
          continue;
        }

        const uploadJson =
          (await uploadResponse.json()) as UploadImageResponse;
        const url = uploadJson.url ?? uploadJson.data?.url;
        if (url) {
          extraImageUrls.push(url);
        }
      }

      // If category is "기타", use customCategory; otherwise use the selected category
      const finalCategory = category === "기타" ? customCategory.trim() : category;
      
      // 규칙: missionId가 있으면 반드시 미션 참여 기록 엔드포인트 사용
      // 이렇게 해야 missionId가 설정되어 개인 도감 기록에서 제외됨
      const endpoint = missionId
        ? `/api/guilds/${guildId}/missions/${missionId}/records`
        : `/api/guilds/${guildId}/records`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
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
          kakaoPlaceId: kakaoPlaceId || null, // 추천 장소 달성 기록인 경우
        }),
      });

      if (!response.ok) {
        let errorMessage = "저장에 실패했습니다.";
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.message || errorJson.error || errorMessage;
          
          // 특정 에러 코드에 대한 메시지 처리
          if (errorJson.error === "MISSION_FULL" || errorMessage.includes("끝난 미션")) {
            errorMessage = "아쉽지만 이미 끝난 미션입니다.";
          } else if (errorJson.error === "ALREADY_PARTICIPATED" || errorMessage.includes("이미 참여")) {
            errorMessage = "이미 참여한 미션입니다.";
          } else if (errorJson.error === "BAD_REQUEST") {
            errorMessage = errorJson.message || errorMessage;
          }
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
          errorMessage = "저장에 실패했습니다. 잠시 후 다시 시도해주세요.";
        }
        throw new Error(errorMessage);
      }

      const json = (await response.json()) as CreateGuildRecordResponse;

      if (!json.ok || !json.data) {
        let errorMessage = json.message || json.error || "저장에 실패했습니다.";
        
        // 특정 에러 코드에 대한 메시지 처리
        if (json.error === "MISSION_FULL" || errorMessage.includes("끝난 미션")) {
          errorMessage = "아쉽지만 이미 끝난 미션입니다.";
        } else if (json.error === "ALREADY_PARTICIPATED" || errorMessage.includes("이미 참여")) {
          errorMessage = "이미 참여한 미션입니다.";
        } else if (json.error === "BAD_REQUEST") {
          errorMessage = json.message || errorMessage;
          // 5분 미달 에러 메시지 처리
          if (errorMessage.includes("5분 이상 머물러야") || errorMessage.includes("10분 이상 머물러야")) {
            errorMessage = "해당 장소에서 최소 5분 이상 머물러야 기록을 작성할 수 있습니다.";
          }
        }
        
        throw new Error(errorMessage);
      }

      // 입력값 초기화
      setTitle("");
      setDesc("");
      setCategory("");
      setCustomCategory("");
      setRecordDate("");
      setRating(0);
      setContent("");
      // 기존 preview URL 정리
      if (mainImagePreview) {
        URL.revokeObjectURL(mainImagePreview);
      }
      extraImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      
      setHashtags([]);
      setTagInput("");
      setMainImageFile(null);
      setMainImagePreview(null);
      setExtraImageFiles([]);
      setExtraImagePreviews([]);

      // 생성된 기록 ID 전달
      const createdRecordId = json.data?.id;
      
      if (onSaveSuccess) {
        onSaveSuccess(createdRecordId);
      }

      onClose();
    } catch (error: any) {
      console.error("도감 기록 저장 실패", error);
      const errorMsg = error?.message || "기록 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      setErrorMessage(errorMsg);
      
      // 미션 마감 에러인 경우 toast 표시
      if (errorMsg.includes("끝난 미션")) {
        toast.error("아쉽지만 이미 끝난 미션입니다.");
      }
      
      // 에러 콜백 호출
      if (onError) {
        onError(errorMsg);
      }
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
              {missionId ? "⚔️" : "📜"}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#f4d7aa] tracking-wide">
              {missionId ? "미션 후기 작성" : "연맹 도감 추가"}
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
            {/* 메인 이미지 업로드: 썸네일 미리보기 및 삭제 버튼 */}
            <div className="w-full md:w-64 h-52 md:h-64 flex-shrink-0">
              {mainImagePreview ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-[#6b4e2f] shadow-[0_8px_24px_rgba(0,0,0,0.5)] group bg-[#3a2818]">
                  <img
                    src={mainImagePreview}
                    alt="메인 이미지 미리보기"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {/* 삭제 버튼 - 추천 장소 기록인 경우 삭제 불가 */}
                  {!kakaoPlaceId && (
                    <button
                      type="button"
                      onClick={handleRemoveMainImage}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-sm font-bold shadow-lg"
                      title="삭제"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <label className={`w-full h-full flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-[#c9a961] bg-gradient-to-b from-[#4a3420] to-[#3a2818] transition-colors shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] ${
                  kakaoPlaceId ? "border-red-500 border-2" : "border-[#6b4e2f]"
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                    required={!!kakaoPlaceId} // 추천 장소 기록인 경우 필수
                  />
                  <div className="text-center text-[#d4a574]">
                    <div className="text-3xl mb-1">📷</div>
                    <div className="text-sm font-bold">
                      {kakaoPlaceId ? "표지 이미지 추가 (필수)" : "표지 이미지 추가"}
                    </div>
                    {kakaoPlaceId && (
                      <div className="text-xs text-red-400 mt-1">추천 장소 기록은 사진이 필수입니다</div>
                    )}
                  </div>
                </label>
              )}
            </div>

            {/* 제목과 설명 */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
                  도감 제목<span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="도감 제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  readOnly={!!kakaoPlaceId} // 추천 장소 기록인 경우 수정 불가
                  className={`w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] ${
                    kakaoPlaceId ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                />
              </div>
              <div>
                <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
                  도감 세부 정리
                </label>
                <input
                  type="text"
                  placeholder="도감 세부 정리"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                />
              </div>
            </div>
          </div>

          {/* 카테고리와 날짜 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
                도감 카테고리
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  // Reset custom category when switching away from "기타"
                  if (e.target.value !== "기타") {
                    setCustomCategory("");
                  }
                }}
                className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
              >
                <option value="">선택하세요</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              
              {/* Custom category input - shown only when "기타" is selected */}
              {category === "기타" && (
                <div className="mt-2">
                  <label className="block text-sm font-black text-[#d4a574] mb-1">
                    직접 입력 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="카테고리를 입력하세요"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      // Clear error when user starts typing
                      if (errorMessage && e.target.value.trim()) {
                        setErrorMessage(null);
                      }
                    }}
                    className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
                날짜
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="flex-1 border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                />
                <span className="text-2xl flex items-center justify-center text-[#d4a574]">
                  📅
                </span>
              </div>
            </div>
          </div>

          {/* 별점 */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-2 tracking-wide">
              별점
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl"
                >
                  {star <= rating ? "⭐" : "☆"}
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-[#d4a574] font-bold">
                  {rating}점
                </span>
              )}
            </div>
          </div>

          {/* 추가 사진: 최대 5개까지 업로드 가능, 썸네일 미리보기 및 개별 삭제 */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-2 tracking-wide">
              추가 사진 {extraImageFiles.length > 0 && `(${extraImageFiles.length}/5)`}
            </label>
            <div className="space-y-3">
              {/* 업로드된 이미지 썸네일 그리드 */}
              {extraImageFiles.length > 0 && (
                <div className="grid grid-cols-5 gap-3">
                  {extraImageFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-[#6b4e2f] shadow-[0_4px_16px_rgba(0,0,0,0.5)] group bg-[#3a2818]"
                    >
                      <img
                        src={extraImagePreviews[index]}
                        alt={`추가 이미지 ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      {/* 삭제 버튼 */}
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
              
              {/* 이미지 추가 버튼 (5개 미만일 때만 표시) */}
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

          {/* 도감 내용 */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-2 tracking-wide">
              도감 내용
            </label>
            <textarea
              placeholder="도감 후기를 작성해주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 h-32 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
            />
          </div>

          {/* 해시태그: 사용자 입력으로 추가, pill 형태로 표시, 개별 삭제 가능 */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-2 tracking-wide">
              해시 태그
            </label>
            <div className="space-y-3">
              {/* 태그 입력 필드: Enter 또는 쉼표로 추가 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="태그를 입력하고 Enter 또는 쉼표(,)를 누르세요"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  className="flex-1 border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  disabled={!tagInput.trim()}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-sm font-black text-white tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  추가
                </button>
              </div>
              
              {/* 추가된 태그 pill 목록 */}
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#4a3420] to-[#3a2818] border border-[#6b4e2f] px-3.5 py-1.5 text-sm font-bold text-[#d4a574] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[12px] text-[#8b6f47] hover:text-[#d4a574] hover:bg-[#6b4e2f]/50 rounded-full w-4.5 h-4.5 flex items-center justify-center transition"
                        title="삭제"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* 미리 정의된 태그 (선택 사항) */}
              <div className="pt-2 border-t border-stone-200">
                <p className="text-xs text-[#8b6f47] mb-2">추천 태그</p>
                <div className="flex flex-wrap gap-2">
                  {predefinedHashtags.map((tag) => {
                    const cleanTag = tag.startsWith("#") ? tag.slice(1) : tag;
                    const isSelected = hashtags.includes(cleanTag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePredefinedHashtag(tag)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${
                          isSelected
                            ? "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-[#c9a961]/30"
                            : "bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] border border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
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

          {/* 에러 메시지 */}
          {errorMessage && (
            <p className="text-sm text-red-400 font-bold">{errorMessage}</p>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#6b4e2f]">
            <button
              type="button"
              onClick={onClose}
              className="px-7 py-2.5 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] text-base font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-7 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-base font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

