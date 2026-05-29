export function normalizeRole(role?: string | null): string {
  return (role ?? "MEMBER").toUpperCase().replace(/\s+/g, "_");
}

export function isOwner(role?: string | null): boolean {
  return normalizeRole(role) === "OWNER";
}

export function isCurator(role?: string | null): boolean {
  return normalizeRole(role) === "CURATOR";
}

export function isMember(role?: string | null): boolean {
  return normalizeRole(role) === "MEMBER";
}

export function isReadOnly(role?: string | null): boolean {
  return normalizeRole(role) === "READ_ONLY";
}

export function canCreateProjects(role?: string | null): boolean {
  return isOwner(role) || isCurator(role);
}
