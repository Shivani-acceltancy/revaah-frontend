import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchSystemStatus, type SystemStatus } from "../lib/api";

export function useApiStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchSystemStatus();
      setStatus(s);
      setApiConnected(true);
    } catch (e) {
      setApiConnected(false);
      setStatus({
        api: "down",
        database_ready: false,
        database_status: "API_UNREACHABLE",
        message:
          e instanceof ApiError
            ? e.message
            : "Backend not running. Start API on http://localhost:8081 (see .env VITE_API_PROXY_TARGET)",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  return { status, apiConnected, loading, refresh };
}
