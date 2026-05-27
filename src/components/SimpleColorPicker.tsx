import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PRESET_COLORS: { hex: string; name: string }[] = [
  { hex: "#5C1A2B", name: "Burgundy" },
  { hex: "#8B2635", name: "Wine red" },
  { hex: "#B8893A", name: "Gold" },
  { hex: "#D4A84B", name: "Champagne" },
  { hex: "#3E4A2B", name: "Forest green" },
  { hex: "#E8C8B8", name: "Blush" },
  { hex: "#2A2017", name: "Espresso" },
  { hex: "#1A1A1A", name: "Black" },
];

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + hh / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return { h: 0, s: 70, l: 45 };
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (hex: string) => void;
  title?: string;
  initialHex?: string;
};

export default function SimpleColorPicker({
  open,
  onClose,
  onPick,
  title = "Pick a colour",
  initialHex,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const slRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const draggingSl = useRef(false);
  const draggingHue = useRef(false);

  const [hue, setHue] = useState(350);
  const [sat, setSat] = useState(65);
  const [light, setLight] = useState(40);

  const currentHex = useMemo(() => hslToHex(hue, sat, light), [hue, sat, light]);

  useEffect(() => {
    if (!open) return;
    if (initialHex) {
      const { h, s, l } = hexToHsl(initialHex);
      setHue(h);
      setSat(s);
      setLight(l);
    } else {
      setHue(350);
      setSat(65);
      setLight(40);
    }
  }, [open, initialHex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = window.setTimeout(() => document.addEventListener("mousedown", onPointer), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, onClose]);

  const pickFromSl = useCallback((clientX: number, clientY: number) => {
    const rect = slRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setSat(Math.round(x * 100));
    setLight(Math.round((1 - y) * 100));
  }, []);

  const pickFromHue = useCallback((clientX: number) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHue(Math.round(x * 360));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingSl.current) pickFromSl(e.clientX, e.clientY);
      if (draggingHue.current) pickFromHue(e.clientX);
    };
    const onUp = () => {
      draggingSl.current = false;
      draggingHue.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [pickFromSl, pickFromHue]);

  const applyColor = () => {
    onPick(currentHex);
    onClose();
  };

  if (!open) return null;

  const slCursorLeft = `${sat}%`;
  const slCursorTop = `${100 - light}%`;
  const hueThumbLeft = `${(hue / 360) * 100}%`;

  return (
    <div className="color-picker-backdrop" role="presentation">
      <div
        ref={panelRef}
        className="color-picker-panel color-picker-panel--full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-picker-title"
      >
        <h3 id="color-picker-title" className="color-picker-title">
          {title}
        </h3>
        <p className="color-picker-hint">Slide on the rainbow, then tap the big square for light or dark shades.</p>

        <div className="color-picker-mix">
          <div
            className="color-picker-preview"
            style={{ background: currentHex }}
            aria-hidden
          />
          <div className="color-picker-mix-controls">
            <div
              ref={hueRef}
              className="color-picker-hue"
              role="slider"
              aria-label="Colour type"
              aria-valuenow={hue}
              onPointerDown={(e) => {
                draggingHue.current = true;
                hueRef.current?.setPointerCapture(e.pointerId);
                pickFromHue(e.clientX);
              }}
            >
              <span className="color-picker-hue-thumb" style={{ left: hueThumbLeft }} />
            </div>
            <div
              ref={slRef}
              className="color-picker-sl"
              style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
              role="slider"
              aria-label="Shade"
              onPointerDown={(e) => {
                draggingSl.current = true;
                slRef.current?.setPointerCapture(e.pointerId);
                pickFromSl(e.clientX, e.clientY);
              }}
            >
              <span
                className="color-picker-sl-cursor"
                style={{ left: slCursorLeft, top: slCursorTop, background: currentHex }}
              />
            </div>
          </div>
        </div>

        <button type="button" className="color-picker-use" onClick={applyColor}>
          Use this colour
        </button>

        <div className="color-picker-divider">
          <span>Or quick picks</span>
        </div>
        <div className="color-picker-grid color-picker-grid--compact">
          {PRESET_COLORS.map(({ hex, name }) => (
            <button
              key={hex}
              type="button"
              className={`color-picker-swatch${hex === "#FAF6F0" || hex === "#F5E6D8" ? " light" : ""}`}
              style={{ background: hex }}
              title={name}
              aria-label={name}
              onClick={() => {
                onPick(hex);
                onClose();
              }}
            />
          ))}
        </div>

        <button type="button" className="color-picker-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
