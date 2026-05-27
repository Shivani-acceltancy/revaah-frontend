type Props = {
  open: boolean;
  resultVisible: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onPreviewClient: () => void;
};

export default function ShareModal({
  open,
  resultVisible,
  onClose,
  onGenerate,
  onPreviewClient,
}: Props) {
  if (!open) return null;

  return (
    <div id="modal" className="modal-veil show">
      <div className="modal">
        <button type="button" className="x" onClick={onClose}>
          ✕
        </button>
        <div className="eyebrow">Generate Client Link</div>
        <h2 className="serif">Share with care.</h2>
        <p className="desc">Of Tigers & Twilight · 36 images · 4 videos</p>

        <div className="field">
          <label>Client name</label>
          <input defaultValue="Ananya Mehta" />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Email</label>
            <input defaultValue="ananya@mehtagroup.in" />
          </div>
          <div className="field">
            <label>Mobile</label>
            <input defaultValue="+91 98••• ••342" />
          </div>
        </div>

        <div className="toggles">
          <div className="toggle">
            <div className="switch on" role="presentation" />
            <div>
              <b>Dynamic watermark</b> · <span className="desc">Client name + IP + timestamp</span>
            </div>
          </div>
          <div className="toggle">
            <div className="switch on" role="presentation" />
            <div>
              <b>Download disabled</b> · <span className="desc">View-only, right-click blocked</span>
            </div>
          </div>
        </div>

        <button type="button" className="btn-primary" style={{ background: "var(--wine)" }} onClick={onGenerate}>
          Generate Secure Link
        </button>

        <div id="gen-result" className={`gen-result${resultVisible ? " show" : ""}`}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Link ready · expires 28 May 2026, 21:00 IST
          </div>
          <div className="link">https://atelier.revaahdecor.in/c/9X2-fK8L-aR4n</div>
          <div className="info">
            Copied to clipboard ·{" "}
            <button
              type="button"
              style={{
                color: "var(--wine)",
                textDecoration: "underline",
                background: "none",
                border: 0,
                cursor: "pointer",
                font: "inherit",
              }}
              onClick={onPreviewClient}
            >
              Preview client view →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
