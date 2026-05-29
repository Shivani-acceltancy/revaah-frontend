import type { SessionUser } from "../../hooks/useAtelier";
import type { LibraryMode } from "../../hooks/useAtelier";
import type { AtelierView } from "../../lib/atelier";
import { isCurator, isOwner } from "../../lib/roles";

type Props = {
  active: "upload" | "team";
  onNavigate: (view: AtelierView) => void;
  onShowLibrary: (mode: LibraryMode) => void;
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

export default function AdminSidebar({ active, onNavigate, onShowLibrary, onLogout, currentUser }: Props) {
  const owner = isOwner(currentUser?.role);
  const curator = isCurator(currentUser?.role);
  const simplified = curator && !owner;

  return (
    <aside className="admin-side">
      <div className="sb-brand">
        <div className="b">REVAAH</div>
        <div className="sub">{owner ? "atelier · admin" : "atelier · new project"}</div>
      </div>
      <div className="sb-group">Library</div>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onShowLibrary("atelier");
        }}
      >
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        Atelier
      </a>
      <a
        href="#"
        className={active === "upload" ? "on" : ""}
        onClick={(e) => {
          e.preventDefault();
          onNavigate("upload");
        }}
      >
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 4v12m0-12-4 4m4-4 4 4M4 20h16" />
        </svg>
        Upload projects
      </a>
      {!simplified && (
        <>
          <a href="#" onClick={(e) => e.preventDefault()}>
            <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M3 12h2m14 0h2m-9-9v2m0 14v2" />
            </svg>
            Assets
          </a>
          <div className="sb-group">Sharing</div>
          <a href="#" onClick={(e) => e.preventDefault()}>
            <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7L11 5" />
              <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" />
            </svg>
            Shared links
          </a>
          <div className="sb-group">Organisation</div>
          <a
            href="#"
            className={active === "team" ? "on" : ""}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("team");
            }}
          >
            <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M3 20a6 6 0 0 1 12 0" />
              <circle cx="17" cy="9" r="2.5" />
              <path d="M14.5 20a4.5 4.5 0 0 1 7-3.5" />
            </svg>
            Team
          </a>
          <a href="#" onClick={(e) => e.preventDefault()}>
            <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7h18M3 12h18M3 17h12" />
            </svg>
            Taxonomies
          </a>
          <a href="#" onClick={(e) => e.preventDefault()}>
            <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
            </svg>
            Settings
          </a>
        </>
      )}
      <div className="sb-foot">
        <div className="av">{initials(currentUser?.fullName)}</div>
        <div>
          <div className="nm">{currentUser?.fullName ?? "User"}</div>
          <div className="rl">{(currentUser?.role ?? "member").replace("_", " ").toUpperCase()}</div>
        </div>
        <button type="button" className="sb-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
