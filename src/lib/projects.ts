import { GALLERY_CARDS, type GalleryCard } from "./atelier";
import type { GallerySpan, ProjectDetail, ProjectListItem, ProjectStats } from "../types/project";

const SPANS: GallerySpan[] = ["span-7", "span-5", "span-4", "span-4", "span-4", "span-8", "span-4"];

const EVENT_LABELS: Record<string, string> = {
  WEDDING: "Wedding",
  SANGEET: "Sangeet",
  MEHENDI: "Mehendi",
  HALDI: "Haldi",
  RECEPTION: "Reception",
  ENGAGEMENT: "Engagement",
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

function cityName(city: ProjectListItem["city"]): string {
  if (!city) return "";
  return typeof city === "string" ? city : city.name;
}

function venueName(venue: ProjectListItem["venue"]): string {
  if (!venue) return "";
  return typeof venue === "string" ? venue : venue.name;
}

function formatEventDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function buildSubtitle(item: ProjectListItem): string {
  if (item.subtitle) return item.subtitle;
  const events = (item.event_types ?? [])
    .map((e) => EVENT_LABELS[e] ?? e)
    .join(" · ");
  const parts = [events, item.theme, formatEventDate(item.event_date)].filter(Boolean);
  return parts.join(" · ");
}

export function projectToGalleryCard(item: ProjectListItem, index: number): GalleryCard & { id: string } {
  const city = cityName(item.city);
  const venue = venueName(item.venue);
  const location = [city, venue].filter(Boolean).join(" · ");

  return {
    id: item.id,
    span: item.grid_span ?? SPANS[index % SPANS.length],
    image: item.cover_url || PLACEHOLDER_IMAGE,
    city: location || "—",
    name: item.title,
    sub: buildSubtitle(item),
    palette: item.palette?.length ? item.palette : ["#5C1A2B", "#B8893A", "#E8C8B8", "#FAF6F0"],
  };
}

export function normalizeProjectStats(raw: unknown): ProjectStats {
  const fallback = { projects: 0, cities: 0, venues: 0, assets: 0 };
  if (!raw || typeof raw !== "object") return fallback;

  const r = raw as Record<string, unknown>;
  if (r.stats && typeof r.stats === "object") {
    const s = r.stats as Record<string, number>;
    return {
      projects: s.projects ?? 0,
      cities: s.cities ?? 0,
      venues: s.venues ?? 0,
      assets: s.assets ?? 0,
    };
  }

  return {
    projects: Number(r.project_count ?? r.projects ?? 0),
    cities: Number(r.city_count ?? r.cities ?? 0),
    venues: Number(r.venue_count ?? r.venues ?? 0),
    assets: Number(r.asset_count ?? r.assets ?? 0),
  };
}

export function parseProjectsList(raw: unknown): ProjectListItem[] {
  if (Array.isArray(raw)) return raw as ProjectListItem[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return (raw as { items: ProjectListItem[] }).items;
  }
  return [];
}

export function staticGalleryWithIds(): (GalleryCard & { id: string })[] {
  return GALLERY_CARDS.map((card, i) => ({
    ...card,
    id: `static-${i}`,
  }));
}

export function detailCity(detail: ProjectDetail): string {
  if (!detail.city) return "";
  return typeof detail.city === "string" ? detail.city : detail.city.name;
}

export function detailVenue(detail: ProjectDetail): string {
  if (!detail.venue) return "";
  return typeof detail.venue === "string" ? detail.venue : detail.venue.name;
}

export function detailEventTypes(detail: ProjectDetail): string {
  return (detail.event_types ?? []).map((e) => EVENT_LABELS[e] ?? e).join(" · ");
}

export function detailPalette(detail: ProjectDetail): string[] {
  if (!detail.palette?.length) return ["#5C1A2B", "#B8893A", "#3E4A2B", "#E8C8B8"];
  return detail.palette.map((p) => (typeof p === "string" ? p : p.hex));
}

export function detailTags(detail: ProjectDetail): string[] {
  if (!detail.style_tags?.length) return [];
  return detail.style_tags.map((t) => (typeof t === "string" ? t : t.name));
}

export { EVENT_LABELS, PLACEHOLDER_IMAGE };
