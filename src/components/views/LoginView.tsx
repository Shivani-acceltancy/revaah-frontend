import { useState } from "react";

type Props = {
  loginError: string | null;
  dbReady: boolean | null;
  initialEmail?: string;
  successMessage?: string | null;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onClearError: () => void;
};

export default function LoginView({
  loginError,
  dbReady,
  initialEmail = "",
  successMessage,
  onLogin,
  onClearError,
}: Props) {
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    await onLogin(email, password);
    setSubmitting(false);
  };

  return (
    <section id="view-login" className="view active">
      <div className="login-bg" />
      <div className="login-card">
        <div className="mark">REVAAH</div>
        <div className="mark-sub">decor · atelier</div>
        <h1 className="serif">Atelier Access</h1>
        <p>Internal portfolio. Authorised members only.</p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onClearError();
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="passphrase">Password</label>
          <input
            id="passphrase"
            type="password"
            placeholder="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              onClearError();
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>
          {submitting ? "Connecting…" : "Enter the Atelier"}
        </button>
        {successMessage && (
          <div style={{ marginTop: 18, fontSize: 11, color: "#2d6a4f", letterSpacing: ".1em" }}>
            {successMessage}
          </div>
        )}
        {loginError && (
          <div
            style={{
              marginTop: 18,
              fontSize: 11,
              color: "#b03b3b",
              letterSpacing: ".1em",
            }}
          >
            {loginError}
          </div>
        )}
        {dbReady === false && (
          <div style={{ marginTop: 16, fontSize: 11, color: "#7a5a12" }}>
            API connected · Database not ready — login will use preview mode (no data saved).
          </div>
        )}
        <div className="login-foot">Backend: /v1 via Vite proxy · port 8080</div>
      </div>
    </section>
  );
}
