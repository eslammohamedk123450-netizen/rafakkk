import { ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import { getUserByOpenId, upsertUser } from "../db";
import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

const OAUTH_NONCE_COOKIE = "suly_oauth_nonce";
const OAUTH_NONCE_TTL_MS = 5 * 60 * 1000;

function getRequestOrigin(req: Request) {
  const header = req.headers["x-forwarded-proto"];
  const forwarded = Array.isArray(header) ? header[0] : typeof header === "string" ? header.split(",")[0] : undefined;
  const protocol = forwarded?.trim() || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function encodeState(payload: { redirectUri: string; nonce: string }) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decodeStatePayload(state: string) {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf8");
    const payload = JSON.parse(decoded) as { redirectUri?: unknown; nonce?: unknown };
    if (typeof payload.redirectUri === "string" && typeof payload.nonce === "string") return payload;
  } catch {
    // The web callback intentionally rejects legacy states without a nonce.
  }
  return null;
}

function oauthNonceCookieOptions(req: Request) {
  const secure = getRequestOrigin(req).startsWith("https://");
  return { httpOnly: true, secure, sameSite: secure ? "none" as const : "lax" as const, path: "/", maxAge: OAUTH_NONCE_TTL_MS };
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    role: (user as any)?.role ?? "user",
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", (req: Request, res: Response) => {
    if (!ENV.appId || !ENV.oAuthPortalUrl) {
      res.status(503).json({ error: "OAuth login is not configured" });
      return;
    }
    const nonce = randomBytes(32).toString("base64url");
    const redirectUri = `${getRequestOrigin(req)}/api/oauth/callback`;
    const loginUrl = new URL("/app-auth", ENV.oAuthPortalUrl);
    loginUrl.searchParams.set("appId", ENV.appId);
    loginUrl.searchParams.set("redirectUri", redirectUri);
    loginUrl.searchParams.set("state", encodeState({ redirectUri, nonce }));
    loginUrl.searchParams.set("responseType", "code");
    loginUrl.searchParams.set("type", "signIn");
    res.cookie(OAUTH_NONCE_COOKIE, nonce, oauthNonceCookieOptions(req));
    res.redirect(302, loginUrl.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const statePayload = decodeStatePayload(state);
    const nonceCookie = req.headers.cookie ? parseCookieHeader(req.headers.cookie)[OAUTH_NONCE_COOKIE] : undefined;
    const nonceOptions = oauthNonceCookieOptions(req);
    res.clearCookie(OAUTH_NONCE_COOKIE, { httpOnly: true, secure: nonceOptions.secure, sameSite: nonceOptions.sameSite, path: "/" });
    const expectedRedirectUri = `${getRequestOrigin(req)}/api/oauth/callback`;
    if (!statePayload || !nonceCookie || statePayload.nonce !== nonceCookie || statePayload.redirectUri !== expectedRedirectUri) {
      res.status(403).json({ error: "OAuth state validation failed" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // Redirect to the paired Expo web origin. The session cookie remains host-only on
      // the API origin and is sent back by credentialed API requests.
      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      res.redirect(302, new URL("/admin", frontendUrl).toString());
    } catch {
      console.error("[OAuth] Callback failed");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch {
      console.error("[OAuth] Mobile exchange failed");
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(getSessionCookieName(req), {
      ...cookieOptions,
      maxAge: -1,
    });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      console.error("[Auth] /api/auth/me failed");
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), token, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      console.error("[Auth] /api/auth/session failed");
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
