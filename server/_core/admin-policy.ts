export type ApplicationRole = "admin" | "user";

export function roleForProjectIdentity(openId: string, ownerOpenId: string): ApplicationRole {
  return ownerOpenId.length > 0 && openId === ownerOpenId ? "admin" : "user";
}

export function isAuthorizedProjectAdmin(
  user: { openId?: string | null; role?: string | null } | null | undefined,
  ownerOpenId: string,
): boolean {
  return ownerOpenId.length > 0
    && Boolean(user?.openId)
    && user?.openId === ownerOpenId
    && user?.role === "admin";
}
