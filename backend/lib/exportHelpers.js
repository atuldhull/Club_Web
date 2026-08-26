/**
 * Shared helpers for CSV exports (admin users export + the all-data ZIP).
 */

// Byte-order mark: lets Excel detect UTF-8, so avatar emojis and accented
// names open correctly instead of as mojibake.
export const CSV_BOM = "﻿";

function escapeCsv(v) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * rows    — array of plain objects
 * columns — optional; strings or { key, label, value(row) } objects to fix
 *           column order/labels. Defaults to the first row's keys.
 * Returns "" when there is nothing to write (no rows and no columns).
 */
export function toCsv(rows, columns) {
  const list = rows || [];
  const cols = columns
    ? columns.map((c) => (typeof c === "string" ? { key: c, label: c } : c))
    : list.length
      ? Object.keys(list[0]).map((k) => ({ key: k, label: k }))
      : [];
  if (cols.length === 0) return "";
  const header = cols.map((c) => escapeCsv(c.label)).join(",");
  const body = list.map((row) =>
    cols.map((c) => escapeCsv(typeof c.value === "function" ? c.value(row) : row[c.key])).join(","),
  );
  return [header, ...body].join("\n");
}

// PostgREST silently caps a single request at 1000 rows.
const CHUNK = 1000;

/**
 * Fetch EVERY row of a query by paging with .range(). `build` must return a
 * fresh query each call (supabase builders are single-use) and should carry
 * a deterministic .order() so pages don't overlap.
 */
export async function fetchAll(build, chunk = CHUNK) {
  const rows = [];
  for (let from = 0; ; from += chunk) {
    const { data, error } = await build().range(from, from + chunk - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < chunk) return rows;
  }
}
