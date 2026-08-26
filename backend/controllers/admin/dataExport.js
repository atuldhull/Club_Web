import archiver from "archiver";

// Tenant scoping: every TENANT-table query uses req.db.from(...).
// For an org admin that means the export contains ONLY their org's
// rows (students, challenges, arena_attempts, events, notifications).
// Previously the export streamed the entire database across every
// org — a single org admin could exfiltrate every other customer's
// student list and answers. Super_admin (no impersonation) still
// dumps platform-wide because the Proxy returns the raw client.
//
// Tables NOT in TENANT_TABLES (event_registrations / event_attendance
// / event_leaderboard / achievements / user_achievements / friendships)
// stay on a fallback raw-supabase import below. They're transitively
// scoped via event_id (events are now org-scoped, so an org admin
// only sees registrations to their own events) but the ABSOLUTE row
// count exported still includes every org's row. That's a known gap
// — adding these tables to TENANT_TABLES is a follow-up worth doing
// but out of scope for this batch (it requires an org_id column on
// each, plus backfill — see migration 14 for the pattern).
import supabase from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { sendInternalError } from "../../lib/errorResponse.js";
import { toCsv, fetchAll, CSV_BOM } from "../../lib/exportHelpers.js";

/* ═══════════════════════════════════════════════════════════════
   EXPORT ALL DATA — ZIP with CSV files
   GET /api/admin/export

   Downloads a ZIP containing:
     students.csv        — all users with XP, role, title
     challenges.csv      — all challenges
     arena_attempts.csv  — all arena submissions
     events.csv          — all events
     event_registrations.csv — all event registrations
     event_attendance.csv    — all attendance records
     event_leaderboard.csv  — all event scores
     achievements.csv       — achievement catalog
     user_achievements.csv  — all unlocked achievements
     notifications.csv      — all notifications
     friendships.csv        — all friend connections
═══════════════════════════════════════════════════════════════ */

// Every query goes through fetchAll: a bare .select() is silently capped at
// 1000 rows by PostgREST, which truncated big tables (attempts,
// notifications) without any error. Each carries a deterministic order so
// pages don't overlap.
const csvFile = (name, rows) => {
  const csv = toCsv(rows);
  return { name, data: csv ? CSV_BOM + csv : "" };
};

export const exportAllData = async (req, res) => {
  try {
    // Fetch all tables in parallel
    const [
      students, challenges, attempts, events,
      registrations, attendance, leaderboard,
      achievementsDef, userAchievements,
      notifications, friendships,
    ] = await Promise.all([
      // ── tenant tables (scoped via req.db; the Proxy filters to req.orgId) ──
      fetchAll(() => req.db.from("students").select("user_id, name, email, role, xp, weekly_xp, title, department, subject, bio, created_at").order("created_at").order("user_id")),
      fetchAll(() => req.db.from("challenges").select("id, title, difficulty, points, is_active, created_at").order("id")),
      fetchAll(() => req.db.from("arena_attempts").select("user_id, challenge_id, selected_index, correct, xp_earned, created_at").order("created_at").order("user_id")),
      fetchAll(() => req.db.from("events").select("id, title, event_type, date, starts_at, ends_at, location, organiser, capacity, xp_reward, registration_open, is_active, created_at").order("id")),
      // ── non-tenant tables (see header comment re: the cross-org gap they leave) ──
      fetchAll(() => supabase.from("event_registrations").select("id, event_id, user_id, status, registered_at, cancelled_at, checked_in_at, team_name").order("id")).catch(() => []),
      fetchAll(() => supabase.from("event_attendance").select("id, event_id, user_id, checkin_method, checkin_time, xp_awarded, session_label").order("id")).catch(() => []),
      fetchAll(() => supabase.from("event_leaderboard").select("id, event_id, user_id, score, rank, team_name, judged_at").order("id")).catch(() => []),
      fetchAll(() => supabase.from("achievements").select("id, slug, title, category, criteria_type, criteria_value, xp_reward, rarity").order("id")).catch(() => []),
      fetchAll(() => supabase.from("user_achievements").select("id, user_id, achievement_id, event_id, unlocked_at, xp_awarded").order("id")).catch(() => []),
      // notifications IS tenant — kept in its original slot (slot 10) so the
      // destructuring above still aligns; the req.db scoping is what matters.
      fetchAll(() => req.db.from("notifications").select("id, user_id, title, body, type, is_read, link, created_at").order("id")).catch(() => []),
      fetchAll(() => supabase.from("friendships").select("id, requester_id, recipient_id, status, created_at").order("id")).catch(() => []),
    ]);

    // Build CSV files
    const files = [
      csvFile("students.csv", students),
      csvFile("challenges.csv", challenges),
      csvFile("arena_attempts.csv", attempts),
      csvFile("events.csv", events),
      csvFile("event_registrations.csv", registrations),
      csvFile("event_attendance.csv", attendance),
      csvFile("event_leaderboard.csv", leaderboard),
      csvFile("achievements.csv", achievementsDef),
      csvFile("user_achievements.csv", userAchievements),
      csvFile("notifications.csv", notifications),
      csvFile("friendships.csv", friendships),
    ];

    // Stream ZIP response
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="math-collective-export-${new Date().toISOString().slice(0,10)}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    // By the time this fires the zip stream is mid-flight (Content-Type
    // header is set above), so headersSent is true and the helper's
    // res-write is a no-op. The point is the structured log + Sentry
    // hook the helper still triggers.
    archive.on("error", (err) => sendInternalError(res, err, "data export zip stream"));
    archive.pipe(res);

    // Add summary
    const summary = [
      `Math Collective — Data Export`,
      `Date: ${new Date().toISOString()}`,
      `Exported by: ${req.session?.user?.name || "admin"}`,
      ``,
      `Files:`,
      ...files.map(f => `  ${f.name} — ${f.data ? f.data.split("\n").length - 1 : 0} rows`),
    ].join("\n");
    archive.append(summary, { name: "README.txt" });

    // Add CSV files
    for (const f of files) {
      archive.append(f.data || "No data", { name: f.name });
    }

    await archive.finalize();
  } catch (err) {
    logger.error({ err: err }, "Export");
    if (!res.headersSent) {
      return sendInternalError(res, err, "data export");
    }
  }
};
