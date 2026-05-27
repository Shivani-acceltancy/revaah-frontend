import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, createStyleTagApi, listStyleTagsApi, type StyleTagItem } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (tags: string[]) => void;
  selectedTags: string[];
};

export default function StyleTagPicker({ open, onClose, onApply, selectedTags }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [allTags, setAllTags] = useState<StyleTagItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadTags = useCallback(async (q?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await listStyleTagsApi(q);
      setAllTags(res.items);
      setSuggestions(res.suggestions);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not load tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPending(selectedTags);
    setSearch("");
    setDropdownOpen(false);
    void loadTags();
  }, [open, selectedTags, loadTags]);

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

  useEffect(() => {
    if (!open || !dropdownOpen) return;
    const t = window.setTimeout(() => void loadTags(search.trim() || undefined), 200);
    return () => window.clearTimeout(t);
  }, [open, dropdownOpen, search, loadTags]);

  const pendingLower = useMemo(() => new Set(pending.map((t) => t.toLowerCase())), [pending]);

  const dropdownItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromApi = allTags.filter((t) => !pendingLower.has(t.name.toLowerCase()));
    if (!q) return fromApi.slice(0, 12);
    return fromApi.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 12);
  }, [allTags, pendingLower, search]);

  const canCreateNew =
    search.trim().length > 0 &&
    !pendingLower.has(search.trim().toLowerCase()) &&
    !allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase());

  const addTagName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || pendingLower.has(trimmed.toLowerCase())) return;
    setSaving(true);
    setErr(null);
    try {
      await createStyleTagApi(trimmed);
      setPending((prev) => [...prev, trimmed]);
      setSearch("");
      setDropdownOpen(false);
      await loadTags();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not add tag");
    } finally {
      setSaving(false);
    }
  };

  const removePending = (tag: string) => {
    setPending((prev) => prev.filter((t) => t !== tag));
  };

  const suggestedAvailable = suggestions.filter((s) => !pendingLower.has(s.toLowerCase()));

  if (!open) return null;

  return (
    <div className="tag-picker-backdrop" role="presentation">
      <div
        ref={panelRef}
        className="tag-picker-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-picker-title"
      >
        <h3 id="tag-picker-title" className="tag-picker-title">
          Add style tags
        </h3>
        <p className="tag-picker-hint">Search saved tags or pick a suggestion below.</p>

        {err && <div className="tag-picker-err">{err}</div>}

        <div className="tag-picker-search-wrap">
          <input
            className="tag-picker-search"
            placeholder="Search or type a new tag…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
          />
          {dropdownOpen && (
            <div className="tag-picker-dropdown">
              {loading && <div className="tag-picker-dropdown-empty">Loading…</div>}
              {!loading && dropdownItems.length === 0 && !canCreateNew && (
                <div className="tag-picker-dropdown-empty">No tags found</div>
              )}
              {dropdownItems.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="tag-picker-dropdown-item"
                  onClick={() => void addTagName(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
              {canCreateNew && (
                <button
                  type="button"
                  className="tag-picker-dropdown-item tag-picker-dropdown-item--new"
                  onClick={() => void addTagName(search.trim())}
                >
                  + Add “{search.trim()}”
                </button>
              )}
            </div>
          )}
        </div>

        {pending.length > 0 && (
          <div className="tag-picker-selected">
            <div className="tag-picker-label">Selected for this project</div>
            <div className="tag-cloud">
              {pending.map((tag) => (
                <button key={tag} type="button" className="t" onClick={() => removePending(tag)}>
                  {tag} <span className="x">×</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestedAvailable.length > 0 && (
          <div className="tag-picker-suggestions">
            <div className="tag-picker-label">Suggestions</div>
            <div className="tag-cloud">
              {suggestedAvailable.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="t suggest"
                  disabled={saving}
                  onClick={() => void addTagName(tag)}
                >
                  + {tag}
                </button>
              ))}
            </div>
            <p className="tag-picker-sub">Tap a suggestion to add it. New tags are saved for future projects.</p>
          </div>
        )}

        <div className="tag-picker-actions">
          <button type="button" className="tag-picker-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tag-picker-use"
            disabled={saving}
            onClick={() => {
              onApply(pending);
              onClose();
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
