import type { SessionUser } from "../../hooks/useAtelier";
import type { LibraryMode } from "../../hooks/useAtelier";
import type { AtelierView } from "../../lib/atelier";
import { canCreateProjects, isOwner } from "../../lib/roles";

type Props = {
  onNavigate: (view: AtelierView) => void;
  onShowLibrary: (mode: LibraryMode) => void;
  libraryMode: LibraryMode;
  onLogout: () => void;
  currentUser?: SessionUser | null;
};

function initials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function TopBar({ onNavigate, onShowLibrary, libraryMode, onLogout, currentUser }: Props) {
  const role = currentUser?.role;
  const owner = isOwner(role);
  const creator = canCreateProjects(role);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">REVAAH</div>
        <nav className="nav">
          <a
            href="#"
            className={libraryMode === "atelier" ? "on" : ""}
            onClick={(e) => {
              e.preventDefault();
              onShowLibrary("atelier");
            }}
          >
            Atelier
          </a>
          <a
            href="#"
            className={libraryMode === "moodboard" ? "on" : ""}
            onClick={(e) => {
              e.preventDefault();
              onShowLibrary("moodboard");
            }}
          >
            Moodboard
          </a>
          {owner && (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("team");
              }}
            >
              Admin
            </a>
          )}
          {!owner && creator && (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("upload");
              }}
            >
              New Project
            </a>
          )}
        </nav>
        <div className="top-actions">
          <div className="search-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input placeholder="Search Ranthambore, Sabyasachi palette, sangeet…" />
            <span className="kbd">⌘ K</span>
          </div>
          <div className="avatar">{initials(currentUser?.fullName)}</div>
          <button type="button" className="btn-outline" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
