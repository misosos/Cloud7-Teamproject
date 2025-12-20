import { useState } from "react";
import type { TasteRecordItem } from "@/types/type";
import { buildUrl } from "@/api/apiClient";
import toast from "react-hot-toast";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenNib,
  faXmark,
  faCamera,
  faTrash,
  faHashtag,
  faFloppyDisk,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

/**
 * 취향 기록 작성 인라인 폼
 * - Warm Oak 토큰 적용
 * - 이모지 → FontAwesome로 통일
 * - (중요) 이미지 미리보기 URL revoke 처리
 */

// =========================
// Warm Oak Theme Tokens
// =========================
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const DANGER = "#B42318";

// 인라인 작성 폼에서 사용할 props 타입 정의
interface TasteRecordModalProps {
  open: boolean;
  onClose: () => void;
  categoryOptions: string[];
  tagOptions: string[];
  onSaveSuccess?: (record: TasteRecordItem) => void;
}

type CreateTasteRecordResponse = {
  ok: boolean;
  data: TasteRecordItem;
  error?: string;
};

type UploadTasteImageResponse = {
  ok: boolean;
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
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [recordDate, setRecordDate] = useState<string>("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    const file = files[0];
    setImageFile(file);

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSave = async () => {
    if (isSaving) return;

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

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await fetch(buildUrl("/uploads/taste-records"), {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(errorText || "이미지 업로드에 실패했습니다.");
        }

        const uploadJson = (await uploadResponse.json()) as UploadTasteImageResponse;
        const uploadedUrl = uploadJson.url ?? uploadJson.data?.url;

        if (!uploadJson.ok || !uploadedUrl) {
          throw new Error(uploadJson.error || "이미지 업로드에 실패했습니다.");
        }

        thumbUrl = uploadedUrl;
      }

      const response = await fetch(buildUrl("/taste-records"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          caption,
          content,
          category: selectedCategory,
          tags: selectedTags,
          thumb: thumbUrl,
          date: recordDate || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "저장에 실패했습니다.");
      }

      const json = (await response.json()) as CreateTasteRecordResponse;

      if (!json.ok || !json.data) {
        throw new Error(json.error || "저장에 실패했습니다.");
      }

      onSaveSuccess?.(json.data);

      setTitle("");
      setCaption("");
      setContent("");
      setSelectedCategory("");
      setSelectedTags([]);
      setRecordDate("");
      clearImage();

      toast.success("기록이 저장되었습니다.");
      onClose();
    } catch (error) {
      setErrorMessage("기록 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="max-w-screen-xl mx-auto px-6 mt-8">
      <div
        className="w-full rounded-3xl backdrop-blur-sm border shadow-[0_18px_36px_rgba(80,50,0,0.10)] p-6 relative overflow-hidden"
        style={{
          background: SURFACE,
          borderColor: "rgba(0,0,0,0.10)",
          color: TEXT,
        }}
      >
        {/* deco */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ backgroundImage: `linear-gradient(90deg, transparent, ${BRAND}99, transparent)` }}
        />
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl"
          style={{ background: `${BRAND}26` }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-28 w-72 h-72 rounded-full blur-3xl"
          style={{ background: `${MUTED}1A` }}
        />

        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b" style={{ borderColor: "rgba(0,0,0,0.10)" }}>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border"
              style={{ background: "rgba(255,255,255,0.40)", borderColor: `${BRAND}33` }}
            >
              <FontAwesomeIcon icon={faPenNib} style={{ color: BRAND2 }} />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: TEXT }}>
              새 기록 추가
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              inline-flex items-center justify-center
              w-10 h-10 rounded-2xl
              ring-1 ring-black/10
              shadow-[0_10px_22px_rgba(80,50,0,0.08)]
              transition-transform duration-200
              hover:-translate-y-0.5 active:translate-y-0
              outline-none focus:outline-none focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
            "
            style={{ background: "rgba(255,255,255,0.40)", color: MUTED }}
            aria-label="닫기"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* 폼 */}
        <div className="space-y-5">
          {/* 제목 */}
          <div>
            <label className="block text-base font-black mb-1" style={{ color: TEXT }}>
              제목<span style={{ color: DANGER }} className="ml-1">*</span>
            </label>
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-base border outline-none focus:ring-2"
              style={{
                background: "rgba(255,255,255,0.40)",
                borderColor: "rgba(0,0,0,0.10)",
                color: TEXT,
              }}
            />
          </div>

          {/* 캡션 */}
          <div>
            <label className="block text-base font-black mb-1" style={{ color: TEXT }}>
              짧은 캡션
            </label>
            <input
              type="text"
              placeholder="짧은 캡션을 입력하세요"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-base border outline-none focus:ring-2"
              style={{
                background: "rgba(255,255,255,0.40)",
                borderColor: "rgba(0,0,0,0.10)",
                color: TEXT,
              }}
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-base font-black mb-1" style={{ color: TEXT }}>
              카테고리<span style={{ color: DANGER }} className="ml-1">*</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-base border outline-none focus:ring-2"
              style={{
                background: "rgba(255,255,255,0.40)",
                borderColor: "rgba(0,0,0,0.10)",
                color: TEXT,
              }}
            >
              <option value="">카테고리 선택</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 날짜 */}
          <div>
            <label className="block text-base font-black mb-1" style={{ color: TEXT }}>
              기록 날짜
            </label>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2.5 text-base border outline-none focus:ring-2"
                style={{
                  background: "rgba(255,255,255,0.40)",
                  borderColor: "rgba(0,0,0,0.10)",
                  color: TEXT,
                }}
              />
            
            </div>

            <p className="mt-2 text-xs font-medium" style={{ color: MUTED }}>
              실제로 이 경험을 했던 날짜가 있다면 선택해주세요. 비워두면 기본값으로 저장될 수 있습니다.
            </p>
          </div>

          {/* 태그 */}
          <div>
            <label className="block text-base font-black mb-2" style={{ color: TEXT }}>
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
                        prev.includes(t) ? prev.filter((v) => v !== t) : [...prev, t],
                      )
                    }
                    className="
                      inline-flex items-center gap-2
                      px-3.5 py-1.5 rounded-full text-sm font-bold
                      border transition-transform duration-200
                      hover:-translate-y-0.5 active:translate-y-0
                      outline-none focus:outline-none focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
                    "
                    style={{
                      background: isSelected
                        ? `linear-gradient(180deg, ${BRAND2}, ${MUTED})`
                        : "rgba(255,255,255,0.40)",
                      color: isSelected ? "#ffffff" : TEXT,
                      borderColor: isSelected ? "rgba(201,169,97,0.30)" : "rgba(0,0,0,0.10)",
                      boxShadow: isSelected ? "0 12px 26px rgba(80,50,0,0.20)" : "0 10px 22px rgba(80,50,0,0.08)",
                    }}
                  >
                    <FontAwesomeIcon icon={faHashtag} className="text-[12px]" />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 이미지 */}
          <div>
            <label className="block text-base font-black mb-2" style={{ color: TEXT }}>
              사진 첨부
            </label>

            {imagePreview ? (
              <div
                className="relative w-full max-w-xs rounded-2xl overflow-hidden border shadow-[0_18px_36px_rgba(80,50,0,0.12)]"
                style={{ borderColor: "rgba(0,0,0,0.10)", background: "rgba(255,255,255,0.20)" }}
              >
                <img
                  src={imagePreview}
                  alt="첨부 이미지 미리보기"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="
                    absolute top-2 right-2
                    inline-flex items-center justify-center
                    w-9 h-9 rounded-2xl
                    ring-1 ring-black/10
                    shadow-[0_10px_22px_rgba(80,50,0,0.12)]
                    outline-none focus:outline-none focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
                    transition-transform duration-200
                    hover:-translate-y-0.5 active:translate-y-0
                  "
                  style={{
                    background: `linear-gradient(180deg, ${DANGER}, rgba(90,34,28,1))`,
                    color: "#ffe7e3",
                  }}
                  title="삭제"
                  aria-label="첨부 이미지 삭제"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            ) : (
              <label
                className="
                  inline-flex items-center justify-center
                  w-32 h-32 rounded-2xl cursor-pointer
                  border border-dashed
                  shadow-[0_10px_22px_rgba(80,50,0,0.08)]
                  transition-transform duration-200
                  hover:-translate-y-0.5 active:translate-y-0
                "
                style={{
                  background: "rgba(255,255,255,0.40)",
                  borderColor: "rgba(0,0,0,0.16)",
                  color: MUTED,
                }}
              >
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                <div className="text-center">
                  <div
                    className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border"
                    style={{ background: "rgba(255,255,255,0.40)", borderColor: `${BRAND}33` }}
                    aria-hidden="true"
                  >
                    <FontAwesomeIcon icon={faCamera} style={{ color: BRAND2 }} />
                  </div>
                  <div className="text-sm font-black" style={{ color: TEXT }}>
                    사진 추가
                  </div>
                  <div className="mt-1 text-[11px] font-medium" style={{ color: MUTED }}>
                    클릭해서 선택
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-base font-black mb-2" style={{ color: TEXT }}>
              상세 내용
            </label>
            <textarea
              placeholder="내용을 작성해주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 h-32 text-base border outline-none focus:ring-2 resize-none"
              style={{
                background: "rgba(255,255,255,0.40)",
                borderColor: "rgba(0,0,0,0.10)",
                color: TEXT,
              }}
            />
          </div>
        </div>

        {/* 에러 */}
        {errorMessage ? (
          <div
            className="mt-5 rounded-2xl px-4 py-3 border"
            style={{
              background: "rgba(180,35,24,0.06)",
              borderColor: "rgba(180,35,24,0.35)",
              color: DANGER,
            }}
          >
            <p className="text-sm font-bold">{errorMessage}</p>
          </div>
        ) : null}

        {/* 하단 버튼 */}
        <div className="mt-6 pt-4 flex justify-end gap-3 border-t" style={{ borderColor: "rgba(0,0,0,0.10)" }}>
          <button
            type="button"
            onClick={onClose}
            className="
              inline-flex items-center gap-2
              px-5 py-2.5 rounded-xl
              ring-1 ring-black/10
              shadow-[0_10px_22px_rgba(80,50,0,0.08)]
              transition-transform duration-200
              hover:-translate-y-0.5 active:translate-y-0
              outline-none focus:outline-none focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
            "
            style={{ background: "rgba(255,255,255,0.40)", color: MUTED }}
          >
            <FontAwesomeIcon icon={faBan} />
            취소
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="
              inline-flex items-center gap-2
              px-5 py-2.5 rounded-xl
              text-white font-extrabold
              ring-1 ring-black/10
              shadow-[0_12px_26px_rgba(80,50,0,0.20)]
              transition-transform duration-200
              hover:-translate-y-0.5 active:translate-y-0
              outline-none focus:outline-none focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            style={{ background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})` }}
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            {isSaving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </section>
  );
}