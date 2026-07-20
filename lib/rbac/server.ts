import { auth, currentUser } from "@clerk/nextjs/server";
import {
  hasPermission,
  normalizeRole,
  resolveEffectivePermissions,
  ROUTE_PERMISSION_MAP,
  type Permission,
  type Role,
} from "./policy";

export type AuthorizationDecision =
  | { state: "unauthenticated" }
  | { state: "forbidden" }
  | { state: "authorized" };

export type AuthorizationContext = {
  userId: string;
  orgId: string | null;
  clerkOrgRole: string | null;
  orgRole: Role | null;
  userRole: Role | null;
  effectivePermissions: Set<Permission>;
};

type ParsedClerkOrgRole = {
  status: "none" | "member" | "known" | "unknown";
  role: Role | null;
};

type UserPublicMetadata = {
  orgRoles?: Record<string, unknown>;
};

export function extractScopedUserRole(
  publicMetadata: unknown,
  orgId: string | null
): Role | null {
  if (!orgId || !publicMetadata || typeof publicMetadata !== "object") {
    return null;
  }

  const metadata = publicMetadata as UserPublicMetadata;
  const candidate = metadata.orgRoles?.[orgId];
  return normalizeRole(candidate);
}

export function parseClerkOrgRole(orgRole: string | null): ParsedClerkOrgRole {
  if (!orgRole) {
    return { status: "none", role: null };
  }

  if (orgRole.startsWith("org:")) {
    const scopedRole = orgRole.slice(4);

    if (scopedRole === "admin") {
      return { status: "known", role: "owner_admin" };
    }

    // org:member is treated as neutral and can be specialized by user metadata role.
    if (scopedRole === "member") {
      return { status: "member", role: null };
    }

    const mapped = normalizeRole(scopedRole);
    return mapped
      ? { status: "known", role: mapped }
      : { status: "unknown", role: null };
  }

  const mapped = normalizeRole(orgRole);
  return mapped
    ? { status: "known", role: mapped }
    : { status: "unknown", role: null };
}

export function computeEffectivePermissionsForIdentity({
  orgId,
  clerkOrgRole,
  userRole,
}: {
  orgId: string | null;
  clerkOrgRole: string | null;
  userRole: Role | null;
}): Set<Permission> {
  if (!orgId) {
    return new Set<Permission>();
  }

  const parsedOrgRole = parseClerkOrgRole(clerkOrgRole);
  if (parsedOrgRole.status === "none" || parsedOrgRole.status === "unknown") {
    return new Set<Permission>();
  }

  const ceilingRole = parsedOrgRole.role ?? userRole;

  return resolveEffectivePermissions({
    orgRole: ceilingRole,
    userRole,
  });
}

export async function getAuthorizationContext(): Promise<AuthorizationContext | null> {
  try {
    const { userId, orgId, orgRole } = await auth();
    if (!userId) {
      return null;
    }

    const user = await currentUser();
    const userRole = extractScopedUserRole(
      user?.publicMetadata,
      orgId ?? null
    );
    const parsedOrgRole = parseClerkOrgRole(orgRole ?? null);
    const effectivePermissions = computeEffectivePermissionsForIdentity({
      orgId: orgId ?? null,
      clerkOrgRole: orgRole ?? null,
      userRole,
    });

    return {
      userId,
      orgId: orgId ?? null,
      clerkOrgRole: orgRole ?? null,
      orgRole: parsedOrgRole.role,
      userRole,
      effectivePermissions,
    };
  } catch {
    return null;
  }
}

export async function authorizePermission(
  permission: Permission
): Promise<AuthorizationDecision> {
  const context = await getAuthorizationContext();

  if (!context) {
    return { state: "unauthenticated" };
  }

  if (!hasPermission(context.effectivePermissions, permission)) {
    return { state: "forbidden" };
  }

  return { state: "authorized" };
}
