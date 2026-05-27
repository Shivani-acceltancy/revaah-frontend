import { useCallback, useState } from "react";
import ApiStatusBanner from "./components/ApiStatusBanner";
import DemoBar from "./components/DemoBar";
import InviteModal from "./components/modals/InviteModal";
import ShareModal from "./components/modals/ShareModal";
import AcceptInvitationView from "./components/views/AcceptInvitationView";
import ClientView from "./components/views/ClientView";
import LibraryView from "./components/views/LibraryView";
import LoginView from "./components/views/LoginView";
import ProjectView from "./components/views/ProjectView";
import TeamView from "./components/views/TeamView";
import UploadView from "./components/views/UploadView";
import { useApiStatus } from "./hooks/useApiStatus";
import { useAtelier } from "./hooks/useAtelier";
import type { AtelierView } from "./lib/atelier";

type AtelierState = ReturnType<typeof useAtelier>;

function getInviteTokenFromUrl(): string | null {
  const path = window.location.pathname.replace(/\/$/, "");
  if (!path.endsWith("/accept-invitation")) {
    return null;
  }
  return new URLSearchParams(window.location.search).get("token");
}

function ActiveView({
  atelier,
  view,
  show,
  loginError,
  loginSuccess,
  postInviteEmail,
  onClearLoginError,
  tryLogin,
  openShare,
  openInvite,
  logout,
  databaseReady,
  dbReady,
}: {
  atelier: AtelierState;
  view: AtelierView;
  show: (v: AtelierView) => void;
  loginError: string | null;
  loginSuccess: string | null;
  postInviteEmail: string;
  onClearLoginError: () => void;
  tryLogin: (email: string, password: string) => Promise<boolean>;
  openShare: () => void;
  openInvite: () => void;
  logout: () => void;
  databaseReady: boolean;
  dbReady: boolean | null;
}) {
  switch (view) {
    case "login":
      return (
        <LoginView
          loginError={loginError}
          successMessage={loginSuccess}
          initialEmail={postInviteEmail}
          dbReady={dbReady}
          onLogin={tryLogin}
          onClearError={onClearLoginError}
        />
      );
    case "library":
      return (
        <LibraryView
          onNavigate={show}
          onShowLibrary={atelier.showLibrary}
          onLogout={logout}
          libraryMode={atelier.libraryMode}
          onOpenProject={atelier.openProject}
          projectsRefreshKey={atelier.projectsRefreshKey}
          databaseReady={databaseReady}
          currentUser={atelier.currentUser}
        />
      );
    case "project":
      return (
        <ProjectView
          projectId={atelier.selectedProjectId}
          originMode={atelier.libraryReturnMode}
          onBackFromProject={atelier.backFromProject}
          onOpenShare={openShare}
          onMoodboardChanged={atelier.bumpProjectsRefresh}
          onOpenMoodboard={() => atelier.showLibrary("moodboard")}
          onEditProject={atelier.openProjectForEdit}
        />
      );
    case "upload":
      return (
        <UploadView
          onNavigate={show}
          onShowLibrary={atelier.showLibrary}
          onLogout={logout}
          onPublished={atelier.bumpProjectsRefresh}
          databaseReady={databaseReady}
          editingProjectId={atelier.editingProjectId}
          currentUser={atelier.currentUser}
        />
      );
    case "team":
      return (
        <TeamView
          onNavigate={show}
          onShowLibrary={atelier.showLibrary}
          onLogout={logout}
          onOpenInvite={openInvite}
          refreshKey={atelier.teamRefreshKey}
          currentUser={atelier.currentUser}
        />
      );
    case "client":
      return <ClientView />;
    default:
      return null;
  }
}

export default function App() {
  const atelier = useAtelier();
  const apiStatus = useApiStatus();
  const databaseReady = apiStatus.status?.database_ready ?? false;
  const [inviteToken, setInviteToken] = useState<string | null>(() => getInviteTokenFromUrl());
  const [postInviteEmail, setPostInviteEmail] = useState("");
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  const finishInvite = useCallback((email: string) => {
    window.history.replaceState({}, "", "/");
    setInviteToken(null);
    if (email) {
      setPostInviteEmail(email);
      setLoginSuccess("Account activated. Sign in with your new password.");
    }
    atelier.show("login");
  }, [atelier]);

  if (inviteToken) {
    return (
      <>
        <ApiStatusBanner status={apiStatus.status} apiConnected={apiStatus.apiConnected} />
        <AcceptInvitationView token={inviteToken} onComplete={finishInvite} />
      </>
    );
  }

  return (
    <>
      <ApiStatusBanner status={apiStatus.status} apiConnected={apiStatus.apiConnected} />

      <ActiveView
        atelier={atelier}
        view={atelier.view}
        show={atelier.show}
        loginError={atelier.loginError}
        loginSuccess={loginSuccess}
        postInviteEmail={postInviteEmail}
        onClearLoginError={() => atelier.setLoginError(null)}
        tryLogin={atelier.tryLogin}
        openShare={atelier.openShare}
        openInvite={atelier.openInvite}
        logout={atelier.logout}
        databaseReady={databaseReady}
        dbReady={atelier.dbReady}
      />

      <ShareModal
        open={atelier.shareOpen}
        resultVisible={atelier.shareResultVisible}
        onClose={atelier.closeShare}
        onGenerate={atelier.generateLink}
        onPreviewClient={() => {
          atelier.closeShare();
          atelier.show("client");
        }}
      />

      <InviteModal
        open={atelier.inviteOpen}
        onClose={atelier.closeInvite}
        onSuccess={atelier.bumpTeamRefresh}
        apiConnected={apiStatus.apiConnected}
        databaseReady={databaseReady}
      />

      <DemoBar
        view={atelier.view}
        onNavigate={atelier.show}
        onShowLibrary={atelier.showLibrary}
        onOpenProject={atelier.openProject}
        selectedProjectId={atelier.selectedProjectId}
        onOpenShare={atelier.openShare}
      />
    </>
  );
}
