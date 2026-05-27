import { useState } from "react";
import { ApiError, inviteUserApi } from "../../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  apiConnected: boolean;
  databaseReady: boolean;
};

const ROLE_MAP = {
  owner: "OWNER",
  curator: "CURATOR",
  member: "MEMBER",
} as const;

const DEPT_MAP: Record<string, string> = {
  decor: "Decor & styling",
  florals: "Florals",
};

export default function InviteModal({ open, onClose, onSuccess, apiConnected, databaseReady }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<keyof typeof ROLE_MAP>("curator");
  const [department, setDepartment] = useState("decor");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const canSend = apiConnected && databaseReady && !sending;

  async function handleSend() {
    if (!apiConnected) {
      setError(
        "API is offline. Start the backend on port 8081 (see README), then try again.",
      );
      return;
    }
    if (!databaseReady) {
      setError("Database is not ready. Invites cannot be saved until the DB is connected.");
      return;
    }
    setError(null);
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError("Full name and work email are required.");
      return;
    }

    setSending(true);
    try {
      const res = await inviteUserApi({
        email: trimmedEmail,
        fullName: trimmedName,
        role: ROLE_MAP[role],
        department: DEPT_MAP[department],
      });

      onClose();
      onSuccess?.();
      if (res.data.emailSent) {
        alert(`Invitation email sent to ${trimmedEmail}`);
      } else {
        alert(
          `Invite created for ${trimmedEmail}, but email was not sent.\n\n` +
            "Configure SMTP on the backend (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD) " +
            "or check server logs for the invite link in dev simulate mode."
        );
      }
      setFullName("");
      setEmail("");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not send invitation";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div id="invite-modal" className="modal-veil show">
      <div className="modal">
        <button type="button" className="x" onClick={onClose} disabled={sending}>
          ✕
        </button>
        <div className="eyebrow">Invite to Atelier</div>
        <h2 className="serif">Welcome someone in.</h2>
        <p className="desc">
          They&apos;ll receive an email with a single-use link. Set up takes them about 90 seconds.
        </p>

        {!apiConnected ? (
          <p className="desc" style={{ color: "var(--wine)", marginBottom: "1rem" }}>
            API offline — start backend:{" "}
            <code style={{ fontSize: "11px" }}>cd &quot;revaah project backend&quot; &amp;&amp; mvn spring-boot:run</code>
          </p>
        ) : null}
        {apiConnected && !databaseReady ? (
          <p className="desc" style={{ color: "var(--wine)", marginBottom: "1rem" }}>
            API is up but the database is not ready. Check DB connection in the backend <code>.env</code>.
          </p>
        ) : null}
        {error ? (
          <p className="desc" style={{ color: "var(--wine)", marginBottom: "1rem" }}>
            {error}
          </p>
        ) : null}

        <div className="form-row">
          <div className="form-field">
            <label>Full name</label>
            <input
              placeholder="e.g. Tanya Mehrotra"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={sending}
            />
          </div>
          <div className="form-field">
            <label>Work email</label>
            <input
              type="email"
              placeholder="name@revaahdecor.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as keyof typeof ROLE_MAP)}
              disabled={sending}
            >
              <option value="owner">Owner — full access, invite & manage team</option>
              <option value="curator">Curator — upload, edit, share</option>
              <option value="member">Member — browse & share with approval</option>
            </select>
          </div>
          <div className="form-field">
            <label>Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={sending}
            >
              <option value="decor">Decor & styling</option>
              <option value="florals">Florals</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          style={{ background: "var(--wine)" }}
          onClick={() => void handleSend()}
          disabled={!canSend}
        >
          {sending ? "Sending…" : "Send invitation"}
        </button>
      </div>
    </div>
  );
}
