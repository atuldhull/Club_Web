// Tenant scoping: all DB calls use req.db.from(...). Admin stats
// from a non-super-admin caller now reflect ONLY the caller's org —
// previously these aggregates were summed across every org because
// no scoping was applied. Super_admin (no impersonation) still sees
// platform-wide totals because the Proxy returns the raw client for
// that role.
//
// Error handling: wrapped in catchAsync so Supabase errors / unexpected
// throws propagate to the global error handler (app.js) — logged via
// pino with requestId and returned as the standard 500 shape. The
// previous per-handler try/catch returning { error: "Failed..." }
// strings swallowed the stack trace and skipped requestId correlation.

import { catchAsync } from "../../lib/asyncHandler.js";

/* ═══════════════════════════════════════════
   STATS OVERVIEW
   GET /api/admin/stats
═══════════════════════════════════════════ */
export const getAdminStats = catchAsync(async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { count: totalStudents },
    { count: newStudentsThisWeek },
    { count: totalChallenges },
    { count: totalAttempts },
    { count: totalEvents },
  ] = await Promise.all([
    req.db.from("students")      .select("*", { count: "exact", head: true }),
    req.db.from("students")      .select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    req.db.from("challenges")    .select("*", { count: "exact", head: true }),
    req.db.from("arena_attempts").select("*", { count: "exact", head: true }),
    req.db.from("events")        .select("*", { count: "exact", head: true }),
  ]);

  const { data: topStudents } = await req.db
    .from("students")
    .select("name, email, xp")
    .order("xp", { ascending: false })
    .limit(3);

  const { data: recentActivity } = await req.db
    .from("arena_attempts")
    .select("correct, xp_earned, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return res.json({
    totalStudents:   totalStudents   || 0,
    newStudentsThisWeek: newStudentsThisWeek || 0,
    totalChallenges: totalChallenges || 0,
    totalAttempts:   totalAttempts   || 0,
    totalEvents:     totalEvents     || 0,
    topStudents:     topStudents     || [],
    recentActivity:  recentActivity  || [],
  });
});

/* ═══════════════════════════════════════════
   MANUAL WEEKLY RESET (admin)
   POST /api/admin/reset-week
   Admin can trigger a reset early if needed
═══════════════════════════════════════════ */
export const triggerWeeklyReset = catchAsync(async (req, res) => {
  const { performWeeklyReset } = await import("../../services/weeklyReset.js");
  const result = await performWeeklyReset();

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  return res.json({
    success: true,
    message: "Weekly leaderboard reset complete.",
    winner: result.winner ? {
      name: result.winner.name || result.winner.email,
      xp:   result.winner.weekly_xp,
    } : null,
  });
});
