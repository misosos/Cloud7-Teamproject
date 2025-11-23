import { useState } from "react";
import type { TasteRecordItem } from "@/types/type";

/**
 * TasteRecordModal (새 기록 작성 모달)
 * ─────────────────────────────────────────────────────────
 * 목적: 사용자가 "새 기록"을 만들 때 필요한 정보를 입력받는 팝업입니다.
 *      (제목, 짧은 캡션, 카테고리, 태그, 상세 내용, 선택 이미지)
 *
 * 누가 읽으면 좋나?
 *  - 기획/디자인/QA 동료: 이 모달이 어떤 역할을 하고 어떤 값들을 다루는지 한눈에 파악할 수 있습니다.
 *
 * 화면 동작 요약
 *  1) 상위에서 `open=true`로 열면, 화면 중앙에 모달이 뜹니다.
 *  2) 사용자가 각 입력칸을 채웁니다. (카테고리/태그는 선택형, 사진 첨부는 선택)
 *  3) [저장하기]를 누르면
 *      - (선택) 이미지가 있으면 먼저 `/api/uploads/taste-records`로 업로드 후
 *        업로드된 이미지 URL을 받아옵니다.
 *      - 이후 `/api/taste-records`로 POST 요청을 보내어 실제 저장 API를 호출합니다.
 *     - ✅ 저장 성공 시: 부모에서 내려준 onSaveSuccess 콜백을 호출해 목록 상태를 갱신할 수 있습니다.
 *  4) [취소]를 누르면 모달을 닫습니다. (입력값은 리셋되지 않음: 설계 선택 사항)
 *
 * 데이터가 어디서 오고, 어디로 가나?
 *  - 카테고리/태그 옵션은 상위 컴포넌트에서 props로 내려줍니다.
 *  - 저장하기 버튼은 /api/taste-records 엔드포인트로 POST 요청을 보내어 서버에 새 기록을 저장합니다.
 *  - 이미지가 있을 경우 /api/uploads/taste-records로 먼저 전송하고, 반환된 URL을 thumb 필드로 저장합니다.
 *
 * 접근성(간단히)
 *  - 현재 role/aria 속성은 최소화되어 있습니다. 접근성 향상이 필요하면 aria-*를 추가할 수 있습니다.
 *
 * 확장 포인트 (향후 계획)
 *  - 저장 시 추가적인 유효성 검증, 사용자 친화적인 성공/실패 피드백 UI, 로딩/에러 상태 고도화
 *  - 필수값 검증(제목/카테고리 등) 및 입력 길이 제한, 자동 저장(임시 저장)
 *  - 사진/파일 첨부 다중 업로드, 리치 텍스트 편집기 등 입력 UI 확장
 */

// 모달에서 사용할 props 타입 정의
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

// 서버 응답 타입(백엔드 tasteRecords.routes.ts의 응답 형태와 맞춤)
type CreateTasteRecordResponse = {
  ok: boolean;
  data: TasteRecordItem;
  error?: string;
};

// 이미지 업로드 응답 타입 (upload.routes.ts의 응답 형태에 맞춰 사용)
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
  // 입력 상태 정의 (사용자가 화면에서 채우는 값들)
  const [title, setTitle] = useState(""); // 제목
  const [caption, setCaption] = useState(""); // 짧은 캡션(부제)
  const [content, setContent] = useState(""); // 상세 내용(메모/설명)
  const [selectedCategory, setSelectedCategory] = useState(""); // 선택된 카테고리(단일)
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 선택된 태그(다중)
  /**
   * 기록 날짜 (YYYY-MM-DD)
   * - 사용자가 '언제의 기록인지' 직접 선택할 수 있는 날짜 값
   * - HTML input[type="date"]와 바인딩됩니다.
   * - 백엔드에는 문자열(예: "2025-11-23")로 전달되고, 서비스 레이어에서 Date로 변환해 저장합니다.
   */
  const [recordDate, setRecordDate] = useState<string>(""); // 기록 날짜

  // 이미지 첨부 관련 상태
  const [imageFile, setImageFile] = useState<File | null>(null); // 사용자가 선택한 실제 이미지 파일
  const [imagePreview, setImagePreview] = useState<string | null>(null); // 화면에 보여줄 미리보기 URL

  const [isSaving, setIsSaving] = useState(false); // 저장 요청 진행 여부
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // 저장 실패 시 에러 메시지

  // open=false면 화면에 아무것도 그리지 않음(모달 미노출)
  if (!open) return null;

  // 파일 선택 핸들러 (이미지 첨부)
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      // 파일이 선택되지 않은 경우 (사용자가 선택 후 취소할 수도 있음)
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    const file = files[0];
    setImageFile(file);

    // 간단한 미리보기용 URL 생성 (실제 운영 시 메모리 누수 방지를 위해 revoke 고려)
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // 저장 버튼 클릭 핸들러
  const handleSave = async () => {
    // 이미 저장 중이면 중복 요청 방지
    if (isSaving) return;

    // 간단한 필수값 검증 (필요에 따라 확장 가능)
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

      // 1️⃣ 이미지가 선택된 경우, 먼저 업로드 API 호출
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

      // 2️⃣ 실제 취향 기록 저장 API 호출
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
          /**
           * 기록 날짜
           * - 프론트에서는 문자열(YYYY-MM-DD)로 전달
           * - 백엔드에서는 선택적으로 Date로 변환해 저장
           * - 사용자가 날짜를 선택하지 않으면 빈 문자열("")이므로,
           *   서비스에서 적절히 기본값(now) 처리하거나 null로 저장하도록 설계할 수 있습니다.
           */
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

      // ✅ 부모에서 내려준 콜백이 있다면, 방금 생성된 기록을 넘겨서 목록을 갱신할 수 있게 함
      if (onSaveSuccess) {
        onSaveSuccess(createdRecord);
      }

      // 필요 시 입력값 초기화
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
  // 모달 전체 래퍼: 화면 전체를 덮는 어두운 배경 + 중앙 정렬
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      {/* 모달 카드: 흰 배경 박스 (크기/둥근 모서리/그림자) */}
      <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-xl">
        {/* 모달 제목 */}
        <h2 className="text-xl font-semibold text-stone-800">새 기록 추가</h2>

        {/* 입력 폼 영역 */}
        <div className="mt-4 space-y-4">
          {/* 제목 입력칸: 필수값으로 사용 (위에서 간단 검증) */}
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
          />

          {/* 짧은 캡션: 카드/리스트에서 요약으로 쓰일 수 있음 */}
          <input
            type="text"
            placeholder="짧은 캡션"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
          />

          {/* 카테고리 선택 드롭다운: 상위에서 내려준 옵션 목록으로 구성 */}
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

          {/* 기록 날짜 선택: 이 경험이 실제로 있었던 날짜 */}
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

          {/* 태그 선택: 여러 개를 동시에 선택할 수 있는 체크박스 그룹 */}
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

          {/* 이미지 첨부: 선택 사항 */}
          <div>
            <p className="text-sm text-stone-700 mb-1">사진 첨부 (선택)</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-stone-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
            />
            {imagePreview && (
              <div className="mt-3">
                <p className="text-xs text-stone-500 mb-1">미리보기</p>
                <img
                  src={imagePreview}
                  alt="첨부 이미지 미리보기"
                  className="w-full h-32 object-cover rounded-md border border-stone-200"
                />
              </div>
            )}
          </div>

          {/* 상세 내용: 긴 텍스트 메모/설명 입력 */}
          <textarea
            placeholder="내용 작성"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-stone-300 rounded-md px-3 py-2 h-32"
          />
        </div>

        {/* 저장 실패 시 사용자에게 보여줄 에러 메시지 */}
        {errorMessage && (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        )}

        {/* 하단 액션 버튼 영역: 취소/저장 */}
        <div className="mt-6 flex justify-end gap-3">
          {/* 취소: 단순히 모달 닫기 (입력값 유지 여부는 상위 설계에 따름) */}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-stone-200 hover:bg-stone-300"
          >
            취소
          </button>

          {/* 저장: 실제 API 호출 + 저장 성공 시 부모 콜백 호출 */}
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}