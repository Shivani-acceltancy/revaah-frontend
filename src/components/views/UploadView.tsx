import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  createProjectApi,
  fetchProjectDetailApi,
  patchAssetApi,
  publishProjectApi,
  updateProjectApi,
  uploadProjectAssetsApi,
} from "../../lib/api";
import type { LibraryMode, SessionUser } from "../../hooks/useAtelier";
import type { AtelierView } from "../../lib/atelier";
import AdminSidebar from "../layout/AdminSidebar";
import SimpleColorPicker from "../SimpleColorPicker";
import StyleTagPicker from "../StyleTagPicker";

type Props = {
  onNavigate: (view: AtelierView) => void;
  onShowLibrary: (mode: LibraryMode) => void;
  onLogout: () => void;
  onPublished?: () => void;
  databaseReady: boolean;
  editingProjectId?: string | null;
  currentUser?: SessionUser | null;
};

const EVENT_MAP: Record<string, string> = {
  Wedding: "WEDDING",
  Sangeet: "SANGEET",
  Mehendi: "MEHENDI",
  Haldi: "HALDI",
  Reception: "RECEPTION",
  Engagement: "ENGAGEMENT",
};

const SETTING_MAP: Record<string, "OUTDOOR" | "INDOOR" | "MIXED" | "DESTINATION"> = {
  Outdoor: "OUTDOOR",
  Indoor: "INDOOR",
  Mixed: "MIXED",
  Destination: "DESTINATION",
};

const ACCEPT_TYPES =
  "image/jpeg,image/png,image/heic,image/heif,video/mp4,video/quicktime,.jpg,.jpeg,.png,.heic,.heif,.mp4,.mov";

const CITY_OPTIONS = [
  "&K",
  "Himachal Pradesh",
  "Punjab",
  "Haryana",
  "Uttarakhand",
  "Madhya Pradesh",
  "Rajasthan",
  "UP",
  "Bihar",
  "Jim Corbett",
  "Rishikesh",
  "Haridwar",
  "Orchha MP",
  "Lucknow",
  "Mussoorie",
  "Dehradun",
  "Chennai",
  "Amritsar",
  "Jalandhar",
  "Ludhiana",
  "Patiala",
  "Chandigarh",
  "Jaipur",
  "Udaipur",
  "Alwar",
  "Jodhpur",
  "Jaisalmer",
  "Nahargarh",
  "Gujrat",
  "Delhi NCR",
  "Maharashtra",
  "Mumbai",
  "Pune",
  "Karnataka",
  "Bangalore",
  "Kerala",
  "Hyderabad",
  "International",
  "Kolkata and 7 sisters",
  "Goa",
  "Siliguri",
  "Chattisgarh",
  "Odhisa",
];

const CITY_OPTIONS_SORTED = [...CITY_OPTIONS].sort((a, b) => a.localeCompare(b));

type FilePreview = {
  key: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  source: "gallery" | "cover";
  assetId?: string;
  isCover?: boolean;
  error?: string;
};

const VISIBLE_TO_MAP: Record<string, "WHOLE_TEAM" | "CURATORS_AND_OWNER" | "SPECIFIC_USERS"> = {
  "Whole team": "WHOLE_TEAM",
  "Curators & Owner only": "CURATORS_AND_OWNER",
  "Specific people": "SPECIFIC_USERS",
};

const SHAREABLE_BY_MAP: Record<string, string> = {
  "Curators & Owner": "CURATORS_AND_OWNER",
  "Whole team": "WHOLE_TEAM",
  "Owner only": "OWNER_ONLY",
};

export default function UploadView({
  onNavigate,
  onShowLibrary,
  onLogout,
  onPublished,
  databaseReady,
  editingProjectId,
  currentUser,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [theme, setTheme] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [setting, setSetting] = useState("Outdoor");
  const [photoCredit, setPhotoCredit] = useState("");
  const [visibleTo, setVisibleTo] = useState("Whole team");
  const [shareableBy, setShareableBy] = useState("Curators & Owner");
  const [ownerOfRecord, setOwnerOfRecord] = useState(currentUser?.fullName ?? "");
  const [palette, setPalette] = useState<string[]>([]);
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [editingSwatchIdx, setEditingSwatchIdx] = useState<number | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [activities, setActivities] = useState<
    { id: number; who: string; what: string; at: Date }[]
  >([]);
  const actorName = currentUser?.fullName?.trim() || currentUser?.email?.trim() || "User";

  useEffect(() => {
    if (!editingProjectId) return;
    fetchProjectDetailApi(editingProjectId)
      .then((d) => {
        setProjectId(d.id);
        setTitle(d.title ?? "");
        setTheme(d.theme ?? "");
        setEventType((d.event_types?.[0] ?? "WEDDING").toLowerCase().replace(/^./, (c) => c.toUpperCase()));
        setEventDate(d.event_date ?? "");
        setGuestCount(d.guest_count ? String(d.guest_count) : "");
        setVenue(typeof d.venue === "string" ? d.venue : d.venue?.name ?? "");
        setCity(typeof d.city === "string" ? d.city : d.city?.name ?? "");
        setNarrative(d.narrative ?? "");
        setPhotoCredit(d.photo_credit ?? "");
        setSetting((d.setting ?? "OUTDOOR").toLowerCase().replace(/^./, (c) => c.toUpperCase()));
        setVisibleTo(
          d.visible_to === "CURATORS_AND_OWNER"
            ? "Curators & Owner only"
            : d.visible_to === "SPECIFIC_USERS"
              ? "Specific people"
              : "Whole team",
        );
        setShareableBy(
          d.shareable_by === "WHOLE_TEAM"
            ? "Whole team"
            : d.shareable_by === "OWNER_ONLY"
              ? "Owner only"
              : "Curators & Owner",
        );
        setPalette((d.palette ?? []).map((p) => (typeof p === "string" ? p : p.hex)));
        setStyleTags((d.style_tags ?? []).map((t) => (typeof t === "string" ? t : t.name)));
        setSaveMsg({ type: "ok", text: "Editing existing project draft." });
      })
      .catch((e) => {
        setSaveMsg({ type: "err", text: e instanceof ApiError ? e.message : "Could not load project for edit." });
      });
  }, [editingProjectId]);

  useEffect(() => {
    if (!editingProjectId) {
      setOwnerOfRecord(currentUser?.fullName ?? "");
    }
  }, [currentUser?.fullName, editingProjectId]);

  const filteredCities = CITY_OPTIONS_SORTED.filter((name) =>
    city.trim()
      ? name.toLowerCase().includes(city.trim().toLowerCase())
      : true,
  );

  const formBody = () => ({
    title: title.trim() || "Untitled project",
    coverUrl: coverUrl.trim() || undefined,
    theme: theme || undefined,
    eventTypes: [EVENT_MAP[eventType] ?? "WEDDING"],
    eventDate: eventDate || undefined,
    guestCount: guestCount ? Number(guestCount) : undefined,
    setting: SETTING_MAP[setting] ?? "OUTDOOR",
    venueName: venue || undefined,
    cityName: city || undefined,
    narrative: narrative || undefined,
    photoCredit: photoCredit || undefined,
    visibleTo: VISIBLE_TO_MAP[visibleTo] ?? "WHOLE_TEAM",
    shareableBy: SHAREABLE_BY_MAP[shareableBy] ?? "CURATORS_AND_OWNER",
  });

  const updateBody = () => ({
    ...formBody(),
    palette,
    styleTags,
  });

  const ensureProjectId = useCallback(async (): Promise<string> => {
    if (projectId) {
      await updateProjectApi(projectId, updateBody());
      return projectId;
    }
    const created = await createProjectApi(formBody());
    setProjectId(created.id);
    setSaveMsg({ type: "ok", text: `Draft saved (${created.id.slice(0, 8)}…) — uploading files…` });
    setActivities((prev) => [
      {
        id: Date.now(),
        who: actorName,
        what: "started this draft",
        at: new Date(),
      },
      ...prev,
    ]);
    return created.id;
  }, [projectId, title, coverUrl, theme, eventType, eventDate, guestCount, setting, venue, city, narrative, photoCredit, palette, styleTags, actorName]);

  const saveDraft = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      if (projectId) {
        await updateProjectApi(projectId, updateBody());
        setSaveMsg({ type: "ok", text: "Draft updated and saved to database." });
      } else {
        const created = await createProjectApi(formBody());
        setProjectId(created.id);
        await updateProjectApi(created.id, updateBody());
        setSaveMsg({ type: "ok", text: `Draft created (id: ${created.id}).` });
      }
      setActivities((prev) => [
        {
          id: Date.now(),
          who: actorName,
          what: "saved draft details",
          at: new Date(),
        },
        ...prev,
      ]);
    } catch (e) {
      const text =
        e instanceof ApiError && e.isDatabaseNotReady
          ? `Not saved — ${e.message}`
          : e instanceof ApiError
            ? e.message
            : "Save failed";
      setSaveMsg({ type: "err", text });
    } finally {
      setSaving(false);
    }
  };

  const uploadFiles = async (files: File[], source: "gallery" | "cover" = "gallery") => {
    if (files.length === 0) return;
    if (!databaseReady) {
      setSaveMsg({ type: "err", text: "Database not ready — cannot upload files yet." });
      return;
    }

    setUploading(true);
    setSaveMsg(null);

    const newPreviews: FilePreview[] = files.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      status: "pending" as const,
      source,
    }));

    setPreviews((prev) => {
      const keys = new Set(prev.map((p) => p.key));
      const merged = [...prev];
      for (const p of newPreviews) {
        if (!keys.has(p.key)) merged.push(p);
      }
      return merged;
    });

    try {
      const id = await ensureProjectId();
      setPreviews((prev) =>
        prev.map((p) =>
          newPreviews.some((n) => n.key === p.key) ? { ...p, status: "uploading" } : p,
        ),
      );

      const uploaded = await uploadProjectAssetsApi(id, files);

      if (source === "cover" && uploaded[0]?.id) {
        await patchAssetApi(uploaded[0].id, { is_cover: true });
      }

      setPreviews((prev) => {
        let idx = 0;
        return prev.map((p) => {
          const isNew = newPreviews.some((n) => n.key === p.key);
          if (!isNew || p.status !== "uploading") return p;
          const asset = uploaded[idx];
          const isCoverAsset = source === "cover" && idx === 0;
          idx += 1;
          return {
            ...p,
            status: "done" as const,
            assetId: asset?.id,
            isCover: isCoverAsset,
          };
        });
      });

      setSaveMsg({
        type: "ok",
        text:
          source === "cover"
            ? `Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"} to cover bucket.`
            : `Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"} to gallery.`,
      });
      if (uploaded.length > 0) {
        setActivities((prev) => [
          {
            id: Date.now(),
            who: actorName,
            what:
              source === "cover"
                ? `uploaded ${uploaded.length} cover media file${uploaded.length === 1 ? "" : "s"}`
                : `uploaded ${uploaded.length} gallery media file${uploaded.length === 1 ? "" : "s"}`,
            at: new Date(),
          },
          ...prev,
        ]);
      }
    } catch (e) {
      const text = e instanceof ApiError ? e.message : "Upload failed";
      setPreviews((prev) =>
        prev.map((p) =>
          newPreviews.some((n) => n.key === p.key)
            ? { ...p, status: "error" as const, error: text }
            : p,
        ),
      );
      setSaveMsg({ type: "err", text });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list?.length) void uploadFiles(Array.from(list), "gallery");
  };

  const onCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list?.length) void uploadFiles(Array.from(list), "cover");
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openCoverPicker = () => {
    coverInputRef.current?.click();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const list = e.dataTransfer.files;
    if (list?.length) void uploadFiles(Array.from(list), "gallery");
  };

  const publish = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      let id = projectId;
      if (!id) {
        const created = await createProjectApi(formBody());
        id = created.id;
        setProjectId(id);
        await updateProjectApi(id, updateBody());
      } else {
        await updateProjectApi(id, updateBody());
      }
      await publishProjectApi(id);
      setSaveMsg({ type: "ok", text: "Published — visible in Atelier & Projects." });
      onPublished?.();
      onShowLibrary("projects");
    } catch (e) {
      const text =
        e instanceof ApiError && e.isDatabaseNotReady
          ? `Not published — ${e.message}`
          : e instanceof ApiError
            ? e.message
            : "Publish failed";
      setSaveMsg({ type: "err", text });
    } finally {
      setSaving(false);
    }
  };

  const openColorPicker = (idx: number | null = null) => {
    setEditingSwatchIdx(idx);
    setColorPickerOpen(true);
  };

  const onColorPicked = (hex: string) => {
    if (editingSwatchIdx !== null) {
      setPalette((prev) => prev.map((p, i) => (i === editingSwatchIdx ? hex : p)));
    } else {
      setPalette((prev) => [...prev, hex]);
    }
    setActivities((prev) => [
      {
        id: Date.now(),
        who: actorName,
        what: "updated colour palette",
        at: new Date(),
      },
      ...prev,
    ]);
    setEditingSwatchIdx(null);
  };

  const removeStyleTag = (tag: string) => {
    setStyleTags((prev) => prev.filter((t) => t !== tag));
  };

  const applyStyleTags = (tags: string[]) => {
    setStyleTags(tags);
    if (tags.length > 0) {
      setActivities((prev) => [
        {
          id: Date.now(),
          who: actorName,
          what: "updated style tags",
          at: new Date(),
        },
        ...prev,
      ]);
    }
  };

  return (
    <section id="view-upload" className="view active">
      <div className="admin-shell">
        <AdminSidebar active="upload" onNavigate={onNavigate} onShowLibrary={onShowLibrary} onLogout={onLogout} currentUser={currentUser} />
        <main className="admin-main">
          <div className="admin-top">
            <div>
              <div className="crumb">Admin · Library · New Project</div>
              <h1 className="serif">Upload an event.</h1>
            </div>
            <div className="right">
              <button type="button" className="btn-outline" onClick={() => onShowLibrary("projects")}>
                Cancel
              </button>
              <button type="button" className="btn-ink" onClick={saveDraft} disabled={saving || uploading}>
                {saving ? "Saving…" : "Save draft"}
              </button>
            </div>
          </div>

          {saveMsg && (
            <div className={`save-toast save-toast--${saveMsg.type}`}>{saveMsg.text}</div>
          )}

          {!databaseReady && (
            <div className="save-toast save-toast--err">
              Database tables are not ready. You can fill the form and click Save — the API will respond but
              nothing will be stored until your senior finishes the DB.
            </div>
          )}

          <div className="admin-grid">
            <div>
              <div className="panel">
                <div className="panel-h serif">Project details</div>
                <div className="panel-sub">Saved via POST/PATCH /v1/projects</div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Project title</label>
                    <input
                      placeholder="e.g. Of Tigers & Twilight"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Theme</label>
                    <input
                      placeholder="e.g. Forest Royal"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row three">
                  <div className="form-field">
                    <label>Event type</label>
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                      <option>Wedding</option>
                      <option>Sangeet</option>
                      <option>Mehendi</option>
                      <option>Haldi</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Event date</label>
                    <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Guest count</label>
                    <input
                      placeholder="e.g. 380"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Venue</label>
                    <input
                      placeholder="Aman-i-Khás…"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>City</label>
                    <div className="city-select-wrap">
                      <input
                        placeholder="e.g. Ranthambore"
                        value={city}
                        onFocus={() => setCityDropdownOpen(true)}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setCityDropdownOpen(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setCityDropdownOpen(false), 120);
                        }}
                      />
                      {cityDropdownOpen && (
                        <div className="city-dropdown" role="listbox" aria-label="City options">
                          {filteredCities.length === 0 ? (
                            <div className="city-dropdown-empty">No matching city found</div>
                          ) : (
                            filteredCities.map((cityName) => (
                              <button
                                key={cityName}
                                type="button"
                                className="city-option"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setCity(cityName);
                                  setCityDropdownOpen(false);
                                }}
                              >
                                {cityName}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="form-row full">
                  <div className="form-field">
                    <label>Narrative</label>
                    <textarea
                      placeholder="A four-day affair…"
                      value={narrative}
                      onChange={(e) => setNarrative(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-h serif">Photographs & films</div>
                <div className="panel-sub">
                  Click or drag files from your device · JPG, PNG, HEIC, MP4, MOV
                  {!projectId && databaseReady && " · A draft is created automatically on first upload"}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPT_TYPES}
                  className="sr-only"
                  aria-hidden
                  onChange={onFileInputChange}
                />
                <input
                  ref={coverInputRef}
                  type="file"
                  multiple
                  accept={ACCEPT_TYPES}
                  className="sr-only"
                  aria-hidden
                  onChange={onCoverInputChange}
                />

                <div className="form-row">
                  <div
                    className={`dropzone${dragOver ? " drag" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={openFilePicker}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openFilePicker();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                    }}
                    onDrop={onDrop}
                  >
                    <div className="dz-title">{uploading ? "Uploading…" : "Gallery media upload"}</div>
                    <div className="dz-sub">Images/videos that should appear in project gallery</div>
                    <div className="dz-btn" aria-hidden>
                      Browse gallery files
                    </div>
                  </div>
                  <div
                    className="dropzone"
                    role="button"
                    tabIndex={0}
                    onClick={openCoverPicker}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openCoverPicker();
                      }
                    }}
                  >
                    <div className="dz-title">{uploading ? "Uploading…" : "Cover media upload"}</div>
                    <div className="dz-sub">Upload dedicated cover options and choose one as cover</div>
                    <div className="dz-btn" aria-hidden>
                      Browse cover files
                    </div>
                  </div>
                </div>

                {previews.length > 0 && (
                  <>
                    <div className="panel-sub" style={{ marginTop: 14 }}>Gallery uploads</div>
                    <div className="thumbs">
                      {previews.filter((p) => p.source === "gallery").map((p) => (
                        <div
                          key={p.key}
                          className="thumb"
                          style={
                            p.previewUrl
                              ? { backgroundImage: `url('${p.previewUrl}')` }
                              : { background: "var(--paper)" }
                          }
                        >
                          <div className="meta">
                            <span>
                              {p.status === "uploading"
                                ? "…"
                                : p.status === "done"
                                  ? "✓"
                                  : p.status === "error"
                                    ? "!"
                                    : "·"}
                            </span>
                            <span>{p.file.name.slice(0, 12)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="panel-sub" style={{ marginTop: 14 }}>Cover uploads</div>
                    <div className="thumbs">
                      {previews.filter((p) => p.source === "cover").map((p) => (
                        <div
                          key={p.key}
                          className="thumb"
                          style={
                            p.previewUrl
                              ? { backgroundImage: `url('${p.previewUrl}')` }
                              : { background: "var(--paper)" }
                          }
                        >
                          {p.isCover && <span className="cover-flag">Cover</span>}
                          <div className="meta">
                            <span>
                              {p.status === "uploading"
                                ? "…"
                                : p.status === "done"
                                  ? "✓"
                                  : p.status === "error"
                                    ? "!"
                                    : "·"}
                            </span>
                            <span>{p.file.name.slice(0, 12)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <StyleTagPicker
                open={tagPickerOpen}
                selectedTags={styleTags}
                onClose={() => setTagPickerOpen(false)}
                onApply={applyStyleTags}
              />

              <SimpleColorPicker
                open={colorPickerOpen}
                title={editingSwatchIdx !== null ? "Change this colour" : "Add a colour"}
                initialHex={
                  editingSwatchIdx !== null ? palette[editingSwatchIdx] : undefined
                }
                onClose={() => {
                  setColorPickerOpen(false);
                  setEditingSwatchIdx(null);
                }}
                onPick={onColorPicked}
              />

              <div className="panel">
                <div className="panel-h serif">Palette & style</div>
                <div className="panel-sub">Choose colours and style words for this project.</div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Colour palette</label>
                    <div className="pal-pick">
                      {palette.map((hex, i) => (
                        <button
                          key={`${hex}-${i}`}
                          type="button"
                          className="sw"
                          style={{ background: hex }}
                          title="Tap to change colour"
                          aria-label="Change colour"
                          onClick={() => openColorPicker(i)}
                        />
                      ))}
                      <button
                        type="button"
                        className="add"
                        title="Add a colour"
                        aria-label="Add a colour"
                        onClick={() => openColorPicker(null)}
                      >
                        <span className="add-label">+</span>
                        <span className="add-text">Colour</span>
                      </button>
                    </div>
                    <div className="panel-sub" style={{ marginTop: 8 }}>
                      {palette.length === 0
                        ? 'Tap "+ Colour" — slide the rainbow and square for any shade.'
                        : 'Tap "+ Colour" for more, or tap a square to change it.'}
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Setting</label>
                    <select value={setting} onChange={(e) => setSetting(e.target.value)}>
                      <option>Outdoor</option>
                      <option>Indoor</option>
                      <option>Mixed</option>
                      <option>Destination</option>
                    </select>
                  </div>
                </div>
                <div className="form-row full">
                  <div className="form-field">
                    <label>Style tags{styleTags.length > 0 ? ` · ${styleTags.length} added` : ""}</label>
                    <div className="tag-cloud">
                      {styleTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="t"
                          title="Remove tag"
                          onClick={() => removeStyleTag(tag)}
                        >
                          {tag} <span className="x">×</span>
                        </button>
                      ))}
                      <button type="button" className="t-add" onClick={() => setTagPickerOpen(true)}>
                        + Add style tag
                      </button>
                    </div>
                    <div className="panel-sub" style={{ marginTop: 8 }}>
                      Tap + to search, pick suggestions, or add a new tag.
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-h serif">Access & permissions</div>
                <div className="panel-sub">Who on the team can see and share this project.</div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Visible to</label>
                    <select value={visibleTo} onChange={(e) => setVisibleTo(e.target.value)}>
                      <option>Whole team</option>
                      <option>Curators & Owner only</option>
                      <option>Specific people</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Shareable by</label>
                    <select value={shareableBy} onChange={(e) => setShareableBy(e.target.value)}>
                      <option>Curators & Owner</option>
                      <option>Whole team</option>
                      <option>Owner only</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Owner of record</label>
                    <input value={ownerOfRecord} onChange={(e) => setOwnerOfRecord(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Photo credit</label>
                    <input
                      placeholder="e.g. The Rabbit Hole Co."
                      value={photoCredit}
                      onChange={(e) => setPhotoCredit(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="publish-bar">
                <div className="left">
                  <span className="status-dot" />
                  <span className="status-txt">
                    {projectId ? `Draft · ${projectId.slice(0, 8)}…` : "Draft · not saved yet"}
                    {previews.filter((p) => p.status === "done").length > 0 &&
                      ` · ${previews.filter((p) => p.status === "done").length} uploaded`}
                  </span>
                </div>
                <div className="right">
                  <button
                    type="button"
                    className="btn-line"
                    onClick={saveDraft}
                    disabled={saving || uploading}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    className="btn-fill"
                    onClick={publish}
                    disabled={saving || uploading}
                  >
                    Publish to library
                  </button>
                </div>
              </div>
            </div>

            <aside className="aside">
              <h3>Readiness</h3>
              <div className="checklist">
                <div
                  className={`item${
                    title && theme && eventDate && guestCount && venue && city ? " done" : ""
                  }`}
                >
                  <div className="bx">
                    {title && theme && eventDate && guestCount && venue && city ? "✓" : ""}
                  </div>
                  <div className="lbl">Title & basics filled</div>
                </div>
                <div className={`item${databaseReady ? " done" : ""}`}>
                  <div className="bx">{databaseReady ? "✓" : ""}</div>
                  <div className="lbl">Database ready</div>
                </div>
                <div
                  className={`item${
                    previews.some((p) => p.status === "done" && p.source === "gallery") ? " done" : ""
                  }`}
                >
                  <div className="bx">
                    {previews.some((p) => p.status === "done" && p.source === "gallery") ? "✓" : ""}
                  </div>
                  <div className="lbl">Gallery media uploaded</div>
                </div>
                <div
                  className={`item${
                    previews.some((p) => p.status === "done" && p.isCover) || coverUrl ? " done" : ""
                  }`}
                >
                  <div className="bx">
                    {previews.some((p) => p.status === "done" && p.isCover) || coverUrl ? "✓" : ""}
                  </div>
                  <div className="lbl">Cover image chosen</div>
                </div>
                <div className={`item${palette.length > 0 ? " done" : ""}`}>
                  <div className="bx">{palette.length > 0 ? "✓" : ""}</div>
                  <div className="lbl">Palette added</div>
                </div>
                <div className={`item${styleTags.length > 0 ? " done" : ""}`}>
                  <div className="bx">{styleTags.length > 0 ? "✓" : ""}</div>
                  <div className="lbl">Style tags added</div>
                </div>
                <div className={`item${narrative.trim() ? " done" : ""}`}>
                  <div className="bx">{narrative.trim() ? "✓" : ""}</div>
                  <div className="lbl">Narrative written</div>
                </div>
                <div className={`item${photoCredit.trim() ? " done" : ""}`}>
                  <div className="bx">{photoCredit.trim() ? "✓" : ""}</div>
                  <div className="lbl">Photo credit added</div>
                </div>
              </div>

              <div className="atelier-tip">
                <div className="atelier-tip-kicker">Atelier tip</div>
                <div className="atelier-tip-title">A good narrative is two short paragraphs.</div>
                <p className="atelier-tip-body">
                  First paragraph: the world you built (textures, colours, moments). Second: the team &amp;
                  venue notes. It surfaces in search and helps the AI find similar projects.
                </p>
              </div>

              <div className="activity-panel">
                <h4 className="activity-title">Activity</h4>
                {activities.length === 0 ? (
                  <p className="activity-empty">Activity will appear here as you work on this project.</p>
                ) : (
                  <ul className="activity-list">
                    {activities.map((a) => {
                      const minsAgo = Math.max(
                        0,
                        Math.round((Date.now() - a.at.getTime()) / 60000),
                      );
                      const when = minsAgo === 0 ? "just now" : `${minsAgo} min ago`;
                      return (
                        <li key={a.id} className="activity-item">
                          <span className="who">{a.who}</span> {a.what} · <span className="when">{when}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </section>
  );
}
