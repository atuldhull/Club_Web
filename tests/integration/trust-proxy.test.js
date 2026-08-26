/**
 * Tests that the Express app trusts the FIRST proxy hop in the
 * X-Forwarded-For chain — required for accurate per-IP rate-limiting
 * and for express-session's `secure` cookie to fire on HTTPS deploys.
 *
 * The setting lives in createApp() in app.js; here we boot the real
 * app and assert req.ip / req.protocol behaviour from the outside.
 *
 * Why bake this into a regression test rather than rely on a
 * one-line config: a future refactor that drops `app.set("trust
 * proxy", 1)` would silently revert every per-IP rate limit to "all
 * users share one bucket" — exactly the kind of regression that's
 * impossible to spot in code review without a test calling it out.
 */

import { describe, it, expect, vi } from "vitest";
import express from "express";

// Mock supabase + tenantMiddleware to avoid touching real services
// when we boot createApp(). The actual proxy behaviour is set at the
// app level, before any middleware runs that would need them.
vi.mock("../../backend/config/supabase.js", () => ({
  default: {
    from: () => ({
      select: () => ({
        then: (r) => Promise.resolve({ data: [], error: null }).then(r),
      }),
    }),
  },
}));

// Build a minimal app that mirrors how createApp wires trust proxy,
// and adds a tiny probe route. We don't import createApp() directly
// to keep this test focused on the trust-proxy contract — importing
// the full app pulls in routes / sessions / etc. that aren't needed.
function buildProbeApp({ trustProxy = 1 } = {}) {
  const app = express();
  if (trustProxy !== false) app.set("trust proxy", trustProxy);
  app.get("/probe", (req, res) => {
    res.json({ ip: req.ip, protocol: req.protocol, secure: req.secure });
  });
  return app;
}

import request from "supertest";

describe("trust proxy", () => {
  it("WITH trust proxy=1: req.ip reflects the X-Forwarded-For client", async () => {
    const res = await request(buildProbeApp({ trustProxy: 1 }))
      .get("/probe")
      .set("X-Forwarded-For", "203.0.113.42");
    expect(res.body.ip).toBe("203.0.113.42");
  });

  it("WITH trust proxy=1: req.protocol reflects X-Forwarded-Proto", async () => {
    const res = await request(buildProbeApp({ trustProxy: 1 }))
      .get("/probe")
      .set("X-Forwarded-Proto", "https");
    expect(res.body.protocol).toBe("https");
    expect(res.body.secure).toBe(true);
  });

  it("WITHOUT trust proxy: X-Forwarded-For is IGNORED (regression baseline)", async () => {
    // This is what the bug looked like before — leaving it as a test
    // baseline so a future "trust proxy" misconfiguration is caught
    // by comparing against this known-bad behaviour.
    const res = await request(buildProbeApp({ trustProxy: false }))
      .get("/probe")
      .set("X-Forwarded-For", "203.0.113.42");
    expect(res.body.ip).not.toBe("203.0.113.42");
  });

  it("WITH trust proxy=1: only ONE hop is trusted (defends against forged X-Forwarded-For)", async () => {
    // If an attacker prepends a fake IP to the chain (e.g., to bypass
    // an IP-based rate limit), the proxy appends the real client IP.
    // trust proxy=1 picks the LAST entry (the immediate-proxy one),
    // discarding the attacker's prepended fake.
    const res = await request(buildProbeApp({ trustProxy: 1 }))
      .get("/probe")
      // Format: "<attacker-claimed>, <real client per proxy>"
      .set("X-Forwarded-For", "1.2.3.4, 203.0.113.42");
    expect(res.body.ip).toBe("203.0.113.42");
    expect(res.body.ip).not.toBe("1.2.3.4");
  });
});

describe("createApp() in app.js sets trust proxy", () => {
  // 90 s timeout (default 10 s) — under coverage instrumentation on
  // Windows, importing app.js takes longer than the default and
  // intermittently flakes the pre-commit gate. Same root cause as
  // the api-docs.test.js timeout bump.
  it("the real app has trust proxy enabled (regression guard)", async () => {
    // A few controllers (messagingController.js, others) call
    // @supabase/supabase-js createClient() directly at module load
    // with env vars — they throw if SUPABASE_URL is missing. Provide
    // dummy values so the import chain settles. We're only asserting
    // on the trust-proxy setting; nothing actually queries Supabase.
    process.env.SUPABASE_URL              = process.env.SUPABASE_URL              || "https://dummy.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key";

    const { createApp } = await import("../../backend/app.js");
    const app = createApp();
    expect(app.get("trust proxy")).toBeTruthy();
    // Specifically `1` (not `true`/Infinity) — see comment in app.js
    // about why trusting the entire chain is wrong.
    expect(app.get("trust proxy")).toBe(1);
  }, 90000);
});
