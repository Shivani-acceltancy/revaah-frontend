import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchSystemStatus, type SystemStatus } from "../lib/api";

export function useApiStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const consecutiveFailuresRef = useRef(0);
  const hadSuccessfulPingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    try {
      const s = await fetchSystemStatus();
      setStatus(s);
      setApiConnected(true);
      consecutiveFailuresRef.current = 0;
      hadSuccessfulPingRef.current = true;
    } catch (e) {
      const nextFailures = consecutiveFailuresRef.current + 1;
      consecutiveFailuresRef.current = nextFailures;

      // Avoid noisy "API offline" flashes on brief proxy/network hiccups.
      if (hadSuccessfulPingRef.current && nextFailures < 3) {
        setApiConnected(true);
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                message: "Connection is slow. Retrying…",
              }
            : prev,
        );
      } else {
        setApiConnected(false);
        setStatus({
          api: "down",
          database_ready: false,
          database_status: "API_UNREACHABLE",
          message:
            e instanceof ApiError
              ? e.message
              : "Backend not running. Start API and retry.",
        });
      }
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, apiConnected, loading, refresh };
}
