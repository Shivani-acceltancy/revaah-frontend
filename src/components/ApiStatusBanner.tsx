import type { SystemStatus } from "../lib/api";

type Props = {
  status: SystemStatus | null;
  apiConnected: boolean;
};

export default function ApiStatusBanner({ status, apiConnected }: Props) {
  if (!status) return null;

  if (!apiConnected) {
    return (
      <div className="api-banner api-banner--error" role="status">
        API offline — {status.message}
      </div>
    );
  }

  if (!status.database_ready) {
    return (
      <div className="api-banner api-banner--warn" role="status">
        Connected to API · Database not ready — saves will <strong>not</strong> be stored.{" "}
        {status.message}
      </div>
    );
  }

  return (
    <div className="api-banner api-banner--ok" role="status">
      API connected · Database ready
    </div>
  );
}
