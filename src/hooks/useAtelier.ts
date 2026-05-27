import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchSystemStatus,
  loginApi,
  uiPreviewLoginApi,
} from "../lib/api";
import { type AtelierView, STORAGE_KEY } from "../lib/atelier";

export type LibraryMode = "atelier" | "projects" | "moodboard";
export type SessionUser = { id: string; email: string; fullName: string; role: string };
const USER_STORAGE_KEY = "atelier_user";

function readStoredUser(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function useAtelier() {
  const [view, setView] = useState<AtelierView>("login");
  const [libraryMode, setLibraryMode] = useState<LibraryMode>("atelier");
  const [libraryReturnMode, setLibraryReturnMode] = useState<LibraryMode>("atelier");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);
  const [teamRefreshKey, setTeamRefreshKey] = useState(0);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareResultVisible, setShareResultVisible] = useState(false);
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => readStoredUser());

  useEffect(() => {
    fetchSystemStatus()
      .then((s) => setDbReady(s.database_ready))
      .catch(() => setDbReady(false));
  }, []);

  const show = useCallback((name: AtelierView) => {
    const unlocked = sessionStorage.getItem(STORAGE_KEY) === "1";
    const next = !unlocked && name !== "login" ? "login" : name;
    setView(next);
    document.body.dataset.protect = next === "client" ? "1" : "0";
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const showLibrary = useCallback(
    (mode: LibraryMode = "atelier") => {
      setLibraryMode(mode);
      show("library");
    },
    [show],
  );

  const openProject = useCallback(
    (projectId: string, returnTo?: LibraryMode) => {
      setEditingProjectId(null);
      setLibraryReturnMode(returnTo ?? libraryMode);
      setSelectedProjectId(projectId);
      show("project");
    },
    [libraryMode, show],
  );

  const backFromProject = useCallback(() => {
    showLibrary(libraryReturnMode);
  }, [libraryReturnMode, showLibrary]);

  const bumpProjectsRefresh = useCallback(() => {
    setProjectsRefreshKey((k) => k + 1);
  }, []);

  const bumpTeamRefresh = useCallback(() => {
    setTeamRefreshKey((k) => k + 1);
  }, []);

  const enterPreview = useCallback(async () => {
    const preview = await uiPreviewLoginApi();
    sessionStorage.setItem("atelier_access_token", preview.accessToken);
    sessionStorage.setItem("atelier_preview_mode", "1");
    sessionStorage.setItem(STORAGE_KEY, "1");
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(preview.user));
    setCurrentUser(preview.user);
    setLoginError(null);
    show("library");
    return true;
  }, [show]);

  const tryLogin = useCallback(
    async (email: string, password: string) => {
      setLoginError(null);

      if (dbReady === false) {
        try {
          await enterPreview();
          return true;
        } catch (e) {
          setLoginError(
            e instanceof ApiError ? e.message : "Preview login failed — is backend running?",
          );
          return false;
        }
      }

      try {
        const res = await loginApi(email.trim(), password);
        sessionStorage.setItem("atelier_access_token", res.accessToken);
        sessionStorage.removeItem("atelier_preview_mode");
        sessionStorage.setItem(STORAGE_KEY, "1");
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
        setCurrentUser(res.user);
        show("library");
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.isDatabaseNotReady) {
          try {
            await enterPreview();
            return true;
          } catch (inner) {
            setLoginError(inner instanceof ApiError ? inner.message : e.message);
            return false;
          }
        }
        if (e instanceof ApiError) {
          setLoginError(e.message);
        } else {
          setLoginError("Cannot reach backend API. Is it running on port 8080?");
        }
        return false;
      }
    },
    [dbReady, enterPreview, show],
  );

  const openShare = useCallback(() => setShareOpen(true), []);
  const closeShare = useCallback(() => {
    setShareOpen(false);
    setShareResultVisible(false);
  }, []);
  const generateLink = useCallback(() => setShareResultVisible(true), []);
  const openInvite = useCallback(() => setInviteOpen(true), []);
  const closeInvite = useCallback(() => setInviteOpen(false), []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("atelier_access_token");
    sessionStorage.removeItem("atelier_preview_mode");
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    setShareOpen(false);
    setInviteOpen(false);
    setShareResultVisible(false);
    setSelectedProjectId(null);
    setEditingProjectId(null);
    setCurrentUser(null);
    setLoginError(null);
    show("login");
  }, [show]);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      show("library");
    } else {
      show("login");
    }
  }, [show]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.body.dataset.protect !== "1") return;
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && ["s", "p", "c", "a"].includes(k)) {
        e.preventDefault();
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
        alert("Screen capture is restricted on this viewing.");
      }
    };
    const onDragStart = (e: DragEvent) => {
      if (document.body.dataset.protect === "1") e.preventDefault();
    };
    const onContextMenu = (e: MouseEvent) => {
      if (document.body.dataset.protect === "1") e.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  const openProjectForEdit = useCallback((projectId: string) => {
    setEditingProjectId(projectId);
    show("upload");
  }, [show]);

  return {
    view,
    show,
    showLibrary,
    libraryMode,
    libraryReturnMode,
    selectedProjectId,
    editingProjectId,
    openProject,
    openProjectForEdit,
    backFromProject,
    projectsRefreshKey,
    bumpProjectsRefresh,
    teamRefreshKey,
    bumpTeamRefresh,
    tryLogin,
    loginError,
    setLoginError,
    shareOpen,
    inviteOpen,
    shareResultVisible,
    openShare,
    closeShare,
    generateLink,
    openInvite,
    closeInvite,
    logout,
    dbReady,
    currentUser,
  };
}
