import { useState } from "react";

/**
 * TasteRecordModal (새 기록 작성 모달)
 * ─────────────────────────────────────────────────────────
 * 목적: 사용자가 "새 기록"을 만들 때 필요한 정보를 입력받는 팝업입니다.
 *      (제목, 짧은 캡션, 카테고리, 태그, 상세 내용)
 *
 * 누가 읽으면 좋나?
 *  - 기획/디자인/QA 동료: 이 모달이 어떤 역할을 하고 어떤 값들을 다루는지 한눈에 파악할 수 있습니다.
 *
 * 화면 동작 요약
 *  1) 상위에서 `open=true`로 열면, 화면 중앙에 모달이 뜹니다.
 *  2) 사용자가 각 입력칸을 채웁니다. (카테고리/태그는 선택형)
 *  3) [저장하기]를 누르면, 현재는 콘솔 출력 + 알림만 띄우고 닫습니다. (※ 실제 저장 API는 나중에 붙입니다)
 *  4) [취소]를 누르면 모달을 닫습니다. (입력값은 리셋되지 않음: 설계 선택 사항)
 *
 * 데이터가 어디서 오고, 어디로 가나?
 *  - 카테고리/태그 옵션은 상위 컴포넌트에서 props로 내려줍니다.
 *  - 저장하기 버튼은 현재 API를 호출하지 않고, 추후 POST 연동을 위해 자리만 마련해두었습니다.
 *
 * 접근성(간단히)
 *  - 현재 role/aria 속성은 최소화되어 있습니다. 접근성 향상이 필요하면 aria-*를 추가할 수 있습니다.
 *
 * 확장 포인트 (향후 계획)
 *  - 저장 시 실제 API 연동(POST) 추가, 성공/실패 처리, 로딩/에러 상태 표시
 *  - 필수값 검증(제목/카테고리 등) 및 입력 길이 제한, 자동 저장(임시 저장)
 *  - 사진/파일 첨부, 리치 텍스트 편집기 등 입력 UI 확장
 */
export default function TasteRecordModal({
  open,
  onClose,
  categoryOptions,
  tagOptions,
}: {
  open: boolean;            // 모달 열림 여부 (true=열림, false=닫힘)
  onClose: () => void;      // 모달 닫기 콜백 (상위에서 상태 변경)
  categoryOptions: string[]; // 드롭다운에 표시할 카테고리 목록
  tagOptions: string[];      // 체크박스로 표시할 태그 목록
}) {
  // ─────────────────────────────────────────────────────────
  // 입력 상태 정의 (사용자가 화면에서 채우는 값들)
  const [title, setTitle] = useState("");            // 제목
  const [caption, setCaption] = useState("");        // 짧은 캡션(부제)
  const [content, setContent] = useState("");        // 상세 내용(메모/설명)
  const [selectedCategory, setSelectedCategory] = useState(""); // 선택된 카테고리(단일)
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 선택된 태그(다중)

  // open=false면 화면에 아무것도 그리지 않음(모달 미노출)
  if (!open) return null;

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
          {/* 제목 입력칸: 필수값으로 쓸 가능성이 큼(현재는 검증 로직 없음) */}
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
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

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
                          : [...prev, t] // 없으면 추가
                      )
                    }
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* 상세 내용: 긴 텍스트 메모/설명 입력 */}
          <textarea
            placeholder="내용 작성"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-stone-300 rounded-md px-3 py-2 h-32"
          />
        </div>

        {/* 하단 액션 버튼 영역: 취소/저장 */}
        <div className="mt-6 flex justify-end gap-3">
          {/* 취소: 단순히 모달 닫기 (입력값 유지 여부는 상위 설계에 따름) */}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-stone-200 hover:bg-stone-300"
          >
            취소
          </button>

          {/* 저장: 현재는 API 없이 콘솔 출력 + 알림 → 모달 닫기 (연동 지점 표시) */}
          <button
            onClick={() => {
              // ✅ [연동 포인트] 실제 서비스 연결 시 여기에 POST 요청을 추가하세요.
              console.log({ title, caption, content, selectedCategory, selectedTags });
              alert("기록 저장 완료 (API 연결 예정)");
              onClose();
            }}
            className="px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}