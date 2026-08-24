import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { teacher } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

const statMeta = [
  { key: "totalStudents", label: "Total Students", color: "text-primary", bg: "bg-primary/10", icon: "people" },
  { key: "totalChallenges", label: "Challenges", color: "text-secondary", bg: "bg-secondary/10", icon: "challenge" },
  { key: "totalAttempts", label: "Attempts", color: "text-warning", bg: "bg-warning/10", icon: "attempts" },
  { key: "accuracy", label: "Accuracy", color: "text-success", bg: "bg-success/10", icon: "accuracy", suffix: "%" },
];

const statIcons = {
  people: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  challenge: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  attempts: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  accuracy: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function getAccuracyColor(accuracy) {
  if (accuracy >= 80) return { bar: "bg-success", text: "text-success" };
  if (accuracy >= 60) return { bar: "bg-primary", text: "text-primary" };
  if (accuracy >= 40) return { bar: "bg-warning", text: "text-warning" };
  return { bar: "bg-danger", text: "text-danger" };
}

function SkeletonLoader() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-[1.75rem] border border-line/15 bg-surface/40"
          />
        ))}
      </div>
      {/* Performance skeleton */}
      <div className="h-80 animate-pulse rounded-[1.75rem] border border-line/15 bg-surface/40" />
      {/* Activity skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-[1.75rem] border border-line/15 bg-surface/40" />
        <div className="h-64 animate-pulse rounded-[1.75rem] border border-line/15 bg-surface/40" />
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  useMonument("magma");
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const [statsRes, activityRes, perfRes] = await Promise.all([
          teacher.stats(),
          teacher.activity(),
          teacher.performance(),
        ]);
        if (cancelled) return;
        setStats(statsRes.data);
        setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
        setPerformance(Array.isArray(perfRes.data) ? perfRes.data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} /><SkeletonLoader /></div>;

  if (error) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="magma" intensity={0.1} />
        <Card variant="solid" className="text-center">
          <div className="flex flex-col items-center gap-4 py-12">
            <svg className="h-12 w-12 text-danger/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Engagement summary derived from stats
  const engagementRate = stats?.totalStudents
    ? Math.round((stats.totalAttempts / stats.totalStudents) * 10) / 10
    : 0;
  const avgChallengesPerStudent = stats?.totalStudents
    ? Math.round((stats.totalChallenges / stats.totalStudents) * 10) / 10
    : 0;

  return (
    <div style={{ position: "relative" }}>
    <MonumentBackground monument="magma" intensity={0.1} />
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div custom={0} variants={fadeUp}>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">
          Analytics
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-white">
          Teacher Dashboard
        </h1>
      </motion.div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statMeta.map((meta, i) => (
          <motion.div key={meta.key} custom={i + 1} variants={fadeUp}>
            <Card variant="glass" className="group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">
                    {meta.label}
                  </p>
                  <p className={`mt-2 font-display text-3xl font-bold ${meta.color}`}>
                    {stats?.[meta.key] ?? 0}{meta.suffix || ""}
                  </p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.bg} ${meta.color} transition-transform duration-300 group-hover:scale-110`}>
                  {statIcons[meta.icon]}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Performance Breakdown - Horizontal Bar Charts */}
      <motion.div custom={5} variants={fadeUp}>
        <Card variant="solid">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">
                Breakdown
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-white">
                Challenge Performance
              </h3>
            </div>
            <span className="rounded-full bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-text-dim">
              {performance.length} challenge{performance.length !== 1 ? "s" : ""}
            </span>
          </div>

          {performance.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <svg className="h-10 w-10 text-text-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <p className="text-sm text-text-dim">No performance data available yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {performance.map((item, i) => {
                const pct = typeof item.accuracy === "number"
                  ? item.accuracy
                  : item.total > 0
                    ? Math.round((item.correct / item.total) * 100)
                    : 0;
                const colors = getAccuracyColor(pct);

                return (
                  <motion.div
                    key={item.title || i}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                    className="group"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="truncate text-sm text-white pr-4" title={item.title}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-mono text-[10px] text-text-dim">
                          {item.correct}/{item.total}
                        </span>
                        <span className={`font-mono text-sm font-bold ${colors.text}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    {/* Bar */}
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className={`absolute inset-y-0 left-0 rounded-full ${colors.bar}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.4 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Activity Feed + Engagement Summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity feed - 2/3 width */}
        <motion.div custom={6} variants={fadeUp} className="lg:col-span-2">
          <Card variant="solid" className="h-full">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                  Live Feed
                </p>
                <h3 className="mt-1 font-display text-xl font-bold text-white">
                  Recent Activity
                </h3>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>

            {activity.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <svg className="h-10 w-10 text-text-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-text-dim">No recent activity yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                {activity.map((item, i) => (
                  <motion.div
                    key={item._id || item.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/10 bg-black/10 px-4 py-3 transition hover:bg-white/[0.02]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                        <span className="font-mono text-sm font-bold text-primary">
                          {item.studentName?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {item.studentName || "Unknown Student"}
                        </p>
                        <p className="font-mono text-[10px] text-text-dim">
                          {item.action || item.description || "Activity"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.status && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase ${
                            item.status === "correct"
                              ? "bg-success/10 text-success"
                              : item.status === "wrong"
                                ? "bg-danger/10 text-danger"
                                : "bg-warning/10 text-warning"
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-text-dim whitespace-nowrap">
                        {item.time || item.createdAt ? (
                          <>
                            {/* Full timestamp is ~150px and can't shrink — show time only on phones */}
                            <span className="hidden sm:inline">
                              {new Date(item.time || item.createdAt).toLocaleString()}
                            </span>
                            <span className="sm:hidden">
                              {new Date(item.time || item.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </>
                        ) : (
                          ""
                        )}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Student Engagement Summary - 1/3 width */}
        <motion.div custom={7} variants={fadeUp}>
          <Card variant="glass" className="h-full">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-warning">
              Insights
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-white">
              Engagement
            </h3>

            <div className="mt-6 space-y-5">
              {/* Attempts per student */}
              <div className="rounded-xl border border-line/10 bg-black/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold text-primary">{engagementRate}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">Attempts / Student</p>
                  </div>
                </div>
              </div>

              {/* Challenges per student */}
              <div className="rounded-xl border border-line/10 bg-black/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                    <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold text-secondary">{avgChallengesPerStudent}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">Challenges / Student</p>
                  </div>
                </div>
              </div>

              {/* Overall accuracy */}
              <div className="rounded-xl border border-line/10 bg-black/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                    <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-3.52 1.122 6.023 6.023 0 01-3.52-1.122" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold text-success">{stats?.accuracy ?? 0}%</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">Overall Accuracy</p>
                  </div>
                </div>
              </div>

              {/* Total students */}
              <div className="rounded-xl border border-line/10 bg-black/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                    <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold text-warning">{stats?.totalStudents ?? 0}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">Active Students</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
    </div>
  );
}
