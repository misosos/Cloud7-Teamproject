// frontend/src/pages/AfterLogin/MyGuild.tsx

import { useState } from "react";
import { useGuildStatus } from "@/hooks/useGuildStatus";
import { createGuild } from "@/services/guildService";

export default function MyGuildPage() {
  const { loading, status, error } = useGuildStatus();

  // 연맹 생성 폼 상태
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [maxMembers, setMaxMembers] = useState<number | "">("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreateGuild(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      if (!name.trim()) {
        setCreateError("연맹 이름을 입력해 주세요.");
        setCreating(false);
        return;
      }

      const guild = await createGuild({
        name: name.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        rules: rules.trim() || undefined,
        maxMembers: typeof maxMembers === "number" ? maxMembers : undefined,
      });

      
      console.log("created guild:", guild);
      window.location.reload();
    } catch (err: any) {
      console.error("연맹 생성 에러:", err);
      console.error("에러 상세:", {
        message: err?.message,
        status: err?.status,
        data: err?.data,
        stack: err?.stack,
      });
      const errorMessage = 
        err?.data?.message || 
        err?.message || 
        "연맹 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setCreateError(errorMessage);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-lg">
        내 연맹 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <p className="text-red-500">내 연맹 정보를 불러오는 중 오류가 발생했어요.</p>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  // 아직 한 번도 연맹을 만들거나 가입하지 않은 상태
  if (!status || status.status === "NONE") {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-2">현재 가입한 연맹이 없습니다.</h1>
          <p className="text-gray-600">
            나만의 탐험가 연맹을 만들어서 다른 탐험가들을 모아보세요!
          </p>
        </div>

        {/* 연맹 만들기 폼 */}
        <form
          onSubmit={handleCreateGuild}
          className="space-y-4 bg-white/80 rounded-2xl shadow-md p-6 border border-amber-200"
        >
          <h2 className="text-xl font-semibold mb-2">새 연맹 만들기</h2>

          <div>
            <label className="block text-sm font-medium mb-1">
              연맹 이름<span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 야간 러닝 탐험가 연맹"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              카테고리
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예) 러닝, 보드게임, 스터디..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              연맹 설명
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="연맹 분위기, 모집 대상, 활동 시간대 등을 적어 주세요."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              연맹 규칙
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="연맹원들이 지켜야 할 규칙을 적어 주세요."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              제한 인원 (선택)
            </label>
            <input
              type="number"
              min={1}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={maxMembers}
              onChange={(e) =>
                setMaxMembers(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="예) 20"
            />
            <p className="text-xs text-gray-500 mt-1">
               지금은 아직 DB에 저장되진 않고, 나중에 Guild 스키마에 칼럼 추가하면서 연결하면 됨.
            </p>
          </div>

          {createError && (
            <p className="text-sm text-red-500">{createError}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2 rounded-lg transition"
          >
            {creating ? "연맹 만드는 중..." : "연맹 만들기"}
          </button>
        </form>
      </div>
    );
  }

  
  const guild = status.guild!;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">내 연맹</h1>
        <p className="text-gray-600 text-sm">
          지금 내가 속한 탐험가 연맹 정보입니다.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">{guild.name}</h2>
            {guild.category && (
              <p className="text-sm text-gray-600 mt-1">{guild.category}</p>
            )}
          </div>
          {/* 나중에 엠블럼 이미지 넣을 자리 */}
          
        </div>

        {guild.description && (
          <p className="text-sm text-gray-700 mb-4 whitespace-pre-line">
            {guild.description}
          </p>
        )}

        {guild.tags && guild.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {guild.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-amber-200/80 text-amber-900"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500">
          생성일: {new Date(guild.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}