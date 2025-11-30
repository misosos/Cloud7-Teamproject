import { useState } from "react";
import type { TasteRecordItem } from "@/types/type";

/**
 * 취향 기록 작성 인라인 폼
 * ───────────────────────────────
 * 역할
 * - 제목/캡션/카테고리/태그/내용/이미지를 입력받아 새 취향 기록을 생성합니다.
 * - (선택) 이미지를 업로드한 뒤, 업로드된 URL을 thumb 필드로 함께 저장합니다.
 *
 * 요청 흐름
 * 1) 사용자가 입력값을 작성하고 [저장하기]를 누릅니다.
 * 2) 이미지가 있으면 `/api/uploads/taste-records`로 업로드합니다.
 * 3) 업로드된 이미지 URL과 함께 `/api/taste-records`에 POST 요청을 보냅니다.
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

        const uploadResponse = await fetch("/api/uploads/taste-records", {
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
      const response = await fetch("/api/taste-records", {
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

      alert("기록이 저장되었습니다.");
      onClose();
    } catch (error) {
      console.error("맛 기록 저장 실패", error);
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
      <div className="bg-white w-full rounded-xl border border-stone-200 shadow-md p-6">
        {/* 헤더: 제목 + 닫기 버튼 */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-800">새 기록 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md border border-stone-300 text-stone-500 hover:bg-stone-100"
          >
            닫기
          </button>
        </div>

        {/* 입력 폼 */}
        <div className="mt-4 space-y-4">
          {/* 제목 입력칸 (필수) */}
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
          />

          {/* 짧은 캡션 */}
          <input
            type="text"
            placeholder="짧은 캡션"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
          />

          {/* 카테고리 선택 드롭다운 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
          >
            <option value="">카테고리 선택</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* 기록 날짜 선택 (실제 경험 날짜) */}
          <div>
            <p className="text-sm text-stone-700 mb-1">기록 날짜 선택 (선택)</p>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full border border-stone-300 rounded-md px-3 py-2"
            />
            <p className="mt-1 text-xs text-stone-500">
              실제로 이 경험을 했던 날짜가 있다면 선택해주세요. 비워두면 기본값으로 저장될 수 있습니다.
            </p>
          </div>

          {/* 태그 선택 (다중 선택 가능) */}
          <div>
            <p className="text-sm text-stone-700 mb-1">태그 선택</p>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((t) => (
                <label key={t} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(t)}
                    onChange={() =>
                      setSelectedTags((prev) =>
                        prev.includes(t)
                          ? prev.filter((v) => v !== t) // 이미 있으면 제거
                          : [...prev, t], // 없으면 추가
                      )
                    }
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* 이미지 첨부 (선택) */}
          <div>
            <p className="text-sm text-stone-700 mb-1">사진 첨부 (선택)</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-stone-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
            />
            {imagePreview && (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-20 h-20 rounded-md overflow-hidden border border-stone-200 bg-stone-50">
                  <img
                    src={imagePreview}
                    alt="첨부 이미지 미리보기"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-stone-500">
                  미리보기 (썸네일 크기로 표시됩니다)
                </p>
              </div>
            )}
          </div>

          {/* 상세 내용 입력 */}
          <textarea
            placeholder="내용 작성"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-stone-300 rounded-md px-3 py-2 h-32"
          />
        </div>

        {/* 저장 실패 시 에러 메시지 */}
        {errorMessage && (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        )}

        {/* 하단 액션 버튼: 취소 / 저장 */}
        <div className="mt-6 flex justify-end gap-3">
          {/* 취소 버튼 */}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-stone-200 hover:bg-stone-300"
          >
            취소
          </button>

          {/* 저장 버튼: API 호출 + 성공 시 콜백 호출 */}
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </section>
  );
}