import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  hasPermission,
  resolveEffectivePermissions,
  ROUTE_PERMISSION_MAP,
  type Permission,
} from "./policy";

describe("resolveEffectivePermissions", () => {
  it("returns no permissions when org role is missing", () => {
    const result = resolveEffectivePermissions({ orgRole: null, userRole: "dispatcher" });

    expect(result.size).toBe(0);
  });

  it("uses org role permissions when user role is not provided", () => {
    const result = resolveEffectivePermissions({ orgRole: "inventory_manager", userRole: null });

    expect(result.size).toBeGreaterThan(0);
    expect(result.has("inventory.transfer")).toBe(true);
    expect(result.has("settings.update")).toBe(false);
  });

  it("intersects org role and user role permissions", () => {
    const result = resolveEffectivePermissions({ orgRole: "owner_admin", userRole: "technician" });

    expect(result.has("jobs.update")).toBe(true);
    expect(result.has("settings.update")).toBe(false);
    expect(result.has("reports.read")).toBe(false);
  });
});

describe("permission helpers", () => {
  it("recognizes permission membership", () => {
    const permissions = new Set<Permission>(["dashboard.read", "jobs.read"]);

    expect(hasPermission(permissions, "dashboard.read")).toBe(true);
    expect(hasPermission(permissions, "inventory.adjust")).toBe(false);
  });

  it("keeps route map entries bound to known permissions", () => {
    const allowed = new Set<Permission>(ALL_PERMISSIONS);

    Object.values(ROUTE_PERMISSION_MAP).forEach((permission) => {
      expect(allowed.has(permission)).toBe(true);
    });
  });
});
