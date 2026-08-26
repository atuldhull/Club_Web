/**
 * backend/lib/exportHelpers.js — CSV escaping + the range-paging fetchAll
 * that lets exports get past the API's page cap and PostgREST's 1000-row cap.
 */
import { describe, it, expect, vi } from "vitest";
import { toCsv, fetchAll, CSV_BOM } from "../../backend/lib/exportHelpers.js";

describe("toCsv", () => {
  it("escapes commas, quotes and newlines and blanks null/undefined", () => {
    const csv = toCsv([{ a: 'say "hi", ok', b: "line\nbreak", c: null, d: undefined, e: 5 }]);
    expect(csv.split("\n")[0]).toBe("a,b,c,d,e");
    expect(csv).toContain('"say ""hi"", ok","line\nbreak",,,5');
  });

  it("serialises nested objects instead of [object Object]", () => {
    const csv = toCsv([{ team: { name: "Euler" } }]);
    expect(csv).toContain('"{""name"":""Euler""}"');
  });

  it("honours explicit column order, labels and computed values", () => {
    const csv = toCsv(
      [{ name: "Ada", is_active: false, created_at: "2026-08-01T10:00:00Z" }],
      [
        "name",
        { key: "status", label: "status", value: (r) => (r.is_active === false ? "inactive" : "active") },
        { key: "joined", label: "joined", value: (r) => r.created_at.slice(0, 10) },
      ],
    );
    expect(csv).toBe("name,status,joined\nAda,inactive,2026-08-01");
  });

  it("returns a header-only file for zero rows with columns, and empty string with neither", () => {
    expect(toCsv([], ["a", "b"])).toBe("a,b");
    expect(toCsv([])).toBe("");
  });

  it("exports a UTF-8 BOM constant for Excel", () => {
    expect(CSV_BOM).toBe("﻿");
  });
});

describe("fetchAll", () => {
  const table = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));
  const fakeBuilder = (rows) => () => ({
    range: vi.fn(async (from, to) => ({ data: rows.slice(from, to + 1), error: null })),
  });

  it("pages past the chunk size and returns every row", async () => {
    const rows = await fetchAll(fakeBuilder(table(2500)), 1000);
    expect(rows).toHaveLength(2500);
    expect(rows[2499]).toEqual({ id: 2499 });
  });

  it("handles a table that is an exact multiple of the chunk", async () => {
    const rows = await fetchAll(fakeBuilder(table(2000)), 1000);
    expect(rows).toHaveLength(2000);
  });

  it("returns [] for an empty table", async () => {
    expect(await fetchAll(fakeBuilder([]), 1000)).toEqual([]);
  });

  it("throws on a query error", async () => {
    const build = () => ({ range: async () => ({ data: null, error: new Error("boom") }) });
    await expect(fetchAll(build, 1000)).rejects.toThrow("boom");
  });
});
