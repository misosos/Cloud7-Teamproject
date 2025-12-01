// frontend/src/hooks/useGuildStatus.ts
// 내 연맹 상태를 불러오는 커스텀 훅

import { useCallback, useEffect, useState } from "react";
import {
  fetchMyGuildStatus,
  type MyGuildStatusResponse,
} from "@/services/guildService";

export function useGuildStatus() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MyGuildStatusResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyGuildStatus();
      setStatus(result);
    } catch (err) {
      console.error("Failed to load guild status:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loading, status, error, refetch };
}