import { useEffect, useRef, useState } from "react";
import {
  addToMoodboardApi,
  ApiError,
  fetchProjectDetailApi,
  patchAssetApi,
  removeFromMoodboardApi,
  requestShareLinkApi,
  deleteProjectApi,
} from "../../lib/api";
import {
  detailCity,
  detailEventTypes,
  detailPalette,
  detailTags,
  detailVenue,
  isDemoImageUrl,
} from "../../lib/projects";
import type { ProjectDetail, ProjectGalleryAsset } from "../../types/project";
import type { LibraryMode, SessionUser } from "../../hooks/useAtelier";
type Props = {
  projectId: string | null;
  originMode?: LibraryMode;
  currentUser?: SessionUser | null;
  onBackFromProject: () => void;
  onOpenShare: (project: {
    title: string;
    imageCount: number;
    videoCount: number;
    projectId?: string;
  }) => void;
  onMoodboardChanged: () => void;
  onOpenMoodboard: () => void;
  onEditProject: (projectId: string) => void;
};

const EMPTY_DETAIL: ProjectDetail = {
  id: "",
  title: "Project",
  event_types: [],
  palette: [],
  style_tags: [],
  gallery: [],
  all_assets: [],
};

function assetUrl(a: ProjectGalleryAsset): string {
  return a.urls?.large ?? a.urls?.medium ?? a.urls?.thumb ?? a.url ?? a.media_url ?? a.public_url ?? "";
}

export default function ProjectView({
  projectId,
  originMode = "atelier",
  currentUser: _currentUser,
  onBackFromProject,
  onOpenShare,
  onMoodboardChanged,
  onOpenMoodboard,
  onEditProject,
}: Props) {
  const [detail, setDetail] = useState<ProjectDetail>(EMPTY_DETAIL);
  const [loading, setLoading] = useState(false);
  const [fromApi, setFromApi] = useState(false);
  const [savingMoodboard, setSavingMoodboard] = useState(false);
  const [inMoodboard, setInMoodboard] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [updatingAsset, setUpdatingAsset] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(null);

  const loadDetail = async (id: string, seq: number) => {
    const d = await fetchProjectDetailApi(id);
    if (seq !== requestSeq.current) return;
    setDetail(d);
    setResolvedProjectId(String(d.id));
    setFromApi(true);
    setInMoodboard(Boolean(d.in_moodboard));
    const all = d.all_assets?.length ? d.all_assets : d.gallery ?? [];
    setSelectedAssetId(all[0]?.id ?? null);
  };

  useEffect(() => {
    requestSeq.current += 1;
    const seq = requestSeq.current;
    if (!projectId) {
      setDetail(EMPTY_DETAIL);
      setFromApi(false);
      setInMoodboard(false);
      setResolvedProjectId(null);
      setSelectedAssetId(null);
      setLoadError("Project not found");
      return;
    }

    setDetail(EMPTY_DETAIL);
    setFromApi(false);
    setInMoodboard(false);
    setResolvedProjectId(null);
    setSelectedAssetId(null);
    setLoadError(null);
    setLoading(true);
    loadDetail(projectId, seq)
      .catch((e) => {
        if (seq !== requestSeq.current) return;
        setDetail(EMPTY_DETAIL);
        setFromApi(false);
        setResolvedProjectId(null);
        setSelectedAssetId(null);
        if (e instanceof ApiError && e.status === 404) {
          setLoadError("Project not found");
        } else {
          setLoadError(e instanceof ApiError ? e.message : "Could not load project");
        }
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [projectId]);

  const city = detailCity(detail);
  const venue = detailVenue(detail);
  const events = detailEventTypes(detail);
  const palette = detailPalette(detail);
  const tags = detailTags(detail);
  const allAssets = detail.all_assets?.length ? detail.all_assets : detail.gallery ?? [];
  const visibleAssets = detail.gallery ?? allAssets.filter((a) => a.show_in_gallery !== false);
  const previewAssets = visibleAssets.slice(0, 7);
  const extraCount = Math.max(visibleAssets.length - 7, 0);
  const heroImage = isDemoImageUrl(detail.cover_url) ? "" : (detail.cover_url ?? "");
  const selectedAsset = allAssets.find((a) => a.id === selectedAssetId) ?? allAssets[0] ?? null;

  const credits = detail.credits;
  const creditLine = credits
    ? [
        credits.decor_lead && `Decor lead: ${credits.decor_lead}`,
        credits.florals && `Florals: ${credits.florals}`,
        credits.lighting && `Lighting: ${credits.lighting}`,
        credits.photography && `Photography: ${credits.photography}`,
      ]
        .filter(Boolean)
        .join(". ")
    : null;

  const addMoodboard = async () => {
    if (!resolvedProjectId) {
      alert("Only saved projects can be added to moodboard.");
      return;
    }
    if (inMoodboard || detail.can_add_to_moodboard === false) {
      if (inMoodboard) onOpenMoodboard();
      return;
    }
    setSavingMoodboard(true);
    try {
      await addToMoodboardApi(resolvedProjectId);
      setInMoodboard(true);
      onMoodboardChanged();
    } catch (e) {
      if (e instanceof ApiError && e.code === "ALREADY_SAVED") {
        setInMoodboard(true);
      } else if (e instanceof ApiError && e.isDatabaseNotReady) {
        alert(
          "Moodboard table is missing. Restart backend (SCHEMA_AUTO_INIT=true) or run docs/db-reference/V7__moodboard_items.sql in DBeaver.",
        );
      } else {
        alert(e instanceof ApiError ? e.message : "Could not add to moodboard");
      }
    } finally {
      setSavingMoodboard(false);
    }
  };

  const setCover = async (assetId: string) => {
    if (!resolvedProjectId || !projectId) return;
    setUpdatingAsset(true);
    try {
      await patchAssetApi(assetId, { is_cover: true });
      await loadDetail(projectId, requestSeq.current);
      onMoodboardChanged();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not set cover");
    } finally {
      setUpdatingAsset(false);
    }
  };

  const toggleGallery = async (asset: ProjectGalleryAsset) => {
    if (!resolvedProjectId || !projectId) return;
    setUpdatingAsset(true);
    try {
      await patchAssetApi(asset.id, { show_in_gallery: !(asset.show_in_gallery !== false) });
      await loadDetail(projectId, requestSeq.current);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not update gallery visibility");
    } finally {
      setUpdatingAsset(false);
    }
  };

  const removeMoodboard = async () => {
    if (!resolvedProjectId) return;
    if (!window.confirm("Remove this project from your moodboard?")) return;
    if (!window.confirm("Please confirm again: remove from moodboard?")) return;
    setSavingMoodboard(true);
    try {
      await removeFromMoodboardApi(resolvedProjectId);
      setInMoodboard(false);
      onMoodboardChanged();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not remove from moodboard");
    } finally {
      setSavingMoodboard(false);
    }
  };

  const deleteProject = async () => {
    if (!resolvedProjectId) return;
    if (!window.confirm("Delete this project permanently?")) return;
    if (!window.confirm("This cannot be undone. Confirm delete again?")) return;
    try {
      await deleteProjectApi(resolvedProjectId);
      onMoodboardChanged();
      onBackFromProject();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not delete project");
    }
  };

  const requestShareApproval = async () => {
    if (!resolvedProjectId) return;
    try {
      await requestShareLinkApi(resolvedProjectId);
      await loadDetail(String(resolvedProjectId), requestSeq.current);
      alert("Share link request sent to admin for approval.");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not request share link");
    }
  };

  const handleShareClick = () => {
    if (detail.can_share || detail.share_request_approved) {
      onOpenShare({
        title: detail.title,
        imageCount: allAssets.filter((a) => a.kind !== "VIDEO").length,
        videoCount: allAssets.filter((a) => a.kind === "VIDEO").length,
        projectId: resolvedProjectId ?? undefined,
      });
      return;
    }
    if (detail.share_requires_approval && !detail.share_request_pending) {
      void requestShareApproval();
    }
  };

  const backLabel = originMode === "moodboard" ? "moodboard" : "atelier";
  const showShareButton = Boolean(detail.can_share || detail.share_request_approved || detail.share_requires_approval);
  const shareButtonLabel = detail.share_request_pending
    ? "Approval pending"
    : detail.share_request_approved || detail.can_share
      ? "Generate client link"
      : "Request link approval";
  const shareDisabled = Boolean(detail.share_request_pending);
  const showMoodboardButton = detail.can_add_to_moodboard !== false || inMoodboard;
  const showEditActions = Boolean(detail.can_edit && resolvedProjectId);
  const showDeleteAction = Boolean(detail.can_delete && resolvedProjectId);
  const showMoodboardRemoveAction =
    originMode === "moodboard" && Boolean(detail.can_remove_from_moodboard) && inMoodboard;

  if (loading) {
    return (
      <section id="view-project" className="view active">
        <div className="save-toast">Loading project…</div>
      </section>
    );
  }

  if (!fromApi) {
    return (
      <section id="view-project" className="view active">
        <div className="save-toast save-toast--err">{loadError ?? "Project not found"}</div>
      </section>
    );
  }

  return (
    <section id="view-project" className="view active">
      <div className={`pd-hero${heroImage ? "" : " pd-hero-empty"}`} style={heroImage ? { backgroundImage: `url('${heroImage}')` } : undefined}>
        {!heroImage && <div className="pd-hero-empty-msg">No cover image uploaded yet</div>}
        <a
          className="pd-back"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onBackFromProject();
          }}
        >
          ← Back to {backLabel}
        </a>
        <div className="pd-title-wrap">
          <div className="eyebrow">
            {[city, venue].filter(Boolean).join(" · ")}
            {detail.event_date ? ` · ${detail.event_date}` : ""}
          </div>
          <h1 className="serif">{detail.title}</h1>
          <div className="pd-sub">
            {[events, detail.theme, detail.guest_count ? `${detail.guest_count} guests` : ""]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </div>

      <div className="pd-meta">
        <div className="pd-meta-left">
          <dl>
            {venue && (
              <div>
                <dt>Venue</dt>
                <dd className="serif">{venue}</dd>
              </div>
            )}
            {city && (
              <div>
                <dt>City</dt>
                <dd className="serif">{city}</dd>
              </div>
            )}
            {events && (
              <div>
                <dt>Event Type</dt>
                <dd className="serif">{events}</dd>
              </div>
            )}
            {detail.theme && (
              <div>
                <dt>Theme</dt>
                <dd className="serif">{detail.theme}</dd>
              </div>
            )}
            {palette.length > 0 && (
              <div>
                <dt>Palette</dt>
                <dd>
                  <div className="palette">
                    {palette.map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </div>
                </dd>
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <dt>Style Tags</dt>
                <dd>
                  <div className="tags">
                    {tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className="pd-meta-right">
          {detail.narrative && (
            <>
              <h2 className="serif">{detail.narrative.split(".")[0]}.</h2>
              <p>{detail.narrative}</p>
            </>
          )}
          {creditLine && <p>{creditLine}</p>}
          <div className="pd-actions">
            {showShareButton && (
              <button
                type="button"
                className="btn-ink"
                onClick={handleShareClick}
                disabled={shareDisabled}
              >
                {shareButtonLabel}
              </button>
            )}
            {showMoodboardButton && (
              <button
                type="button"
                className={`btn-outline${inMoodboard ? " on" : ""}`}
                onClick={() => void addMoodboard()}
                disabled={savingMoodboard || (inMoodboard && detail.can_add_to_moodboard === false)}
              >
                {savingMoodboard
                  ? "Saving…"
                  : inMoodboard
                    ? "Added to moodboard"
                    : "Add to moodboard"}
              </button>
            )}
            <button type="button" className="btn-outline">
              Find similar
            </button>
            {showEditActions && (
              <button type="button" className="btn-outline" onClick={() => resolvedProjectId && onEditProject(String(resolvedProjectId))}>
                Update project
              </button>
            )}
            {showDeleteAction && (
              <button type="button" className="btn-outline" onClick={() => void deleteProject()}>
                Delete project
              </button>
            )}
            {showMoodboardRemoveAction && (
              <button type="button" className="btn-outline" onClick={() => void removeMoodboard()} disabled={savingMoodboard}>
                Remove from moodboard
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pd-gallery-strip">
        {previewAssets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className={`thumb-tile ${asset.id === selectedAssetId ? "on" : ""}`}
            onClick={() => {
              setSelectedAssetId(asset.id);
              setGalleryOpen(true);
            }}
          >
            <div className="thumb-img" style={{ backgroundImage: `url('${assetUrl(asset)}')` }} />
            <div className="thumb-meta">
              {asset.is_cover ? <span className="flag">Cover</span> : null}
              {asset.kind === "VIDEO" ? <span className="flag">Video</span> : null}
            </div>
          </button>
        ))}
        {extraCount > 0 && (
          <button type="button" className="thumb-tile more" onClick={() => setGalleryOpen(true)}>
            <div className="more-label">+ {extraCount} more</div>
          </button>
        )}
      </div>

      {galleryOpen && (
        <div className="media-overlay">
          <div className="media-overlay-inner">
            <div className="media-overlay-top">
              <h3 className="serif">All media</h3>
              <button type="button" className="btn-outline" onClick={() => setGalleryOpen(false)}>
                Close
              </button>
            </div>
            <div className="media-overlay-grid">
              <div className="media-list">
                {allAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`media-list-item ${selectedAsset?.id === asset.id ? "on" : ""}`}
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <div className="thumb-img" style={{ backgroundImage: `url('${assetUrl(asset)}')` }} />
                    <div className="thumb-meta">
                      {asset.is_cover ? <span className="flag">Cover</span> : null}
                      {asset.show_in_gallery !== false ? (
                        <span className="flag">Gallery</span>
                      ) : (
                        <span className="flag off">Hidden</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="media-preview">
                {selectedAsset ? (
                  <>
                    {selectedAsset.kind === "VIDEO" ? (
                      <video controls src={assetUrl(selectedAsset)} />
                    ) : (
                      <img src={assetUrl(selectedAsset)} alt="Project media" />
                    )}
                    <div className="media-actions">
                      {detail.can_edit && (
                        <>
                          <button
                            type="button"
                            className={`btn-outline ${selectedAsset.is_cover ? "on" : ""}`}
                            disabled={updatingAsset}
                            onClick={() => void setCover(selectedAsset.id)}
                          >
                            {selectedAsset.is_cover ? "Cover selected" : "Set as cover"}
                          </button>
                          <button
                            type="button"
                            className={`btn-outline ${selectedAsset.show_in_gallery !== false ? "on" : ""}`}
                            disabled={updatingAsset}
                            onClick={() => void toggleGallery(selectedAsset)}
                          >
                            {selectedAsset.show_in_gallery !== false ? "Shown in gallery" : "Show in gallery"}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p>No media found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
