/** Grid card from GET /projects (published library) */
export type ProjectListItem = {
  id: string;
  title: string;
  theme?: string;
  city?: { id: string; name: string } | string;
  venue?: { id: string; name: string } | string;
  event_types?: string[];
  event_date?: string;
  subtitle?: string;
  cover_url?: string;
  palette?: string[];
  grid_span?: GallerySpan;
  published_at?: string;
};

export type GallerySpan = "span-4" | "span-5" | "span-6" | "span-7" | "span-8";

export type ProjectsListResponse = {
  items: ProjectListItem[];
  total?: number;
  page?: number;
};

export type ProjectStats = {
  projects: number;
  cities: number;
  venues: number;
  assets: number;
};

export type ProjectGalleryAsset = {
  id: string;
  kind?: string;
  caption?: string;
  caption_sub?: string;
  sort_order?: number;
  is_cover?: boolean;
  show_in_gallery?: boolean;
  urls?: { thumb?: string; medium?: string; large?: string };
  layout_hint?: "full" | "half" | "third" | "two_third";
};

export type ProjectDetail = {
  id: string;
  title: string;
  theme?: string;
  status?: string;
  setting?: string;
  photo_credit?: string;
  visible_to?: "WHOLE_TEAM" | "CURATORS_AND_OWNER" | "SPECIFIC_USERS";
  shareable_by?: string;
  created_by?: string;
  can_edit?: boolean;
  can_publish?: boolean;
  can_delete?: boolean;
  venue?: { id: string; name: string } | string;
  city?: { id: string; name: string } | string;
  event_types?: string[];
  event_date?: string;
  guest_count?: number;
  duration_days?: number;
  narrative?: string;
  palette?: string[] | { hex: string; source?: string }[];
  style_tags?: { id: string; name: string }[] | string[];
  cover_url?: string;
  gallery?: ProjectGalleryAsset[];
  all_assets?: ProjectGalleryAsset[];
  credits?: {
    decor_lead?: string;
    florals?: string;
    lighting?: string;
    photography?: string;
  };
  published_at?: string;
  in_moodboard?: boolean;
};
