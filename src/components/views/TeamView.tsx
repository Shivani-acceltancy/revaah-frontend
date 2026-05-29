import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  approveShareRequestApi,
  fetchTeamDashboardApi,
  listShareRequestsApi,
  resendInviteApi,
  revokeInviteApi,
  suspendTeamMemberApi,
  updateTeamMemberApi,
  type TeamDashboard,
  type TeamMemberRow,
} from "../../lib/api";
import type { LibraryMode, SessionUser } from "../../hooks/useAtelier";
import type { AtelierView } from "../../lib/atelier";
import AdminSidebar from "../layout/AdminSidebar";

type Props = {
  onNavigate: (view: AtelierView) => void;
  onShowLibrary: (mode: LibraryMode) => void;
  onLogout: () => void;
  onOpenInvite: () => void;
  refreshKey?: number;
  currentUser?: SessionUser | null;
};

function formatLastSeen(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`;
  if (diff < 172_800_000) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function toMillis(value: string | number): number {
  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

function formatInvitedAgo(iso: string | number): string {
  const diff = Date.now() - toMillis(iso);
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function roleLabel(role: string): string {
  const r = role.toLowerCase();
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export default function TeamView({ onNavigate, onShowLibrary, onLogout, onOpenInvite, refreshKey = 0, currentUser }: Props) {
  const [data, setData] = useState<TeamDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeamMemberRow | null>(null);
  const [editRole, setEditRole] = useState("CURATOR");
  const [editDept, setEditDept] = useState("");
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareRequests, setShareRequests] = useState<
    Array<{ id: number; project_id: number; project_title?: string; requested_by: string; created_at: string }>
  >([]);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTeamDashboardApi({ force }));
      try {
        setShareRequests(await listShareRequestsApi());
      } catch {
        setShareRequests([]);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const openEdit = (m: TeamMemberRow) => {
    setEditing(m);
    setEditName(m.full_name);
    setEditRole(m.role.toUpperCase());
    setEditDept(m.department ?? "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await updateTeamMemberApi(editing.id, {
        fullName: editName,
        role: editRole as "OWNER" | "CURATOR" | "MEMBER" | "READ_ONLY",
        department: editDept || undefined,
      });
      setEditing(null);
      await load(true);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const suspend = async (m: TeamMemberRow) => {
    if (!confirm(`Suspend ${m.full_name}? They will lose access.`)) return;
    setBusy(true);
    try {
      await suspendTeamMemberApi(m.id);
      await load(true);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Suspend failed");
    } finally {
      setBusy(false);
    }
  };

  const stats = data?.stats;

  return (
    <section id="view-team" className="view active">
      <div className="admin-shell">
        <AdminSidebar active="team" onNavigate={onNavigate} onShowLibrary={onShowLibrary} onLogout={onLogout} currentUser={currentUser} />
        <main className="admin-main">
          <div className="admin-top">
            <div>
              <div className="crumb">Admin · Team</div>
              <h1 className="serif">The atelier team.</h1>
            </div>
            <div className="right">
              <button type="button" className="btn-outline" onClick={() => void load(true)} disabled={loading}>
                Refresh
              </button>
              <button type="button" className="btn-ink" onClick={onOpenInvite}>
                + Invite member
              </button>
            </div>
          </div>

          {error && <div className="save-toast save-toast--err">{error}</div>}

          <div className="team-stats">
            <div className="cell">
              <div className="v">{loading ? "…" : stats?.active_members ?? 0}</div>
              <div className="l">Active members</div>
            </div>
            <div className="cell">
              <div className="v">{loading ? "…" : stats?.pending_invites ?? 0}</div>
              <div className="l">Pending invites</div>
            </div>
            <div className="cell">
              <div className="v">{loading ? "…" : stats?.curators ?? 0}</div>
              <div className="l">Curators</div>
            </div>
            <div className="cell">
              <div className="v">{loading ? "…" : stats?.shares_this_month ?? 0}</div>
              <div className="l">Shares this month</div>
            </div>
          </div>

          <div className="panel" style={{ padding: 0 }}>
            <table className="team-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 32 }}>Member</th>
                  <th>Role</th>
                  <th>Last seen</th>
                  <th>Projects</th>
                  <th>Shares</th>
                  <th style={{ textAlign: "right", paddingRight: 32 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center" }}>
                      Loading team…
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.members.map((m) => (
                    <tr key={m.id}>
                      <td style={{ paddingLeft: 32 }}>
                        <div className="person">
                          <div className={`av ${m.role.toLowerCase() === "owner" ? "" : "b"}`}>
                            {m.initials}
                          </div>
                          <div>
                            <div className="nm">{m.full_name}</div>
                            <div className="em">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-pill ${m.role.toLowerCase()}`}>{m.role.toLowerCase()}</span>
                      </td>
                      <td>
                        <span className="seen">{formatLastSeen(m.last_seen_at)}</span>
                      </td>
                      <td>{m.projects_count}</td>
                      <td>{m.shares_count > 0 ? m.shares_count : "—"}</td>
                      <td style={{ textAlign: "right", paddingRight: 32 }}>
                        <div className="row-actions">
                          {m.can_edit && (
                            <button type="button" onClick={() => openEdit(m)} disabled={busy}>
                              Edit
                            </button>
                          )}
                          {m.can_suspend && (
                            <button type="button" onClick={() => void suspend(m)} disabled={busy}>
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="panel" style={{ marginTop: 32 }}>
            <div className="panel-h serif">Pending invitations</div>
            {loading && <p className="panel-sub">Loading…</p>}
            {!loading && data?.pending_invites.length === 0 && (
              <p className="panel-sub">No pending invitations.</p>
            )}
            {data?.pending_invites.map((inv) => (
              <div className="pending-row" key={inv.id}>
                <div className="info">
                  {inv.email}
                  <div className="sm">
                    Invited as {roleLabel(inv.role)}
                    {inv.department ? ` · ${inv.department}` : ""} · {formatInvitedAgo(inv.invited_at)}
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        await resendInviteApi(inv.id);
                        alert("Invitation resent");
                      } catch (e) {
                        alert(e instanceof ApiError ? e.message : "Resend failed");
                      }
                    }}
                  >
                    Resend
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={busy}
                    onClick={async () => {
                      if (!confirm("Revoke this invitation?")) return;
                      try {
                        await revokeInviteApi(inv.id);
                        await load(true);
                      } catch (e) {
                        alert(e instanceof ApiError ? e.message : "Revoke failed");
                      }
                    }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="panel" style={{ marginTop: 32 }}>
            <div className="panel-h serif">Share link approvals</div>
            {loading && <p className="panel-sub">Loading…</p>}
            {!loading && shareRequests.length === 0 && (
              <p className="panel-sub">No pending share link requests.</p>
            )}
            {shareRequests.map((req) => (
              <div className="pending-row" key={req.id}>
                <div className="info">
                  {req.project_title ?? `Project #${req.project_id}`}
                  <div className="sm">Requested by member · {formatInvitedAgo(req.created_at)}</div>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        await approveShareRequestApi(req.id);
                        await load(true);
                        alert("Share link approved. Member can generate the link now.");
                      } catch (e) {
                        alert(e instanceof ApiError ? e.message : "Approve failed");
                      }
                    }}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="panel role-permissions" style={{ marginTop: 24 }}>
            <div className="panel-h serif">Role permissions</div>
            <p className="panel-sub">A quick reference. Roles can be customised under Settings → Roles.</p>
            <table className="team-table role-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Capability</th>
                  <th>Owner</th>
                  <th>Curator</th>
                  <th>Member</th>
                  <th>Read-only</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ paddingLeft: 20 }}>Browse the library</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 20 }}>Search &amp; moodboards</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 20 }}>Upload &amp; edit projects</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 20 }}>Publish to library</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 20 }}>Generate client share links</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>With approval</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 20 }}>Revoke any shared link</td>
                  <td>✓</td>
                  <td>Own only</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 20 }}>Invite &amp; manage team</td>
                  <td>✓</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 20 }}>Settings &amp; billing</td>
                  <td>✓</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {editing && (
        <div className="modal-veil show" role="dialog">
          <div className="modal">
            <button type="button" className="x" onClick={() => setEditing(null)}>
              ✕
            </button>
            <div className="eyebrow">Edit team member</div>
            <h2 className="serif">{editing.full_name}</h2>
            <div className="form-field" style={{ marginTop: 16 }}>
              <label>Full name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="CURATOR">Curator</option>
                <option value="MEMBER">Member</option>
                <option value="READ_ONLY">Read only</option>
                {editing.role.toLowerCase() === "owner" && <option value="OWNER">Owner</option>}
              </select>
            </div>
            <div className="form-field">
              <label>Department</label>
              <input value={editDept} onChange={(e) => setEditDept(e.target.value)} />
            </div>
            <button type="button" className="btn-fill" style={{ marginTop: 20 }} onClick={() => void saveEdit()} disabled={busy}>
              Save changes
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
