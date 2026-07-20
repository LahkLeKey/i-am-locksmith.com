import { describe, expect, it } from "vitest";
import {
  computeEffectivePermissionsForIdentity,
  extractScopedUserRole,
  parseClerkOrgRole,
} from "./server";

describe("parseClerkOrgRole", () => {
  it("maps org:admin to owner_admin", () => {
    expect(parseClerkOrgRole("org:admin")).toEqual({
      status: "known",
      role: "owner_admin",
    });
  });

  it("maps prefixed custom org role", () => {
    expect(parseClerkOrgRole("org:dispatcher")).toEqual({
      status: "known",
      role: "dispatcher",
    });
  });

  it("keeps org:member neutral", () => {
    expect(parseClerkOrgRole("org:member")).toEqual({
      status: "member",
      role: null,
    });
  });

  it("marks unknown scoped role as unknown", () => {
    expect(parseClerkOrgRole("org:random")).toEqual({
      status: "unknown",
      role: null,
    });
  });
});

describe("computeEffectivePermissionsForIdentity", () => {
  it("returns least privilege with no active org", () => {
    const permissions = computeEffectivePermissionsForIdentity({
      orgId: null,
      clerkOrgRole: "org:admin",
      userRole: "owner_admin",
    });

    expect(permissions.size).toBe(0);
  });

  it("uses user role when org role is org:member", () => {
    const permissions = computeEffectivePermissionsForIdentity({
      orgId: "org_123",
      clerkOrgRole: "org:member",
      userRole: "dispatcher",
    });

    expect(permissions.has("jobs.assign")).toBe(true);
    expect(permissions.has("settings.update")).toBe(false);
  });

  it("fails closed for unknown org roles", () => {
    const permissions = computeEffectivePermissionsForIdentity({
      orgId: "org_123",
      clerkOrgRole: "org:unknown",
      userRole: "owner_admin",
    });

    expect(permissions.size).toBe(0);
  });

  it("fails closed when org role is unexpectedly missing", () => {
    const permissions = computeEffectivePermissionsForIdentity({
      orgId: "org_123",
      clerkOrgRole: null,
      userRole: "owner_admin",
    });

    expect(permissions.size).toBe(0);
  });

  it("intersects org-admin ceiling with user restrictions", () => {
    const permissions = computeEffectivePermissionsForIdentity({
      orgId: "org_123",
      clerkOrgRole: "org:admin",
      userRole: "technician",
    });

    expect(permissions.has("jobs.complete")).toBe(true);
    expect(permissions.has("users.role.update")).toBe(false);
  });
});

describe("extractScopedUserRole", () => {
  it("returns null when org context is missing", () => {
    const role = extractScopedUserRole(
      { orgRoles: { org_123: "dispatcher" } },
      null
    );

    expect(role).toBeNull();
  });

  it("reads role from org-scoped metadata", () => {
    const role = extractScopedUserRole(
      { orgRoles: { org_123: "inventory_manager" } },
      "org_123"
    );

    expect(role).toBe("inventory_manager");
  });

  it("ignores unknown org-scoped values", () => {
    const role = extractScopedUserRole(
      { orgRoles: { org_123: "superuser" } },
      "org_123"
    );

    expect(role).toBeNull();
  });
});
