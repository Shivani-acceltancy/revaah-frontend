import type {
  ProjectDetail,
  ProjectGalleryAsset,
  ProjectListItem,
  ProjectsListResponse,
  ProjectStats,
} from "../types/project";
import { normalizeProjectStats, parseProjectsList } from "./projects";

/** Default: Vite proxy `/v1` → target from `vite.config.ts` and `.env` */
function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw === undefined || raw === "") {
    return "/v1";
  }
  return String(raw).replace(/\/$/, "");
}

const API_BASE = resolveApiBase();

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number") return String(value);
  return undefined;
}

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function normalizeAsset(raw: unknown, idx: number) {
  const r = asRecord(raw);
  const urlsRaw = asRecord(r.urls ?? r.derivatives);
  const directUrl =
    asString(r.url) ??
    asString(r.media_url) ??
    asString(r.mediaUrl) ??
    asString(r.public_url) ??
    asString(r.publicUrl);
  const kindRaw = asString(r.kind) ?? asString(r.type) ?? asString(r.media_type) ?? asString(r.mediaType);
  const kind = kindRaw?.toUpperCase().includes("VIDEO") ? "VIDEO" : "IMAGE";

  const layoutHintRaw = asString(r.layout_hint) ?? asString(r.layoutHint);
  const layout_hint: ProjectGalleryAsset["layout_hint"] =
    layoutHintRaw === "full" ||
    layoutHintRaw === "half" ||
    layoutHintRaw === "third" ||
    layoutHintRaw === "two_third"
      ? layoutHintRaw
      : undefined;

  return {
    id: asString(r.id) ?? asString(r.asset_id) ?? `asset-${idx}`,
    kind,
    caption: asString(r.caption),
    caption_sub: asString(r.caption_sub) ?? asString(r.captionSub),
    sort_order: Number(r.sort_order ?? r.sortOrder ?? idx),
    is_cover: asBool(r.is_cover) ?? asBool(r.isCover) ?? asBool(r.cover) ?? false,
    show_in_gallery: asBool(r.show_in_gallery) ?? asBool(r.showInGallery) ?? true,
    layout_hint,
    url: directUrl,
    media_url: directUrl,
    public_url: directUrl,
    urls: {
      thumb: asString(urlsRaw.thumb) ?? directUrl,
      medium: asString(urlsRaw.medium) ?? directUrl,
      large: asString(urlsRaw.large) ?? directUrl,
    },
  };
}

function normalizeProjectDetail(raw: unknown): ProjectDetail {
  const r = asRecord(raw);
  const allAssetsRaw =
    (Array.isArray(r.all_assets) && r.all_assets) ||
    (Array.isArray(r.allAssets) && r.allAssets) ||
    (Array.isArray(r.assets) && r.assets) ||
    (Array.isArray(r.media) && r.media) ||
    [];
  const galleryRaw =
    (Array.isArray(r.gallery) && r.gallery) ||
    (Array.isArray(r.gallery_assets) && r.gallery_assets) ||
    (Array.isArray(r.galleryAssets) && r.galleryAssets) ||
    [];

  const all_assets = allAssetsRaw.map((a, idx) => normalizeAsset(a, idx));
  const gallery = (galleryRaw.length ? galleryRaw : all_assets)
    .map((a, idx) => normalizeAsset(a, idx))
    .filter((a) => a.show_in_gallery !== false);

  const coverFromAsset =
    all_assets.find((a) => a.is_cover)?.urls?.large ??
    all_assets.find((a) => a.is_cover)?.urls?.medium ??
    all_assets.find((a) => a.is_cover)?.urls?.thumb ??
    gallery[0]?.urls?.large ??
    gallery[0]?.urls?.medium ??
    gallery[0]?.urls?.thumb;

  const eventTypesRaw = r.event_types ?? r.eventTypes;
  const event_types = Array.isArray(eventTypesRaw)
    ? eventTypesRaw.map((v) => String(v))
    : typeof eventTypesRaw === "string"
      ? eventTypesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const cityName = asString(r.city_name) ?? asString(asRecord(r.city).name);
  const venueName = asString(r.venue_name) ?? asString(asRecord(r.venue).name);

  return {
    ...(r as ProjectDetail),
    id: asString(r.id) ?? "",
    title: asString(r.title) ?? "Untitled project",
    city:
      typeof r.city === "object" && r.city
        ? (r.city as ProjectDetail["city"])
        : cityName
          ? { id: asString(r.city_id) ?? "", name: cityName }
          : undefined,
    venue:
      typeof r.venue === "object" && r.venue
        ? (r.venue as ProjectDetail["venue"])
        : venueName
          ? { id: asString(r.venue_id) ?? "", name: venueName }
          : undefined,
    event_types,
    cover_url: asString(r.cover_url) ?? asString(r.coverUrl) ?? coverFromAsset,
    gallery,
    all_assets,
    in_moodboard: Boolean(r.in_moodboard ?? r.inMoodboard),
    can_edit: Boolean(r.can_edit ?? r.canEdit),
    can_delete: Boolean(r.can_delete ?? r.canDelete),
    can_share: Boolean(r.can_share ?? r.canShare),
    can_add_to_moodboard: Boolean(r.can_add_to_moodboard ?? r.canAddToMoodboard),
    can_remove_from_moodboard: Boolean(r.can_remove_from_moodboard ?? r.canRemoveFromMoodboard),
    share_requires_approval: Boolean(r.share_requires_approval ?? r.shareRequiresApproval),
    share_request_pending: Boolean(r.share_request_pending ?? r.shareRequestPending),
    share_request_approved: Boolean(r.share_request_approved ?? r.shareRequestApproved),
  };
}

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ code?: string; message?: string }>;
  };
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  get isDatabaseNotReady(): boolean {
    return (
      this.code === "DATABASE_NOT_CONNECTED" ||
      this.code === "DATABASE_TABLES_MISSING" ||
      this.status === 503
    );
  }
}

const FETCH_TIMEOUT_MS = 15000;
const PROJECT_DETAIL_TIMEOUT_MS = 45000;
const UPLOAD_TIMEOUT_MS = 120000;

function authHeadersMultipart(): HeadersInit {
  const token = sessionStorage.getItem("atelier_access_token");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem("atelier_access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(0, "TIMEOUT", "Backend did not respond in time. Please retry.");
    }
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach backend API. Start: mvn spring-boot:run in backend project.");
  } finally {
    clearTimeout(timer);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let code = "HTTP_" + res.status;
  let message = res.statusText;
  try {
    const body = (await res.json()) as ApiErrorBody;
    code = body.error?.code ?? code;
    message = body.error?.message ?? message;
    const details = body.error?.details ?? [];
    if (details.length > 0) {
      const detailsText = details
        .map((d) => [d.code, d.message].filter(Boolean).join(": "))
        .filter(Boolean)
        .join(" | ");
      if (detailsText) {
        message = `${message} (${detailsText})`;
      }
    }
  } catch {
    /* ignore */
  }
  return new ApiError(res.status, code, message);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

export type SystemStatus = {
  api: string;
  database_ready: boolean;
  database_status: string;
  message: string;
};

let systemStatusCache: SystemStatus | null = null;
let systemStatusCacheAt = 0;
let systemStatusInflight: Promise<SystemStatus> | null = null;
const SYSTEM_STATUS_CACHE_MS = 60 * 60 * 1000;
const SYSTEM_STATUS_CACHE_KEY = "atelier_system_status_cache_v1";

function readSystemStatusFromSession(): { payload: SystemStatus; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(SYSTEM_STATUS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { payload?: SystemStatus; ts?: number };
    if (!parsed?.payload || typeof parsed.ts !== "number") return null;
    return { payload: parsed.payload, ts: parsed.ts };
  } catch {
    return null;
  }
}

function writeSystemStatusToSession(payload: SystemStatus, ts: number) {
  try {
    sessionStorage.setItem(SYSTEM_STATUS_CACHE_KEY, JSON.stringify({ payload, ts }));
  } catch {
    // ignore storage errors
  }
}

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: { id: string; email: string; fullName: string; role: string };
};

export async function fetchSystemStatus(
  options: { force?: boolean } = {},
): Promise<SystemStatus> {
  const now = Date.now();
  if (!options.force && !systemStatusCache) {
    const cached = readSystemStatusFromSession();
    if (cached && now - cached.ts < SYSTEM_STATUS_CACHE_MS) {
      systemStatusCache = cached.payload;
      systemStatusCacheAt = cached.ts;
      return cached.payload;
    }
  }
  if (!options.force && systemStatusCache && now - systemStatusCacheAt < SYSTEM_STATUS_CACHE_MS) {
    return systemStatusCache;
  }
  if (!options.force && systemStatusInflight) {
    return systemStatusInflight;
  }

  systemStatusInflight = (async () => {
    const res = await fetchWithTimeout(`${API_BASE}/system/status`);
    if (!res.ok) throw new ApiError(res.status, "API_UNREACHABLE", "Cannot reach backend API");
    const payload = (await res.json()) as SystemStatus;
    systemStatusCache = payload;
    systemStatusCacheAt = Date.now();
    writeSystemStatusToSession(payload, systemStatusCacheAt);
    return payload;
  })();

  try {
    return await systemStatusInflight;
  } finally {
    systemStatusInflight = null;
  }
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/login", { email, password });
}

export async function uiPreviewLoginApi(): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/ui-preview");
}

export type MeResponse = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export async function fetchMeApi(): Promise<MeResponse> {
  return apiGet<MeResponse>("/auth/me");
}

export type InviteVerifyResponse = {
  valid: boolean;
  reason?: string | null;
  email?: string | null;
  fullName?: string | null;
};

export async function verifyInviteApi(token: string): Promise<InviteVerifyResponse> {
  const res = await fetchWithTimeout(
    `${API_BASE}/auth/invite/verify?token=${encodeURIComponent(token)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<InviteVerifyResponse>;
}

export async function acceptInviteApi(
  token: string,
  password: string,
  confirmPassword: string,
): Promise<{ success: boolean; message: string }> {
  return apiPost("/auth/invite/accept", { token, password, confirmPassword });
}

export type ProjectCreateBody = {
  title: string;
  theme?: string;
  eventTypes?: string[];
  eventDate?: string;
  guestCount?: number;
  setting?: "OUTDOOR" | "INDOOR" | "MIXED" | "DESTINATION";
  venueName?: string;
  cityName?: string;
  visibleTo?: "WHOLE_TEAM" | "CURATORS_AND_OWNER" | "SPECIFIC_USERS";
  shareableBy?: string;
  narrative?: string;
  photoCredit?: string;
  palette?: string[];
  styleTags?: string[];
  /** MVP: external cover URL until asset upload is wired (backend optional) */
  coverUrl?: string;
};

export type ListProjectsParams = {
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  eventType?: string;
  mine?: boolean;
  page?: number;
  limit?: number;
  q?: string;
};

function toSnakeProjectBody(body: Partial<ProjectCreateBody>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (body.title !== undefined) out.title = body.title;
  if (body.theme !== undefined) out.theme = body.theme;
  if (body.eventTypes !== undefined) out.event_types = body.eventTypes;
  if (body.eventDate !== undefined) out.event_date = body.eventDate;
  if (body.guestCount !== undefined) out.guest_count = body.guestCount;
  if (body.setting !== undefined) out.setting = body.setting;
  if (body.venueName !== undefined) out.venue_name = body.venueName;
  if (body.cityName !== undefined) out.city_name = body.cityName;
  if (body.visibleTo !== undefined) out.visible_to = body.visibleTo;
  if (body.shareableBy !== undefined) out.shareable_by = body.shareableBy;
  if (body.narrative !== undefined) out.narrative = body.narrative;
  if (body.photoCredit !== undefined) out.photo_credit = body.photoCredit;
  if (body.palette !== undefined) out.palette = body.palette;
  if (body.styleTags !== undefined) out.style_tags = body.styleTags;
  if (body.coverUrl !== undefined) out.cover_url = body.coverUrl;
  return out;
}

export async function listProjectsApi(params: ListProjectsParams = {}): Promise<ProjectListItem[]> {
  const qs = new URLSearchParams();
  qs.set("status", params.status ?? "PUBLISHED");
  if (params.mine !== undefined) qs.set("mine", String(params.mine));
  if (params.eventType) qs.set("event_type", params.eventType);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit ?? 48));
  if (params.q) qs.set("q", params.q);

  const raw = await apiGet<ProjectsListResponse | ProjectListItem[]>(`/projects?${qs}`);
  return parseProjectsList(raw);
}

export async function listMoodboardApi(params: ListProjectsParams = {}): Promise<ProjectListItem[]> {
  const qs = new URLSearchParams();
  if (params.eventType) qs.set("event_type", params.eventType);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit ?? 48));
  const suffix = qs.toString() ? `?${qs}` : "";
  const raw = await apiGet<ProjectsListResponse | ProjectListItem[]>(`/moodboard/items${suffix}`);
  return parseProjectsList(raw);
}

export async function checkMoodboardApi(projectId: string | number): Promise<boolean> {
  const raw = await apiGet<{ saved?: boolean }>(`/moodboard/items/check/${projectId}`);
  return Boolean(raw.saved);
}

export async function addToMoodboardApi(projectId: string | number) {
  const numericId = typeof projectId === "number" ? projectId : Number(projectId);
  return apiPost<{ status: string }>("/moodboard/items", {
    project_id: Number.isNaN(numericId) ? projectId : numericId,
  });
}

export async function removeFromMoodboardApi(projectId: string | number) {
  const res = await fetchWithTimeout(`${API_BASE}/moodboard/items/${projectId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ status: string }>;
}

export type StyleTagItem = { id: string; name: string };

export type StyleTagsListResponse = {
  items: StyleTagItem[];
  suggestions: string[];
};

export async function listStyleTagsApi(q?: string): Promise<StyleTagsListResponse> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiGet<StyleTagsListResponse>(`/tags${qs}`);
}

export async function createStyleTagApi(name: string): Promise<StyleTagItem> {
  return apiPost<StyleTagItem>("/tags", { name });
}

export async function fetchProjectStatsApi(): Promise<ProjectStats> {
  const raw = await apiGet<unknown>("/projects/stats");
  return normalizeProjectStats(raw);
}

export async function fetchProjectDetailApi(id: string | number): Promise<ProjectDetail> {
  const res = await fetchWithTimeout(
    `${API_BASE}/projects/${id}`,
    { headers: authHeaders() },
    PROJECT_DETAIL_TIMEOUT_MS,
  );
  if (!res.ok) throw await parseError(res);
  const raw = await res.json();
  return normalizeProjectDetail(raw);
}

export async function patchAssetApi(
  assetId: string,
  body: { is_cover?: boolean; show_in_gallery?: boolean },
): Promise<Record<string, unknown>> {
  return apiPatch<Record<string, unknown>>(`/assets/${assetId}`, body);
}

export async function createProjectApi(body: ProjectCreateBody) {
  return apiPost<{ id: string | number; status: string }>("/projects", toSnakeProjectBody(body));
}

export async function updateProjectApi(id: string | number, body: Partial<ProjectCreateBody>) {
  return apiPatch<{ id: string | number; status: string }>(`/projects/${id}`, toSnakeProjectBody(body));
}

export async function publishProjectApi(id: string | number) {
  return apiPost<{ id: string | number; status: string; published_at: string }>(`/projects/${id}/publish`);
}

export async function deleteProjectApi(id: string | number) {
  const res = await fetchWithTimeout(`${API_BASE}/projects/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ status: string }>;
}

export async function requestShareLinkApi(projectId: string | number) {
  return apiPost<{ status: string; id?: number }>(`/projects/${projectId}/share-request`, {});
}

export async function listShareRequestsApi() {
  return apiGet<Array<{ id: number; project_id: number; project_title?: string; requested_by: string; created_at: string }>>(
    "/team/share-requests",
  );
}

export async function approveShareRequestApi(requestId: number) {
  return apiPost<{ status: string }>(`/team/share-requests/${requestId}/approve`, {});
}

export type UploadedAsset = {
  id: string;
  processing_status?: string;
};

export async function uploadProjectAssetsApi(
  projectId: string | number,
  files: File[],
): Promise<UploadedAsset[]> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/assets/upload`, {
      method: "POST",
      headers: authHeadersMultipart(),
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<UploadedAsset[]>;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(0, "TIMEOUT", "Upload timed out. Try fewer or smaller files.");
    }
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "NETWORK_ERROR", "Upload failed — backend API is unreachable.");
  } finally {
    clearTimeout(timer);
  }
}

export type InviteUserBody = {
  email: string;
  fullName: string;
  role: "OWNER" | "CURATOR" | "MEMBER" | "READ_ONLY";
  department?: string;
};

export type InviteUserResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    status: string;
    emailSent: boolean;
  };
};

export async function inviteUserApi(body: InviteUserBody): Promise<InviteUserResponse> {
  return apiPost<InviteUserResponse>("/users", body);
}

export type TeamStats = {
  active_members: number;
  pending_invites: number;
  curators: number;
  members: number;
  shares_this_month: number;
};

export type TeamMemberRow = {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  role: string;
  department?: string;
  status: string;
  last_seen_at?: string;
  projects_count: number;
  shares_count: number;
  can_edit: boolean;
  can_suspend: boolean;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  invited_at: string | number;
  expires_at: string;
};

export type TeamDashboard = {
  stats: TeamStats;
  members: TeamMemberRow[];
  pending_invites: PendingInviteRow[];
};

let teamDashboardCache: TeamDashboard | null = null;
let teamDashboardCacheAt = 0;
let teamDashboardInflight: Promise<TeamDashboard> | null = null;
const TEAM_DASHBOARD_CACHE_MS = 30 * 1000;

function normalizeTeamDashboard(raw: Record<string, unknown>): TeamDashboard {
  const statsRaw = (raw.stats ?? {}) as Record<string, number>;
  const stats: TeamStats = {
    active_members: Number(statsRaw.active_members ?? statsRaw.activeMembers ?? 0),
    pending_invites: Number(statsRaw.pending_invites ?? statsRaw.pendingInvites ?? 0),
    curators: Number(statsRaw.curators ?? 0),
    members: Number(statsRaw.members ?? 0),
    shares_this_month: Number(statsRaw.shares_this_month ?? statsRaw.sharesThisMonth ?? 0),
  };
  const members = ((raw.members as TeamMemberRow[]) ?? []).map((m) => ({
    ...m,
    full_name: (m as TeamMemberRow).full_name ?? (m as { fullName?: string }).fullName ?? "",
    last_seen_at: (m as TeamMemberRow).last_seen_at ?? (m as { lastSeenAt?: string }).lastSeenAt,
    projects_count: Number((m as TeamMemberRow).projects_count ?? (m as { projectsCount?: number }).projectsCount ?? 0),
    shares_count: Number((m as TeamMemberRow).shares_count ?? (m as { sharesCount?: number }).sharesCount ?? 0),
    can_edit: Boolean((m as TeamMemberRow).can_edit ?? (m as { canEdit?: boolean }).canEdit),
    can_suspend: Boolean((m as TeamMemberRow).can_suspend ?? (m as { canSuspend?: boolean }).canSuspend),
  }));
  const pending_invites = ((raw.pending_invites ?? raw.pendingInvites) as PendingInviteRow[]) ?? [];
  return { stats, members, pending_invites };
}

export async function fetchTeamDashboardApi(
  options: { force?: boolean } = {},
): Promise<TeamDashboard> {
  const now = Date.now();
  if (!options.force && teamDashboardCache && now - teamDashboardCacheAt < TEAM_DASHBOARD_CACHE_MS) {
    return teamDashboardCache;
  }
  if (!options.force && teamDashboardInflight) {
    return teamDashboardInflight;
  }

  teamDashboardInflight = (async () => {
    const raw = await apiGet<Record<string, unknown>>("/team");
    const normalized = normalizeTeamDashboard(raw);
    teamDashboardCache = normalized;
    teamDashboardCacheAt = Date.now();
    return normalized;
  })();

  try {
    return await teamDashboardInflight;
  } finally {
    teamDashboardInflight = null;
  }
}

export type UpdateTeamMemberBody = {
  fullName?: string;
  role: "OWNER" | "CURATOR" | "MEMBER" | "READ_ONLY";
  department?: string;
};

export async function updateTeamMemberApi(id: string, body: UpdateTeamMemberBody) {
  return apiPatch<TeamMemberRow>(`/team/members/${id}`, {
    full_name: body.fullName,
    role: body.role,
    department: body.department,
  });
}

export async function suspendTeamMemberApi(id: string) {
  return apiPost<{ status: string }>(`/team/members/${id}/suspend`);
}

export async function resendInviteApi(inviteId: string) {
  return apiPost<{ success: boolean; email_sent: boolean }>(`/team/invitations/${inviteId}/resend`);
}

export async function revokeInviteApi(inviteId: string) {
  return apiPost<{ status: string }>(`/team/invitations/${inviteId}/revoke`);
}

export { API_BASE };
