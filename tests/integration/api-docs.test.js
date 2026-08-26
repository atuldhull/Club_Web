/**
 * Tests for the /api/docs Swagger UI mount.
 *
 * Three contracts:
 *   1. In dev / test, GET /api/docs serves Swagger UI HTML and
 *      GET /api/docs/openapi.json serves the parsed spec.
 *   2. In production, /api/docs is NOT mounted at all (404). We
 *      don't want to advertise the API surface to the public web.
 *   3. The shipped docs/openapi.yaml is valid YAML + parses to a
 *      well-formed OpenAPI 3.x document with the routes the rest
 *      of the test suite expects.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import yaml from "yaml";

// Make app boot under test
process.env.SUPABASE_URL              = process.env.SUPABASE_URL              || "https://dummy.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";

// The OpenAPI spec lives outside the public repo (gitignored).
// Skip the suite gracefully when it isn't present so CI / fresh
// clones don't fail on a missing local artifact.
const SPEC_PATH = path.resolve("docs/openapi.yaml");
const HAS_SPEC = fs.existsSync(SPEC_PATH);

// ════════════════════════════════════════════════════════════
// Spec file itself
// ════════════════════════════════════════════════════════════

describe.skipIf(!HAS_SPEC)("docs/openapi.yaml", () => {
  let spec;

  beforeAll(() => {
    spec = yaml.parse(fs.readFileSync(SPEC_PATH, "utf8"));
  });

  it("is a valid OpenAPI 3.x document", () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info?.title).toBeTruthy();
    expect(spec.info?.version).toBeTruthy();
    expect(spec.paths).toBeTypeOf("object");
  });

  it("documents the load-bearing endpoints", () => {
    // If we ever rename or drop one of these in the actual code
    // without updating the spec, this test catches the drift.
    const paths = Object.keys(spec.paths);
    expect(paths).toContain("/api/health");
    expect(paths).toContain("/api/ready");
    expect(paths).toContain("/api/csrf-token");
    expect(paths).toContain("/api/auth/login");
    expect(paths).toContain("/api/auth/register");
    expect(paths).toContain("/api/payment/create-order");
    expect(paths).toContain("/api/payment/webhook");
  });

  it("defines the standard ErrorEnvelope schema", () => {
    expect(spec.components?.schemas?.ErrorEnvelope).toBeTypeOf("object");
    const env = spec.components.schemas.ErrorEnvelope;
    // Required: error. Optional: code, requestId, issues.
    expect(env.required).toContain("error");
    expect(env.properties.code.enum).toContain("VALIDATION_FAILED");
    expect(env.properties.code.enum).toContain("CSRF_INVALID");
    expect(env.properties.code.enum).toContain("INTERNAL");
  });

  it("/api/payment/create-order documents the Idempotency-Key header (Phase 10.2)", () => {
    const op = spec.paths["/api/payment/create-order"]?.post;
    expect(op).toBeTruthy();
    const param = (op.parameters || []).find(p => p.name === "Idempotency-Key");
    expect(param).toBeTruthy();
    expect(param.in).toBe("header");
    expect(param.required).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
// /api/docs mount — dev vs prod
// ════════════════════════════════════════════════════════════

describe.skipIf(!HAS_SPEC)("/api/docs mount", () => {
  let app;

  // 30 s instead of the default 10 s — under coverage instrumentation
  // on Windows, importing app.js (which transitively pulls in the full
  // backend tree + sentry + supabase init) can take longer than 10 s
  // even though the same import is sub-second without coverage. The
  // flake is purely instrumentation overhead, not a real bug.
  beforeAll(async () => {
    process.env.NODE_ENV = "development";
    process.env.SESSION_SECRET = "test-secret-test-secret-test";
    const { createApp } = await import("../../backend/app.js");
    app = createApp();
  }, 90000);

  it("serves Swagger UI HTML at /api/docs/", async () => {
    const html = await request(app).get("/api/docs/").redirects(2);
    expect(html.status).toBe(200);
    expect(html.headers["content-type"]).toMatch(/html/);
    expect(html.text).toMatch(/swagger/i);
  });

  it("serves the raw OpenAPI JSON at /api/docs/openapi.json", async () => {
    const json = await request(app).get("/api/docs/openapi.json");
    expect(json.status).toBe(200);
    expect(json.body.openapi).toMatch(/^3\./);
    expect(json.body.paths["/api/health"]).toBeTruthy();
  });
});
