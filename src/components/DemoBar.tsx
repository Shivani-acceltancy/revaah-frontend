import type { LibraryMode } from "../hooks/useAtelier";
import type { AtelierView } from "../lib/atelier";

type Props = {
  view: AtelierView;
  onNavigate: (view: AtelierView) => void;
  onShowLibrary: (mode: LibraryMode) => void;
  onOpenProject: (projectId: string, returnTo?: LibraryMode) => void;
  selectedProjectId: string | null;
  onOpenShare: () => void;
};

export default function DemoBar({
  view,
  onNavigate,
  onShowLibrary,
  onOpenProject,
  selectedProjectId,
  onOpenShare,
}: Props) {
  const btn = (name: AtelierView, label: string, action?: () => void) => (
    <button
      type="button"
      className={view === name ? "on" : ""}
      onClick={() => (action ? action() : onNavigate(name))}
    >
      {label}
    </button>
  );

  return (
    <div className="demo-bar">
      <span className="lbl">View</span>
      {btn("login", "Login")}
      <button type="button" className={view === "library" ? "on" : ""} onClick={() => onShowLibrary("atelier")}>
        Library
      </button>
      <button
        type="button"
        className={view === "project" ? "on" : ""}
        onClick={() => {
          if (selectedProjectId) {
            onOpenProject(selectedProjectId, "projects");
          } else {
            onShowLibrary("projects");
          }
        }}
      >
        Project
      </button>
      <button type="button" onClick={onOpenShare}>
        Share link
      </button>
      {btn("client", "Client view")}
      <div className="sep" />
      <span className="lbl">Admin</span>
      {btn("upload", "Upload event")}
      {btn("team", "Team")}
    </div>
  );
}
