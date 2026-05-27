import { useEffect } from "react";
import { WATERMARK_TEXT } from "../../lib/atelier";

const TILES = [
  {
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80",
    sub: "Mehendi · Forest Grove",
    title: "Marigold canopy at dusk",
  },
  {
    image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80",
    sub: "Sangeet · The Canopy",
    title: "Embroidered constellations",
  },
  {
    image: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80",
    sub: "Phera · Water's Edge",
    title: "Carved teak mandap",
  },
  {
    image: "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=1200&q=80",
    sub: "Reception · Brass & Wine",
    title: "The forest after midnight",
  },
];

export default function ClientView() {
  useEffect(() => {
    const wrap = document.querySelector(".cv-watermark-text");
    if (!wrap || wrap.childElementCount > 0) return;
    for (let i = 0; i < 24; i++) {
      const s = document.createElement("span");
      s.textContent = WATERMARK_TEXT;
      wrap.appendChild(s);
    }
  }, []);

  return (
    <section id="view-client" className="view active">
      <div className="cv-watermark-text" />

      <header className="cv-top">
        <div className="cv-brand">REVAAH</div>
        <div className="cv-shared">
          Shared with <b>Ananya Mehta</b> · expires 28 may 2026
        </div>
      </header>

      <section className="cv-hero">
        <div className="eyebrow">A private viewing · curated for the Mehta family</div>
        <h1 className="serif">Of Tigers & Twilight</h1>
        <p className="lede">
          A four-day celebration we created in the wilds of Ranthambore — a glimpse, in case it
          sparks something for your own world. With warmth, the Revaah atelier.
        </p>
      </section>

      <div className="cv-grid">
        {TILES.map((t) => (
          <div key={t.title} className="cv-tile" style={{ backgroundImage: `url('${t.image}')` }}>
            <div className="cap">
              <span className="sub">{t.sub}</span>
              {t.title}
            </div>
          </div>
        ))}
      </div>

      <div className="protect-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="11" width="16" height="10" rx="1" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        View only · do not capture
      </div>

      <footer className="cv-footer">
        <div>© Revaah Decor · all rights reserved</div>
        <div className="timer">
          Link expires in <b>6d 14h 32m</b>
        </div>
      </footer>
    </section>
  );
}
