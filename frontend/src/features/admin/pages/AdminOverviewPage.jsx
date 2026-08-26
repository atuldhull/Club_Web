import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import { admin, leaderboard } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";
import UserHoverCard from "@/components/social/UserHoverCard";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }) };

export default function AdminOverviewPage() {
  useMonument("magma");
  const [stats, setStats] = useState(null);
  const [weekInfo, setWeekInfo] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);

  const renewWeek = async () => {
    if (!confirm("Start a new leaderboard week? Current standings get archived as winners.")) return;
    setResetting(true);
    try {
      const { data } = await admin.resetWeek();
      setResetMsg(data.message || "Week reset — fresh rankings live.");
      const fresh = await leaderboard.weekInfo().catch(() => ({ data: null }));
      setWeekInfo(fresh.data);
      setTimeout(() => setResetMsg(null), 5000);
    } catch (err) {
      setResetMsg(err?.response?.data?.error || "Reset failed — try again.");
      setTimeout(() => setResetMsg(null), 5000);
    }
    setResetting(false);
  };

  useEffect(() => {
    Promise.all([
      admin.stats().catch(() => ({ data: null })),
      leaderboard.weekInfo().catch(() => ({ data: null })),
      admin.activeUsers().catch(() => ({ data: [] })),
    ]).then(([s, w, a]) => {
      setStats(s.data);
      setWeekInfo(w.data);
      setActiveUsers(Array.isArray(a.data) ? a.data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} /><div className="flex justify-center py-20"><Loader variant="orbit" size="lg" label="Loading dashboard..." /></div></div>;

  const cards = [
    { label: "Total Students", value: stats?.totalStudents ?? 0, color: "text-primary", icon: "👥" },
    { label: "New This Week", value: stats?.newStudentsThisWeek ?? 0, color: "text-glow", icon: "✨" },
    { label: "Active Challenges", value: stats?.totalChallenges ?? 0, color: "text-secondary", icon: "🧩" },
    { label: "Total Submissions", value: stats?.totalAttempts ?? 0, color: "text-success", icon: "📝" },
    { label: "Events Created", value: stats?.totalEvents ?? 0, color: "text-warning", icon: "📅" },
  ];

  return (
    <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} />
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c, i) => (
          <motion.div key={c.label} custom={i} variants={fadeUp}>
            <Card variant="glass" className="text-center">
              <span className="text-2xl">{c.icon}</span>
              <p className={`mt-2 math-text text-3xl font-bold ${c.color}`}>{c.value}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-text-dim">{c.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Week countdown */}
        <motion.div custom={4} variants={fadeUp}>
          <Card variant={weekInfo?.expired ? "solid" : "glow"} className={weekInfo?.expired ? "border-warning/35" : ""}>
            <div className="flex items-center justify-between">
              <p className={`font-mono text-[11px] uppercase tracking-[0.3em] ${weekInfo?.expired ? "text-warning" : "text-glow"}`}>
                Leaderboard Cycle
              </p>
              {weekInfo?.expired && (
                <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-warning">
                  Expired
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className={`font-display text-3xl font-bold ${weekInfo?.expired ? "text-warning" : "text-white"}`}>
                  {weekInfo?.timeLeftStr || "—"}
                </p>
                <p className="mt-1 text-xs text-text-dim">
                  {weekInfo?.expired ? "Admin action required" : "until weekly reset"}
                </p>
              </div>
              <div className="text-right text-xs text-text-dim">
                <p>Started: {weekInfo?.weekStart ? new Date(weekInfo.weekStart).toLocaleDateString() : "—"}</p>
                <p>Ends: {weekInfo?.weekEnd ? new Date(weekInfo.weekEnd).toLocaleDateString() : "—"}</p>
              </div>
            </div>
            {weekInfo?.expired && (
              <div className="mt-4 border-t border-line/10 pt-3">
                <Button size="sm" variant="primary" loading={resetting} onClick={renewWeek} className="w-full">
                  🔄 Start New Week
                </Button>
              </div>
            )}
            {resetMsg && (
              <p className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
                {resetMsg}
              </p>
            )}
          </Card>
        </motion.div>

        {/* Live users */}
        <motion.div custom={5} variants={fadeUp}>
          <Card variant="solid">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-success">Live Users</p>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                <span className="font-mono text-xs text-success">{activeUsers.length} online</span>
              </span>
            </div>
            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {activeUsers.length === 0 && <p className="py-3 text-center text-xs text-text-dim">No users online</p>}
              {activeUsers.slice(0, 10).map((u, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-line/5 bg-black/10 px-3 py-2">
                  <div>
                    <p className="text-xs text-white">{u.name || "User"}</p>
                    <p className="font-mono text-[9px] text-text-dim">{u.page || "/"}</p>
                  </div>
                  <span className="font-mono text-[9px] text-text-dim">{u.sessionDuration ? `${Math.floor(u.sessionDuration / 60)}m` : ""}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Top students */}
        <motion.div custom={6} variants={fadeUp}>
          <Card variant="solid">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Top Students</p>
            <div className="mt-4 space-y-2">
              {(!stats?.topStudents || stats.topStudents.length === 0) && <p className="py-3 text-center text-xs text-text-dim">No data</p>}
              {(stats?.topStudents || []).slice(0, 8).map((s, i) => (
                <div key={s.id || i} className="flex items-center justify-between rounded-lg border border-line/5 bg-black/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[9px] font-bold ${i < 3 ? "bg-warning/15 text-warning" : "bg-white/5 text-text-dim"}`}>{i + 1}</span>
                    <div>
                      <p className="text-xs text-white">
                        {s.id
                          ? <UserHoverCard userId={s.id}>{s.name || s.email}</UserHoverCard>
                          : (s.name || s.email)}
                      </p>
                      <p className="font-mono text-[9px] text-text-dim">{s.title || "Student"}</p>
                    </div>
                  </div>
                  <span className="math-text text-sm font-bold text-primary">{s.xp || 0}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Recent activity */}
        <motion.div custom={7} variants={fadeUp}>
          <Card variant="glass">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">Recent Activity</p>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {(!stats?.recentActivity || stats.recentActivity.length === 0) && <p className="py-3 text-center text-xs text-text-dim">No activity</p>}
              {(stats?.recentActivity || []).slice(0, 12).map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-line/5 bg-black/10 px-3 py-2">
                  <div>
                    <p className="text-xs text-white">{a.student_name || a.name || "User"}</p>
                    <p className="font-mono text-[9px] text-text-dim">{a.challenge_title || a.action || "Activity"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.is_correct !== undefined && (
                      <span className={`h-1.5 w-1.5 rounded-full ${a.is_correct ? "bg-success" : "bg-danger"}`} />
                    )}
                    <span className="font-mono text-[9px] text-text-dim">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Quick nav */}
      <motion.div custom={8} variants={fadeUp}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { to: "/admin/users", label: "Manage Users", icon: "👥" },
            { to: "/admin/challenges", label: "Challenges", icon: "🧩" },
            { to: "/admin/events", label: "Events", icon: "📅" },
            { to: "/admin/data", label: "Data Ops", icon: "🗄️" },
            { to: "/admin/settings", label: "Settings", icon: "⚙️" },
          ].map((a) => (
            <Link key={a.to} to={a.to}
              className="flex items-center gap-3 rounded-xl border border-line/10 bg-white/[0.02] px-4 py-3 text-sm text-text-muted transition hover:border-primary/20 hover:bg-primary/5 hover:text-white">
              <span>{a.icon}</span>{a.label}
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
    </div>
  );
}
