import { useCallback, useEffect, useState } from "react";
import { acceptInviteApi, ApiError, verifyInviteApi } from "../../lib/api";

type Props = {
  token: string;
  onComplete: (email: string) => void;
};

function reasonMessage(reason: string | null | undefined): string {
  switch (reason) {
    case "EXPIRED":
      return "This invitation link has expired. Ask your admin to resend the invite.";
    case "USED":
      return "This invitation was already used. You can log in with your password.";
    case "NOT_FOUND":
    default:
      return "This invitation link is invalid. Check the link in your email or request a new invite.";
  }
}

export default function AcceptInvitationView({ token, onComplete }: Props) {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const verify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verifyInviteApi(token);
      setValid(res.valid);
      setReason(res.reason ?? null);
      setEmail(res.email ?? "");
      setFullName(res.fullName ?? "");
    } catch (e) {
      setValid(false);
      setReason("NOT_FOUND");
      setError(e instanceof ApiError ? e.message : "Could not verify invitation");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void verify();
  }, [verify]);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await acceptInviteApi(token, password, confirmPassword);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not set password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="view-accept-invite" className="view active">
      <div className="login-bg" />
      <div className="login-card">
        <div className="mark">REVAAH</div>
        <div className="mark-sub">decor · atelier</div>
        <h1 className="serif">Welcome to the team</h1>

        {loading && <p>Checking your invitation…</p>}

        {!loading && !valid && !success && (
          <>
            <p style={{ color: "#b03b3b" }}>{reasonMessage(reason)}</p>
            {error && <p style={{ color: "#b03b3b", fontSize: 11 }}>{error}</p>}
            <button type="button" className="btn-primary" onClick={() => onComplete("")}>
              Go to login
            </button>
          </>
        )}

        {!loading && valid && !success && (
          <>
            <p>
              {fullName ? (
                <>
                  Hi <strong>{fullName}</strong>, set a password for <strong>{email}</strong> to activate
                  your account.
                </>
              ) : (
                <>Set a password to activate your account.</>
              )}
            </p>
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
            <button type="button" className="btn-primary" onClick={() => void submit()} disabled={submitting}>
              {submitting ? "Saving…" : "Set password & activate"}
            </button>
            {error && (
              <div style={{ marginTop: 18, fontSize: 11, color: "#b03b3b" }}>{error}</div>
            )}
          </>
        )}

        {success && (
          <>
            <p style={{ color: "#2d6a4f" }}>
              Your account is active. You can now log in with <strong>{email}</strong>.
            </p>
            <button type="button" className="btn-primary" onClick={() => onComplete(email)}>
              Go to login
            </button>
          </>
        )}
      </div>
    </section>
  );
}
