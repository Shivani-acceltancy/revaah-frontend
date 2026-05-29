import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchProjectStatsApi, listMoodboardApi, listProjectsApi } from "../../lib/api";
import type { GalleryCard } from "../../lib/atelier";
import { projectToGalleryCard } from "../../lib/projects";
import { canCreateProjects } from "../../lib/roles";
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
  const [stats, setStats] = useState({ projects: 0, cities: 0, venues: 0, assets: 0 });
  const showHero = libraryMode === "atelier";
  const activeListMode = showHero ? atelierTab : libraryMode;
  const canSeeDrafts = canCreateProjects(currentUser?.role);
  const visibleFilters = canSeeDrafts ? FILTERS : FILTERS.filter((f) => f !== "Draft");

  useEffect(() => {
    if (libraryMode === "atelier") {
      setAtelierTab("projects");
    }
  }, [libraryMode]);

  useEffect(() => {
    if (!canSeeDrafts && activeFilter === "Draft") {
      setActiveFilter("All");
    }
  }, [activeFilter, canSeeDrafts]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const eventType = FILTER_TO_API[activeFilter];
      const status = activeFilter === "Draft" ? "DRAFT" : "PUBLISHED";
      const mine = activeFilter === "Draft" && currentUser?.role !== "OWNER";
      const items =
        activeListMode === "moodboard"
          ? await listMoodboardApi({ eventType })
          : await listProjectsApi({ status, eventType, mine: activeFilter === "Draft" ? mine : false });
      setCards(items.map((item, i) => projectToGalleryCard(item, i)));
    } catch (e) {
      setCards([]);
      if (e instanceof ApiError && !e.isDatabaseNotReady) {
        setListError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter, activeListMode, currentUser?.role]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects, projectsRefreshKey]);

  useEffect(() => {
    if (!databaseReady) return;
    fetchProjectStatsApi()
      .then(setStats)
      .catch(() => {});
  }, [databaseReady, projectsRefreshKey]);

  const returnMode: LibraryMode = activeListMode === "moodboard" ? "moodboard" : "atelier";

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
              Browse published projects in the shared library. Save favourites to the team moodboard
              for quick reference across weddings, cities, and palettes.
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
        {visibleFilters.map((f) => (
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
        {showHero && (
          <div className="view-toggle">
            <button
              type="button"
              className={activeListMode !== "moodboard" ? "on" : ""}
              onClick={() => setAtelierTab("projects")}
            >
              Projects
            </button>
            <button
              type="button"
              className={activeListMode === "moodboard" ? "on" : ""}
              onClick={() => setAtelierTab("moodboard")}
            >
              Moodboard
            </button>
          </div>
        )}
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
            ? "No moodboard yet. Add a project from Atelier."
            : activeFilter === "Draft"
              ? "No drafts yet. Create a new project."
              : "No projects yet."}
        </div>
      )}

      <section className="gallery">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`card ${card.span}`}
            onClick={() => onOpenProject(card.id, returnMode)}
            onKeyDown={(e) => e.key === "Enter" && onOpenProject(card.id, returnMode)}
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
