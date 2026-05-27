import type { ProjectDetail, ProjectListItem, ProjectsListResponse, ProjectStats } from "../types/project";
import { normalizeProjectStats, parseProjectsList } from "./projects";

/** Default: Vite proxy `/v1` → localhost:8080 (see vite.config.ts) */
function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw === undefined || raw === "") {
    return "/v1";
  }
  return String(raw).replace(/\/$/, "");
}

const API_BASE = resolveApiBase();

export type ApiErrorBody = {
  error?: { code?: string; message?: string };
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

const FETCH_TIMEOUT_MS = 8000;
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

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(0, "TIMEOUT", "Backend did not respond in time. Is the API running on port 8080?");
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

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: { id: string; email: string; fullName: string; role: string };
};

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await fetchWithTimeout(`${API_BASE}/system/status`);
  if (!res.ok) throw new ApiError(res.status, "API_UNREACHABLE", "Cannot reach backend API");
  return res.json() as Promise<SystemStatus>;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/login", { email, password });
}

export async function uiPreviewLoginApi(): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/ui-preview");
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

export async function checkMoodboardApi(projectId: string): Promise<boolean> {
  const raw = await apiGet<{ saved?: boolean }>(`/moodboard/items/check/${projectId}`);
  return Boolean(raw.saved);
}

export async function addToMoodboardApi(projectId: string) {
  return apiPost<{ status: string }>("/moodboard/items", { project_id: projectId });
}

export async function removeFromMoodboardApi(projectId: string) {
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

export async function fetchProjectDetailApi(id: string): Promise<ProjectDetail> {
  return apiGet<ProjectDetail>(`/projects/${id}`);
}

export async function patchAssetApi(
  assetId: string,
  body: { is_cover?: boolean; show_in_gallery?: boolean },
): Promise<Record<string, unknown>> {
  return apiPatch<Record<string, unknown>>(`/assets/${assetId}`, body);
}

export async function createProjectApi(body: ProjectCreateBody) {
  return apiPost<{ id: string; status: string }>("/projects", toSnakeProjectBody(body));
}

export async function updateProjectApi(id: string, body: Partial<ProjectCreateBody>) {
  return apiPatch<{ id: string; status: string }>(`/projects/${id}`, toSnakeProjectBody(body));
}

export async function publishProjectApi(id: string) {
  return apiPost<{ id: string; status: string; published_at: string }>(`/projects/${id}/publish`);
}

export async function deleteProjectApi(id: string) {
  const res = await fetchWithTimeout(`${API_BASE}/projects/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ status: string }>;
}

export type UploadedAsset = {
  id: string;
  processing_status?: string;
};

export async function uploadProjectAssetsApi(
  projectId: string,
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
    throw new ApiError(0, "NETWORK_ERROR", "Upload failed — check API on port 8081.");
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

export async function fetchTeamDashboardApi(): Promise<TeamDashboard> {
  const raw = await apiGet<Record<string, unknown>>("/team");
  return normalizeTeamDashboard(raw);
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
