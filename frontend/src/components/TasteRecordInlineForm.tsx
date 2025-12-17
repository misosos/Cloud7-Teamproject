import { useState } from "react";
import type { TasteRecordItem } from "@/types/type";
import { buildUrl } from "@/api/apiClient";
import toast from "react-hot-toast";

/**
 * 취향 기록 작성 인라인 폼
 * ───────────────────────────────
 * 역할
 * - 제목/캡션/카테고리/태그/내용/이미지를 입력받아 새 취향 기록을 생성합니다.
 * - (선택) 이미지를 업로드한 뒤, 업로드된 URL을 thumb 필드로 함께 저장합니다.
 *
 * 요청 흐름
 * 1) 사용자가 입력값을 작성하고 [저장하기]를 누릅니다.
 * 2) 이미지가 있으면 `/uploads/taste-records` 상대 경로를 사용해 업로드합니다.
 *    (실제 엔드포인트는 API_BASE(`/api`)가 붙은 `/api/uploads/taste-records` 입니다.)
 * 3) 업로드된 이미지 URL과 함께 `/taste-records` 상대 경로로 POST 요청을 보냅니다.
 *    (실제 엔드포인트는 `/api/taste-records` 입니다.)
 * 4) 성공 시 onSaveSuccess 콜백으로 상위 컴포넌트에 생성된 기록을 전달합니다.
 *
 * 연동 포인트
 * - categoryOptions, tagOptions: 상위 컴포넌트에서 내려주는 선택 옵션
 * - onSaveSuccess(record): 저장 성공 후 목록 상태를 갱신할 때 사용
 */

// 인라인 작성 폼에서 사용할 props 타입 정의
interface TasteRecordModalProps {
  open: boolean; // 모달 열림 여부 (true=열림, false=닫힘)
  onClose: () => void; // 모달 닫기 콜백 (상위에서 상태 변경)
  categoryOptions: string[]; // 드롭다운에 표시할 카테고리 목록
  tagOptions: string[]; // 체크박스로 표시할 태그 목록
  /**
   * 저장 성공 시 호출되는 콜백
   * - 백엔드에서 방금 생성된 TasteRecordItem 전체를 내려줍니다.
   * - 부모 컴포넌트에서 목록 상태를 직접 갱신하거나, 다시 fetch하는 데 쓸 수 있습니다.
   */
  onSaveSuccess?: (record: TasteRecordItem) => void;
}

// 취향 기록 생성 API 응답 타입 (tasteRecords 라우트와 맞춤)
type CreateTasteRecordResponse = {
  ok: boolean;
  data: TasteRecordItem;
  error?: string;
};

// 취향 기록용 이미지 업로드 응답 타입
type UploadTasteImageResponse = {
  ok: boolean;
  /**
   * 업로드된 이미지 URL
   * - 백엔드 구현에 따라
   *   - `url` 필드로 직접 내려줄 수도 있고,
   *   - `data: { url: string }` 형태로 내려줄 수도 있어서 둘 다 지원합니다.
   */
  url?: string;
  data?: {
    url?: string;
  };
  error?: string;
};

export default function TasteRecordModal({
  open,
  onClose,
  categoryOptions,
  tagOptions,
  onSaveSuccess,
}: TasteRecordModalProps) {
  // ─────────────────────────────────────────────────────────
  // 입력 상태: 사용자가 작성하는 값들
  const [title, setTitle] = useState(""); // 제목
  const [caption, setCaption] = useState(""); // 짧은 캡션(부제)
  const [content, setContent] = useState(""); // 상세 내용(메모/설명)
  const [selectedCategory, setSelectedCategory] = useState(""); // 선택된 카테고리(단일)
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 선택된 태그(다중)
  const [recordDate, setRecordDate] = useState<string>(""); // 기록 날짜(YYYY-MM-DD)

  // 이미지 첨부 상태
  const [imageFile, setImageFile] = useState<File | null>(null); // 선택한 실제 이미지 파일
  const [imagePreview, setImagePreview] = useState<string | null>(null); // 미리보기용 URL

  // 진행 상태
  const [isSaving, setIsSaving] = useState(false); // 저장 요청 중 여부
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // 사용자에게 보여줄 에러 메시지

  // open=false일 때는 렌더링하지 않음
  if (!open) return null;

  // 파일 선택 핸들러 (이미지 첨부 + 미리보기)
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      // 파일이 선택되지 않은 경우(선택 후 취소 포함)
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    const file = files[0];
    setImageFile(file);

    // 미리보기용 URL 생성 (운영 환경에서는 revoke 고려)
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // 저장 버튼 클릭 시 호출
  const handleSave = async () => {
    // 이미 저장 중이면 중복 요청 방지
    if (isSaving) return;

    // 최소 필수값 검증
    if (!title.trim()) {
      setErrorMessage("제목을 입력해주세요.");
      return;
    }
    if (!selectedCategory) {
      setErrorMessage("카테고리를 선택해주세요.");
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      let thumbUrl: string | null = null;

      // 이미지가 선택된 경우, 먼저 업로드
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await fetch(buildUrl("/uploads/taste-records"), {
          method: "POST",
          credentials: "include", // 세션/쿠키 기반 인증 사용 시
          body: formData, // multipart/form-data는 브라우저가 자동으로 헤더 생성
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(errorText || "이미지 업로드에 실패했습니다.");
        }

        const uploadJson =
          (await uploadResponse.json()) as UploadTasteImageResponse;

        // 업로드 응답에서 URL 추출 (top-level `url` 또는 `data.url` 모두 지원)
        const uploadedUrl = uploadJson.url ?? uploadJson.data?.url;

        if (!uploadJson.ok || !uploadedUrl) {
          throw new Error(uploadJson.error || "이미지 업로드에 실패했습니다.");
        }

        thumbUrl = uploadedUrl;
      }

      // 실제 취향 기록 저장 API 호출
      const response = await fetch(buildUrl("/taste-records"), {
        method: "POST",
        credentials: "include", // 세션/쿠키 기반 인증 사용
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          caption,
          content,
          category: selectedCategory,
          tags: selectedTags,
          thumb: thumbUrl, // 이미지가 없다면 null, 있으면 업로드된 URL
          // 기록 날짜 (선택값, YYYY-MM-DD 문자열)
          date: recordDate || null,
        }),
      });

      if (!response.ok) {
        // 서버에서 에러를 보냈을 때 (예: 4xx/5xx)
        const errorText = await response.text();
        throw new Error(errorText || "저장에 실패했습니다.");
      }

      const json = (await response.json()) as CreateTasteRecordResponse;

      if (!json.ok || !json.data) {
        throw new Error(json.error || "저장에 실패했습니다.");
      }

      const createdRecord = json.data;

      // 상위 콜백이 있다면, 생성된 기록을 전달하여 목록을 갱신
      if (onSaveSuccess) {
        onSaveSuccess(createdRecord);
      }

      // 입력값 초기화
      setTitle("");
      setCaption("");
      setContent("");
      setSelectedCategory("");
      setSelectedTags([]);
      setImageFile(null);
      setImagePreview(null);

      toast.success("기록이 저장되었습니다.");
      onClose();
    } catch (error) {
      setErrorMessage(
        "기록 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 인라인 작성 폼 UI: 페이지 안에 카드 형태로 표시
  return (
    <section className="max-w-screen-xl mx-auto px-6 mt-8">
      {/* 작성 카드 박스 */}
      <div className="bg-gradient-to-b from-[#5a3e25] to-[#4a3420] w-full rounded-lg border-2 border-[#6b4e2f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)] p-6 relative overflow-hidden">
        {/* 금속 장식 테두리 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a961] to-transparent opacity-70" />
        
        {/* 헤더: 제목 + 닫기 버튼 */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b-2 border-[#6b4e2f]">
          <div className="flex items-center gap-2">
            <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">📝</span>
            <h2 className="text-xl sm:text-2xl font-black text-[#f4d7aa] tracking-wide">새 기록 추가</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative z-50 text-[#d4a574] hover:text-[#f4d7aa] hover:bg-[#6b4e2f]/60 rounded-full w-9 h-9 flex items-center justify-center transition text-lg font-black cursor-pointer active:scale-95 border border-[#6b4e2f]"
          >
            ×
          </button>
        </div>

        {/* 입력 폼 */}
        <div className="space-y-5">
          {/* 제목 입력칸 (필수) */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
              제목<span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
            />
          </div>

          {/* 짧은 캡션 */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
              짧은 캡션
            </label>
            <input
              type="text"
              placeholder="짧은 캡션을 입력하세요"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
            />
          </div>

          {/* 카테고리 선택 드롭다운 */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
              카테고리<span className="text-red-400 ml-1">*</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
            >
              <option value="" className="bg-[#4a3420] text-[#d4a574]">카테고리 선택</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c} className="bg-[#4a3420] text-[#d4a574]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 기록 날짜 선택 (실제 경험 날짜) */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-1 tracking-wide">
              기록 날짜
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
            <p className="mt-2 text-xs text-[#8b6f47] font-medium">
              실제로 이 경험을 했던 날짜가 있다면 선택해주세요. 비워두면 기본값으로 저장될 수 있습니다.
            </p>
          </div>

          {/* 태그 선택 (다중 선택 가능) */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-2 tracking-wide">
              태그 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(t)
                          ? prev.filter((v) => v !== t) // 이미 있으면 제거
                          : [...prev, t], // 없으면 추가
                      )
                    }
                    className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${
                      isSelected
                        ? "bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-[#c9a961]/30"
                        : "bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] border border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 이미지 첨부 (선택) */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-2 tracking-wide">
              사진 첨부
            </label>
            {imagePreview ? (
              <div className="relative w-full max-w-xs rounded-lg overflow-hidden border-2 border-[#6b4e2f] shadow-[0_8px_24px_rgba(0,0,0,0.5)] group bg-[#3a2818]">
                <img
                  src={imagePreview}
                  alt="첨부 이미지 미리보기"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-sm font-bold shadow-lg"
                  title="삭제"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center justify-center w-32 h-32 border-2 border-dashed border-[#6b4e2f] rounded-lg cursor-pointer hover:border-[#c9a961] bg-gradient-to-b from-[#4a3420] to-[#3a2818] transition-colors shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="text-center">
                  <div className="text-3xl mb-1 text-[#d4a574]">📷</div>
                  <div className="text-sm font-bold text-[#d4a574]">사진 추가</div>
                </div>
              </label>
            )}
          </div>

          {/* 상세 내용 입력 */}
          <div>
            <label className="block text-base font-black text-[#f4d7aa] mb-2 tracking-wide">
              상세 내용
            </label>
            <textarea
              placeholder="내용을 작성해주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border-2 border-[#6b4e2f] rounded-lg px-3 py-2.5 h-32 text-base bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] placeholder:text-[#8b6f47] focus:outline-none focus:ring-2 focus:ring-[#c9a961] focus:border-[#c9a961] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] resize-none"
            />
          </div>
        </div>

        {/* 저장 실패 시 에러 메시지 */}
        {errorMessage && (
          <div className="mt-5 rounded-lg bg-gradient-to-b from-[#4a1f1f] to-[#3a1818] border-2 border-red-600/50 px-4 py-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
            <p className="text-sm text-red-400 font-bold">{errorMessage}</p>
          </div>
        )}

        {/* 하단 액션 버튼: 취소 / 저장 */}
        <div className="mt-6 pt-4 flex justify-end gap-3 border-t-2 border-[#6b4e2f]">
          {/* 취소 버튼 */}
          <button
            onClick={onClose}
            className="px-7 py-2.5 rounded-lg bg-gradient-to-b from-[#4a3420] to-[#3a2818] text-[#d4a574] text-base font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border-2 border-[#6b4e2f] hover:from-[#5a4430] hover:to-[#4a3828] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition"
          >
            취소
          </button>

          {/* 저장 버튼: API 호출 + 성공 시 콜백 호출 */}
          <button
            onClick={handleSave}
            className="px-7 py-2.5 rounded-lg bg-gradient-to-b from-[#8b6f47] to-[#6b4e2f] text-white text-base font-black tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#c9a961]/30 hover:from-[#9b7f57] hover:to-[#7b5e3f] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </section>
  );
}