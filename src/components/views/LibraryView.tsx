import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchProjectStatsApi, listMoodboardApi, listProjectsApi } from "../../lib/api";
import type { GalleryCard } from "../../lib/atelier";
import { projectToGalleryCard } from "../../lib/projects";
import type { LibraryMode, SessionUser } from "../../hooks/useAtelier";
import type { AtelierView } from "../../lib/atelier";
import TopBar from "../layout/TopBar";

type Props = {
  onNavigate: (view: AtelierView) => void;
  onShowLibrary: (mode: LibraryMode) => void;
  onLogout: () => void;
  libraryMode: LibraryMode;
  onOpenProject: (projectId: string, returnTo?: LibraryMode) => void;
  projectsRefreshKey: number;
  databaseReady: boolean;
  currentUser?: SessionUser | null;
};

const FILTERS = ["All", "Draft", "Wedding", "Sangeet", "Mehendi", "Haldi", "Reception", "Engagement"] as const;

const FILTER_TO_API: Record<string, string | undefined> = {
  All: undefined,
  Draft: undefined,
  Wedding: "WEDDING",
  Sangeet: "SANGEET",
  Mehendi: "MEHENDI",
  Haldi: "HALDI",
  Reception: "RECEPTION",
  Engagement: "ENGAGEMENT",
};

type GalleryCardWithId = GalleryCard & { id: string };

export default function LibraryView({
  onNavigate,
  onShowLibrary,
  onLogout,
  libraryMode,
  onOpenProject,
  projectsRefreshKey,
  databaseReady,
  currentUser,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");
  const [atelierTab, setAtelierTab] = useState<"projects" | "moodboard">("projects");
  const [cards, setCards] = useState<GalleryCardWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [stats, setStats] = useState({ projects: 412, cities: 31, venues: 87, assets: 24000 });
  const showHero = libraryMode === "atelier";
  const activeListMode = showHero ? atelierTab : libraryMode;

  useEffect(() => {
    if (libraryMode === "atelier") {
      setAtelierTab("projects");
    }
  }, [libraryMode]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const eventType = FILTER_TO_API[activeFilter];
      const status = activeFilter === "Draft" ? "DRAFT" : "PUBLISHED";
      const mine = libraryMode === "projects" && currentUser?.role !== "OWNER";
      const items =
        activeListMode === "moodboard"
          ? await listMoodboardApi({ eventType })
          : await listProjectsApi({ status, eventType, mine });
      setCards(items.map((item, i) => projectToGalleryCard(item, i)));
    } catch (e) {
      setCards([]);
      if (e instanceof ApiError && !e.isDatabaseNotReady) {
        setListError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter, activeListMode, currentUser?.role, libraryMode]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects, projectsRefreshKey]);

  useEffect(() => {
    if (!databaseReady) return;
    fetchProjectStatsApi()
      .then(setStats)
      .catch(() => {});
  }, [databaseReady, projectsRefreshKey]);

  return (
    <section id="view-library" className="view active">
      <TopBar
        onNavigate={onNavigate}
        onShowLibrary={onShowLibrary}
        onLogout={onLogout}
        libraryMode={libraryMode}
        currentUser={currentUser}
      />

      {showHero && (
        <section className="hero">
          <div className="hero-left">
            <div className="eyebrow">A living lookbook · est. 2014</div>
            <h1 className="serif">
              Curated <em>worlds</em>
              <br />
              for every celebration.
            </h1>
            <p className="lede">
              Four hundred and twelve weddings, eighty-seven palaces, thirty-one cities. Each
              project documented, tagged, and searchable in seconds — so when the conversation
              turns to Ranthambore or a peach-and-marigold sangeet, the right reference is one
              keystroke away.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <div className="num">{stats.projects}</div>
                <div className="lbl">Projects</div>
              </div>
              <div className="stat">
                <div className="num">{stats.cities}</div>
                <div className="lbl">Cities</div>
              </div>
              <div className="stat">
                <div className="num">{stats.venues}</div>
                <div className="lbl">Venues</div>
              </div>
              <div className="stat">
                <div className="num">
                  {stats.assets >= 1000 ? `${Math.round(stats.assets / 1000)}k` : stats.assets}
                </div>
                <div className="lbl">Assets</div>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-img a hero-img-empty">
              <div className="tag">No featured project image</div>
            </div>
            <div className="hero-img b hero-img-empty">
              <div className="tag">Upload a cover to feature here</div>
            </div>
          </div>
        </section>
      )}

      <div className="filter-row">
        <span className="filter-label">Filter</span>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`chip${activeFilter === f ? " on" : ""}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
        <span className="spacer" />
        <div className="view-toggle">
          <button
            type="button"
            className={activeListMode !== "moodboard" ? "on" : ""}
            onClick={() => (showHero ? setAtelierTab("projects") : onShowLibrary("projects"))}
          >
            Projects
          </button>
          <button
            type="button"
            className={activeListMode === "moodboard" ? "on" : ""}
            onClick={() => (showHero ? setAtelierTab("moodboard") : onShowLibrary("moodboard"))}
          >
            Moodboard
          </button>
        </div>
      </div>

      {loading && (
        <div className="save-toast">
          Loading {activeListMode === "moodboard" ? "moodboard" : "projects"}…
        </div>
      )}
      {listError && <div className="save-toast save-toast--err">{listError}</div>}
      {!loading && cards.length === 0 && (
        <div className="save-toast">
          {activeListMode === "moodboard"
            ? "No moodboard yet. Add moodboard."
            : "No projects yet. Create new project."}
        </div>
      )}

      <section className="gallery">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`card ${card.span}`}
            onClick={() => onOpenProject(card.id, libraryMode)}
            onKeyDown={(e) => e.key === "Enter" && onOpenProject(card.id, libraryMode)}
            role="button"
            tabIndex={0}
          >
            {card.image ? (
              <div className="img" style={{ backgroundImage: `url('${card.image}')` }} />
            ) : (
              <div className="img img-empty">No cover image uploaded yet</div>
            )}
            <div className="meta">
              <div className="city">{card.city}</div>
              <div className="name serif">{card.name}</div>
              <div className="sub">{card.sub}</div>
              <div className="palette">
                {card.palette.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <div style={{ height: 120 }} />
    </section>
  );
}
