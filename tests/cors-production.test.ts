import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { createCorsMiddleware, isTrustedWebOrigin } from "../server/_core/cors";

describe("production web origin allowlist", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows the exact configured HTTPS origin and rejects lookalikes", async () => {
    vi.stubEnv("EXPO_PACKAGER_PROXY_URL", "");
    vi.stubEnv("EXPO_WEB_PREVIEW_URL", "");
    vi.stubEnv("SULY_PUBLIC_ORIGIN", "https://suly.example.test");

    expect(isTrustedWebOrigin("https://suly.example.test")).toBe(true);
    expect(isTrustedWebOrigin("https://suly.example.test.attacker.test")).toBe(false);
    expect(isTrustedWebOrigin("https://suly.example.test/path")).toBe(false);

    const app = express();
    app.use(createCorsMiddleware());
    app.get("/health", (_req, res) => res.json({ ok: true }));
    const server = app.listen(0);
    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      const allowed = await fetch(`${base}/health`, {
        headers: { Origin: "https://suly.example.test" },
      });
      const rejected = await fetch(`${base}/health`, {
        headers: { Origin: "https://suly.example.test.attacker.test" },
      });
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("access-control-allow-origin")).toBe("https://suly.example.test");
      expect(rejected.status).toBe(403);
      expect(rejected.headers.get("access-control-allow-origin")).toBeNull();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
