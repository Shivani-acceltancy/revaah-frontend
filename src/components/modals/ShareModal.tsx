import { useEffect, useMemo, useState } from "react";

export type ShareProjectContext = {
  title: string;
  imageCount: number;
  videoCount: number;
  projectId?: string;
};

type Props = {
  open: boolean;
  project?: ShareProjectContext | null;
  onClose: () => void;
  onPreviewClient: () => void;
};

type ExpiryOption = "48h" | "7d" | "14d" | "30d" | "custom";

function makeToken(): string {
  const chunk = () =>
    Math.random().toString(36).slice(2, 5).toUpperCase() +
    Math.random().toString(36).slice(2, 3);
  return `${chunk()}-${chunk()}-${chunk()}`;
}

function formatExpiryLabel(expiry: ExpiryOption, customDate: string): string {
  const now = new Date();
  if (expiry === "custom" && customDate) {
    const d = new Date(customDate);
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
  const end = new Date(now);
  if (expiry === "48h") end.setHours(end.getHours() + 48);
  else if (expiry === "7d") end.setDate(end.getDate() + 7);
  else if (expiry === "14d") end.setDate(end.getDate() + 14);
  else end.setDate(end.getDate() + 30);
  return end.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function ShareModal({ open, project, onClose, onPreviewClient }: Props) {
  const [clientName, setClientName] = useState("Ananya Mehta");
  const [email, setEmail] = useState("ananya@mehtagroup.in");
  const [mobile, setMobile] = useState("+91 98••• ••342");
  const [expiresAfter, setExpiresAfter] = useState<ExpiryOption>("7d");
  const [customExpiryDate, setCustomExpiryDate] = useState("");
  const [maxViews, setMaxViews] = useState("20");
  const [generatedLink, setGeneratedLink] = useState("");
  const [expiryLabel, setExpiryLabel] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGeneratedLink("");
    setExpiryLabel("");
    setCopied(false);
  }, [open, project?.projectId]);

  const summary = useMemo(() => {
    const title = project?.title?.trim() || "Project";
    const images = project?.imageCount ?? 0;
    const videos = project?.videoCount ?? 0;
    const parts = [`${images} image${images === 1 ? "" : "s"}`, `${videos} video${videos === 1 ? "" : "s"}`];
    return `${title} · ${parts.join(" · ")}`;
  }, [project]);

  const minCustomDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const maxCustomDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  if (!open) return null;

  const generateLink = async () => {
    if (expiresAfter === "custom" && !customExpiryDate) {
      alert("Please select a custom expiry date.");
      return;
    }
    const token = makeToken();
    const link = `https://atelier.revaahdecor.in/c/${token}`;
    const label = formatExpiryLabel(expiresAfter, customExpiryDate);
    setGeneratedLink(link);
    setExpiryLabel(label);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const copyAgain = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div id="modal" className="modal-veil show">
      <div className="modal">
        <button type="button" className="x" onClick={onClose}>
          ✕
        </button>
        <div className="eyebrow">Generate Client Link</div>
        <h2 className="serif">Share with care.</h2>
        <p className="desc">{summary}</p>

        <div className="field">
          <label>Client name</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Mobile</label>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Expires after</label>
            <select
              value={expiresAfter}
              onChange={(e) => setExpiresAfter(e.target.value as ExpiryOption)}
            >
              <option value="48h">48 hours</option>
              <option value="7d">7 days</option>
              <option value="14d">14 days</option>
              <option value="30d">30 days</option>
              <option value="custom">Until meeting (custom)</option>
            </select>
          </div>
          <div className="field">
            <label>Max views</label>
            <select value={maxViews} onChange={(e) => setMaxViews(e.target.value)}>
              <option value="unlimited">Unlimited</option>
              <option value="20">20 views</option>
              <option value="10">10 views</option>
              <option value="5">5 views</option>
            </select>
          </div>
        </div>

        {expiresAfter === "custom" && (
          <div className="field share-custom-date">
            <label>Custom expiry date</label>
            <input
              type="date"
              value={customExpiryDate}
              min={minCustomDate}
              max={maxCustomDate}
              onChange={(e) => setCustomExpiryDate(e.target.value)}
            />
            <p className="desc" style={{ marginTop: 8 }}>
              Select a date within the next month.
            </p>
          </div>
        )}

        <button
          type="button"
          className="btn-primary share-generate-btn"
          onClick={() => void generateLink()}
        >
          Generate Secure Link
        </button>

        {generatedLink && (
          <div id="gen-result" className="gen-result show">
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Link ready · expires {expiryLabel}
            </div>
            <div className="link-row">
              <div className="link">{generatedLink}</div>
              <button type="button" className="btn-outline share-copy-btn" onClick={() => void copyAgain()}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="info">
              {copied ? "Copied to clipboard · " : "Click copy to copy link · "}
              <button
                type="button"
                className="share-preview-link"
                onClick={onPreviewClient}
              >
                Preview client view →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
