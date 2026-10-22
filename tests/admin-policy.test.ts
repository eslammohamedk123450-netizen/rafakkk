import { describe, expect, it } from "vitest";
import { isAuthorizedProjectAdmin, roleForProjectIdentity } from "../server/_core/admin-policy";

describe("project owner admin policy", () => {
  it("fails closed when no owner is configured, even for a stale admin row", () => {
    expect(isAuthorizedProjectAdmin({ openId: "owner-1", role: "admin" }, "")).toBe(false);
  });

  it("authorizes only the configured owner whose stored role is admin", () => {
    expect(isAuthorizedProjectAdmin({ openId: "owner-1", role: "admin" }, "owner-1")).toBe(true);
    expect(isAuthorizedProjectAdmin({ openId: "other-1", role: "admin" }, "owner-1")).toBe(false);
    expect(isAuthorizedProjectAdmin({ openId: "owner-1", role: "user" }, "owner-1")).toBe(false);
    expect(isAuthorizedProjectAdmin({ role: "admin" }, "owner-1")).toBe(false);
  });

  it("assigns admin only to the exact configured owner and demotes other identities", () => {
    expect(roleForProjectIdentity("owner-1", "owner-1")).toBe("admin");
    expect(roleForProjectIdentity("owner-1", "")).toBe("user");
    expect(roleForProjectIdentity("other-1", "owner-1")).toBe("user");
  });
});
