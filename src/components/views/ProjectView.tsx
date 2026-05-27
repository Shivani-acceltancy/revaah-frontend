import { useEffect, useState } from "react";
import {
  addToMoodboardApi,
  ApiError,
  checkMoodboardApi,
  deleteProjectApi,
  fetchProjectDetailApi,
  patchAssetApi,
  removeFromMoodboardApi,
} from "../../lib/api";
import {
  PLACEHOLDER_IMAGE,
  detailCity,
  detailEventTypes,
  detailPalette,
  detailTags,
  detailVenue,
} from "../../lib/projects";
import type { ProjectDetail, ProjectGalleryAsset } from "../../types/project";
import type { LibraryMode } from "../../hooks/useAtelier";
type Props = {
  projectId: string | null;
  originMode?: LibraryMode;
  onBackFromProject: () => void;
  onOpenShare: () => void;
  onMoodboardChanged: () => void;
  onOpenMoodboard: () => void;
  onEditProject: (projectId: string) => void;
};

const STATIC_DETAIL: ProjectDetail = {
  id: "static-demo",
  title: "Of Tigers & Twilight",
  theme: "Forest Royal",
  city: "Ranthambore, Rajasthan",
  venue: "Aman-i-Khás",
  event_types: ["WEDDING", "MEHENDI", "SANGEET"],
  guest_count: 380,
  duration_days: 4,
  narrative:
    "A four-day affair built within the tented camp, the mehendi opened to a forest grove dressed in five thousand marigolds and brass diyas suspended on jute. The sangeet, set under a navy canopy embroidered with constellations, ended at dawn. For the phera, a circular mandap of carved teak was placed at the water's edge, surrounded by hand-painted screens depicting the Ranthambore wilderness.",
  style_tags: [
    "Floral cascade",
    "Brass lanterns",
    "Forest canopy",
    "Tiger motif",
    "Heritage textiles",
    "Live oud",
  ],
  credits: {
    decor_lead: "Team member",
    florals: "Studio Verdure",
    lighting: "Atelier Lumière",
    photography: "The Rabbit Hole Co.",
  },
};

function assetUrl(a: ProjectGalleryAsset): string {
  return a.urls?.large ?? a.urls?.medium ?? a.urls?.thumb ?? PLACEHOLDER_IMAGE;
}

export default function ProjectView({
  projectId,
  originMode = "projects",
  onBackFromProject,
  onOpenShare,
  onMoodboardChanged,
  onOpenMoodboard,
  onEditProject,
}: Props) {
  const [detail, setDetail] = useState<ProjectDetail>(STATIC_DETAIL);
  const [loading, setLoading] = useState(false);
  const [fromApi, setFromApi] = useState(false);
  const [savingMoodboard, setSavingMoodboard] = useState(false);
  const [inMoodboard, setInMoodboard] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [updatingAsset, setUpdatingAsset] = useState(false);

  const loadDetail = async (id: string) => {
    const d = await fetchProjectDetailApi(id);
    setDetail(d);
    setFromApi(true);
    const saved =
      d.in_moodboard === true ||
      (d as { inMoodboard?: boolean }).inMoodboard === true ||
      (await checkMoodboardApi(id).catch(() => false));
    setInMoodboard(saved);
    const all = d.all_assets?.length ? d.all_assets : d.gallery ?? [];
    setSelectedAssetId((curr) => curr ?? all[0]?.id ?? null);
  };

  useEffect(() => {
    if (!projectId || projectId.startsWith("static-")) {
      setDetail(STATIC_DETAIL);
      setFromApi(false);
      setInMoodboard(false);
      return;
    }

    setLoading(true);
    loadDetail(projectId)
      .catch((e) => {
        setDetail(STATIC_DETAIL);
        setFromApi(false);
        setSelectedAssetId(null);
        if (e instanceof ApiError && e.status === 404) {
          setDetail({ ...STATIC_DETAIL, title: "Project not found" });
        }
      })
      .finally(() => setLoading(false));
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
  const heroImage = detail.cover_url ?? assetUrl(visibleAssets[0] ?? ({} as ProjectGalleryAsset));
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
    if (!projectId || projectId.startsWith("static-")) {
      alert("Only saved projects can be added to moodboard.");
      return;
    }
    if (inMoodboard) {
      onOpenMoodboard();
      return;
    }
    setSavingMoodboard(true);
    try {
      await addToMoodboardApi(projectId);
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
    if (!projectId || projectId.startsWith("static-")) return;
    setUpdatingAsset(true);
    try {
      await patchAssetApi(assetId, { is_cover: true });
      await loadDetail(projectId);
      onMoodboardChanged();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not set cover");
    } finally {
      setUpdatingAsset(false);
    }
  };

  const toggleGallery = async (asset: ProjectGalleryAsset) => {
    if (!projectId || projectId.startsWith("static-")) return;
    setUpdatingAsset(true);
    try {
      await patchAssetApi(asset.id, { show_in_gallery: !(asset.show_in_gallery !== false) });
      await loadDetail(projectId);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not update gallery visibility");
    } finally {
      setUpdatingAsset(false);
    }
  };

  const removeMoodboard = async () => {
    if (!projectId || projectId.startsWith("static-")) return;
    if (!window.confirm("Remove this project from your moodboard?")) return;
    if (!window.confirm("Please confirm again: remove from moodboard?")) return;
    setSavingMoodboard(true);
    try {
      await removeFromMoodboardApi(projectId);
      setInMoodboard(false);
      onMoodboardChanged();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not remove from moodboard");
    } finally {
      setSavingMoodboard(false);
    }
  };

  const deleteProject = async () => {
    if (!projectId || projectId.startsWith("static-")) return;
    if (!window.confirm("Delete this project permanently?")) return;
    if (!window.confirm("This cannot be undone. Confirm delete again?")) return;
    try {
      await deleteProjectApi(projectId);
      onMoodboardChanged();
      onBackFromProject();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not delete project");
    }
  };

  return (
    <section id="view-project" className="view active">
      {loading && <div className="save-toast">Loading project…</div>}

      <div className="pd-hero" style={{ backgroundImage: `url('${heroImage}')` }}>
        <a
          className="pd-back"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onBackFromProject();
          }}
        >
          ← Back to {fromApi ? "projects" : "atelier"}
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
            <button type="button" className="btn-ink" onClick={onOpenShare}>
              Generate client link
            </button>
            <button
              type="button"
              className={`btn-outline${inMoodboard ? " on" : ""}`}
              onClick={() => void addMoodboard()}
              disabled={savingMoodboard}
            >
              {savingMoodboard
                ? "Saving…"
                : inMoodboard
                  ? "Added to moodboard"
                  : "Add to moodboard"}
            </button>
            <button type="button" className="btn-outline">
              Find similar
            </button>
            {detail.can_edit && projectId && !projectId.startsWith("static-") && (
              <button type="button" className="btn-outline" onClick={() => onEditProject(projectId)}>
                Update project
              </button>
            )}
            {detail.can_delete && projectId && !projectId.startsWith("static-") && (
              <button type="button" className="btn-outline" onClick={() => void deleteProject()}>
                Delete project
              </button>
            )}
            {inMoodboard && projectId && !projectId.startsWith("static-") && (
              <button type="button" className="btn-outline" onClick={() => void removeMoodboard()} disabled={savingMoodboard}>
                {originMode === "moodboard" ? "Remove from moodboard" : "Remove project"}
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
