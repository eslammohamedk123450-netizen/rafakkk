import * as Linking from "expo-linking";
import Constants from "expo-constants";
import * as ReactNative from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const bundleId = "space.manus.suly.t041874444151568";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const env = {
  portal: extra.oauthPortalUrl ?? process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: extra.oauthServerUrl ?? process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: extra.appId ?? process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;
export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";
const NATIVE_OAUTH_NONCE_KEY = "suly_native_oauth_nonce";

/**
 * Get the API base URL, deriving from the current Preview hostname if it is not set.
 * Metro runs on 8081 while the project API runs on 3000.
 */
export function getApiBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, "");
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
  }
  return "";
}

/** Get the OAuth callback URI for this runtime. */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") return `${getApiBaseUrl()}/api/oauth/callback`;
  return Linking.createURL("/oauth/callback", { scheme: env.deepLinkScheme });
};

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") return globalThis.btoa(value);
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) return BufferImpl.from(value, "utf-8").toString("base64");
  throw new Error("OAuth state encoding is unavailable");
};

function decodeState(value: string) {
  if (typeof globalThis.atob === "function") return globalThis.atob(value);
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) return BufferImpl.from(value, "base64").toString("utf-8");
  throw new Error("OAuth state decoding is unavailable");
}

export async function getLoginUrl(): Promise<string> {
  if (!OAUTH_PORTAL_URL || !APP_ID) throw new Error("Manus login configuration is unavailable");
  const redirectUri = getRedirectUri();
  let state: string;
  if (ReactNative.Platform.OS === "web") {
    state = encodeState(redirectUri);
  } else {
    const nonce = Crypto.randomUUID();
    await SecureStore.setItemAsync(NATIVE_OAUTH_NONCE_KEY, nonce);
    state = encodeState(JSON.stringify({ redirectUri, nonce }));
  }
  const url = new URL("/app-auth", OAUTH_PORTAL_URL);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
}

/** Validate and consume the one-time nonce for native callbacks. */
export async function validateOAuthState(state: string): Promise<boolean> {
  if (ReactNative.Platform.OS === "web") return true;
  let storedNonce: string | null = null;
  try {
    storedNonce = await SecureStore.getItemAsync(NATIVE_OAUTH_NONCE_KEY);
    await SecureStore.deleteItemAsync(NATIVE_OAUTH_NONCE_KEY);
    if (!storedNonce) return false;
    const payload = JSON.parse(decodeState(state)) as { redirectUri?: unknown; nonce?: unknown };
    return payload.redirectUri === getRedirectUri() && payload.nonce === storedNonce;
  } catch {
    return false;
  }
}

/** Open the provider in the system browser; native returns through the registered deep link. */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = await getLoginUrl();
  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") window.location.href = loginUrl;
    return null;
  }
  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) throw new Error("Cannot open the Manus login URL");
  await Linking.openURL(loginUrl);
  return null;
}
