import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import MonumentHero from "@/components/monument/MonumentHero";
import { useMonument } from "@/hooks/useMonument";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { user, arena, announcements as announcementsApi, notifications as notifApi, chat, achievements as achievementsApi } from "@/lib/api";
import AchievementBadge from "@/components/ui/AchievementBadge";
import UserHoverCard from "@/components/social/UserHoverCard";
import DailyProblemCard from "@/features/dashboard/components/DailyProblemCard";
import SprintWidget from "@/features/sprints/components/SprintWidget";

// Ambient math glyphs scattered across the page background — same
// visual signature as the auth pages, anchors the logged-in surfaces
// to the same family of decoration. Pyramid-themed coloring nods to
// the monument backdrop. Pointer-events-none so nothing is clickable.
function DashboardAmbientGlyphs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 select-none">
      <span className="math-text absolute left-[3%] top-[12%] text-[9rem] text-warning/[0.04]">π</span>
      <span className="math-text absolute right-[5%] top-[20%] text-[8rem] text-white/[0.03]">∫</span>
      <span className="math-text absolute left-[10%] top-[55%] text-[6rem] text-white/[0.03]">Σ</span>
      <span className="math-text absolute right-[8%] bottom-[15%] text-[7rem] text-primary/[0.04]">∞</span>
      <span className="math-text absolute left-[45%] top-[70%] text-[5rem] text-white/[0.025]">√</span>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

/** Friends card — shows friends list + pending requests + search */
function FriendsCard() {
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState("friends"); // friends | pending | search
  const [loadError, setLoadError] = useState(false);

  const loadFriendsData = () => {
    setLoadError(false);
    // Launch both requests; any failure trips the error flag so the
    // widget surfaces a small retry affordance. Success on either
    // partially populates the UI — better than silent empty state.
    let hadError = false;
    const tripError = () => { if (!hadError) { hadError = true; setLoadError(true); } };
    chat.getFriends().then((r) => setFriends(r.data || [])).catch(tripError);
    chat.getPending().then((r) => setPending(r.data || [])).catch(tripError);
  };

  useEffect(loadFriendsData, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    try { const { data } = await chat.searchUsers(q); setResults(data || []); } catch { setResults([]); }
  };

  return (
    <Card variant="solid">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-glow">
          Friends {friends.length > 0 && <span className="text-white">({friends.length})</span>}
        </p>
        {pending.length > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">{pending.length} new</span>
        )}
      </div>
      {loadError && (
        <p className="mt-2 text-xs text-text-dim">
          Couldn&apos;t load friends.{" "}
          <button onClick={loadFriendsData} className="text-primary hover:underline">Retry</button>
        </p>
      )}

      {/* Tabs */}
      <div className="mt-3 flex gap-1 rounded-lg bg-white/[0.03] p-0.5">
        {[
          { key: "friends", label: "Friends" },
          { key: "pending", label: `Requests${pending.length ? ` (${pending.length})` : ""}` },
          { key: "search", label: "Find" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition ${
              tab === t.key ? "bg-primary/15 text-white" : "text-text-dim hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
        {/* Friends list */}
        {tab === "friends" && (
          friends.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-dim">No friends yet. Search to add!</p>
          ) : (
            friends.map((f) => (
              <Link key={f.user_id} to={`/profile/${f.user_id}`}
                className="flex items-center gap-2.5 rounded-lg border border-line/5 bg-black/10 px-3 py-2 transition hover:border-primary/20">
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                  style={{ background: f.avatar_color || "linear-gradient(135deg,#7c3aed,#3b82f6)" }}>
                  {f.avatar_emoji || f.name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white">
                    <UserHoverCard userId={f.user_id}>{f.name}</UserHoverCard>
                  </p>
                  <p className="text-[9px] text-text-dim">{f.title || "Student"}</p>
                </div>
              </Link>
            ))
          )
        )}

        {/* Pending requests */}
        {tab === "pending" && (
          pending.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-dim">No pending requests</p>
          ) : (
            pending.map((req) => (
              <div key={req.id} className="flex items-center gap-2 rounded-lg border border-line/5 bg-black/10 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white">
                    {req.requester?.user_id
                      ? <UserHoverCard userId={req.requester.user_id}>{req.requester?.name || "User"}</UserHoverCard>
                      : (req.requester?.name || "User")}
                  </p>
                </div>
                <button onClick={async () => {
                  await chat.respondRequest(req.id, true);
                  setPending((p) => p.filter((r) => r.id !== req.id));
                  chat.getFriends().then((r) => setFriends(r.data || []));
                }} className="rounded-lg bg-success/15 px-3 py-2 text-[11px] text-success hover:bg-success/25">Accept</button>
                <button onClick={async () => {
                  await chat.respondRequest(req.id, false);
                  setPending((p) => p.filter((r) => r.id !== req.id));
                }} className="rounded-lg bg-danger/15 px-3 py-2 text-[11px] text-danger hover:bg-danger/25">Decline</button>
              </div>
            ))
          )
        )}

        {/* Search people */}
        {tab === "search" && (
          <>
            <input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full rounded-lg border border-line/15 bg-black/15 px-3 py-1.5 text-xs text-white outline-none focus:border-primary/30" />
            {results.map((u) => (
              <div key={u.user_id} className="flex items-center gap-2 rounded-lg border border-line/5 bg-black/10 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                  style={{ background: u.avatar_color || "linear-gradient(135deg,#7c3aed,#3b82f6)" }}>
                  {u.avatar_emoji || u.name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white">
                    <UserHoverCard userId={u.user_id}>{u.name}</UserHoverCard>
                  </p>
                  <p className="text-[9px] text-text-dim">{u.xp || 0} XP</p>
                </div>
                <Link to={`/profile/${u.user_id}`} className="rounded-lg bg-primary/15 px-3 py-2 text-[11px] text-primary hover:bg-primary/25">
                  View
                </Link>
              </div>
            ))}
          </>
        )}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  useMonument("pyramid");
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [arenaStats, setArenaStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      user.profile().catch(() => ({ data: null })),
      user.stats().catch(() => ({ data: null })),
      arena.stats().catch(() => ({ data: null })),
      arena.history().catch(() => ({ data: [] })),
      announcementsApi.list().catch(() => ({ data: [] })),
      notifApi.list().catch(() => ({ data: [] })),
    ]).then(([p, s, as, h, ann, n]) => {
      setProfile(p.data);
      setStats(s.data);
      setArenaStats(as.data);
      setHistory(Array.isArray(h.data) ? h.data.slice(0, 8) : []);
      setAnnouncements(Array.isArray(ann.data) ? ann.data.slice(0, 3) : []);
      setNotifs(Array.isArray(n.data) ? n.data.slice(0, 5) : []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="pyramid" intensity={0.15} />
        <div className="relative z-10 flex min-h-[60vh] items-center justify-center">
          <Loader variant="orbit" size="lg" label="Loading dashboard..." />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total XP", value: stats?.xp || profile?.xp || 0, icon: "⚡", change: `Rank #${stats?.rank || "—"}` },
    { label: "Problems Solved", value: stats?.solved || arenaStats?.correct || 0, icon: "✅", change: `of ${stats?.total || arenaStats?.total || 0} attempted` },
    { label: "Accuracy", value: `${stats?.accuracy || arenaStats?.accuracy || 0}%`, icon: "🎯", change: `${arenaStats?.correct || 0} correct` },
    { label: "Title", value: stats?.title || profile?.title || "Novice", icon: "🏆", change: stats?.nextTitle ? `Next: ${stats.nextTitle}` : "Max rank!" },
  ];

  return (
    <div style={{ position: "relative" }}>
      <MonumentBackground monument="pyramid" intensity={0.15} />
      <DashboardAmbientGlyphs />
      <div className="relative z-10 space-y-8 pb-16">
        {/* Welcome */}
        <MonumentHero
          monument="pyramid"
          title={`Welcome${profile?.name ? `, ${profile.name.split(" ")[0]}` : " back"}`}
          subtitle="Control Panel"
        >
          <Link to="/profile">
            <Button variant="secondary" size="sm">View Profile</Button>
          </Link>
        </MonumentHero>

        {/* Stats Grid — numerical values use AnimatedNumber so they
            count up on first render. Non-numeric (Title) just renders
            the string. The numericValue field tells us which is which
            without needing to parse the display string. */}
        <motion.section initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} custom={i + 1} variants={fadeUp}>
              <Card variant="glass" interactive className="text-center">
                <span className="text-2xl">{stat.icon}</span>
                <p className="math-text mt-3 text-3xl font-bold tracking-tight text-white">
                  {typeof stat.value === "number"
                    ? <AnimatedNumber value={stat.value} duration={1.2} />
                    : stat.value}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-text-dim">{stat.label}</p>
                <p className="math-text mt-2 text-xs text-success">{stat.change}</p>
              </Card>
            </motion.div>
          ))}
        </motion.section>

        <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {/* XP Progress */}
            {stats?.xpTitles && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card variant="solid">
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Progression</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-white">XP Title Ladder</h2>
                  <div className="mt-4 space-y-2">
                    {(Array.isArray(stats.xpTitles) ? stats.xpTitles : []).map((t) => {
                      const isCurrent = t.title === (stats.title || profile?.title);
                      return (
                        <div key={t.title} className={`flex items-center justify-between rounded-xl border px-4 py-2 ${
                          isCurrent ? "border-primary/30 bg-primary/10" : "border-line/10 bg-black/10"
                        }`}>
                          <span className={`text-sm ${isCurrent ? "font-bold text-white" : "text-text-muted"}`}>
                            {t.title} {isCurrent && "← You"}
                          </span>
                          <span className="math-text text-xs text-text-dim">{t.minXp} XP</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.section>
            )}

            {/* Recent Activity */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card variant="glass">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">Activity Log</p>
                    <h2 className="mt-2 font-display text-2xl font-bold text-white">Recent Attempts</h2>
                  </div>
                  <Link to="/history" className="font-mono text-[11px] text-primary hover:text-secondary transition">
                    View all
                  </Link>
                </div>
                <div className="mt-5 space-y-3">
                  {history.length === 0 && (
                    <p className="py-4 text-center text-sm text-text-dim">No attempts yet. Start solving!</p>
                  )}
                  {history.map((item, i) => (
                    <motion.div
                      key={item.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.05 }}
                      className="flex items-center gap-4 rounded-2xl border border-line/10 bg-black/10 px-4 py-3"
                    >
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                        item.is_correct || item.correct ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                      }`}>
                        {item.is_correct || item.correct ? "✓" : "×"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.challenge_title || item.title || "Challenge"}</p>
                        <p className="font-mono text-[10px] text-text-dim">
                          {item.difficulty || ""} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <span className={`math-text text-sm font-bold ${
                        (item.xp_earned || item.points_earned || 0) > 0 ? "text-success" : "text-text-dim"
                      }`}>
                        +{item.xp_earned || item.points_earned || 0}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.section>
          </div>

          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            {/* Solution Sprint — weekly featured problem with a
                window-scoped leaderboard. Drives focused engagement
                on a single problem at a time. */}
            <SprintWidget />

            {/* Daily problem of the day — rotating widget that drives
                daily return visits. Streak badge sits in the header. */}
            <DailyProblemCard />

            {/* Announcements */}
            <Card variant="glow">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-glow">Announcements</p>
              <div className="mt-4 space-y-4">
                {announcements.length === 0 && (
                  <p className="py-2 text-center text-sm text-text-dim">No announcements</p>
                )}
                {announcements.map((ann, i) => (
                  <div key={ann.id || i} className="rounded-2xl border border-line/10 bg-black/15 p-4">
                    <p className="text-sm font-medium text-white">{ann.title}</p>
                    <p className="mt-2 text-xs leading-5 text-text-muted">{ann.content || ann.body}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Notifications preview */}
            <Card variant="solid">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">Notifications</p>
                <Link to="/notifications" className="font-mono text-[10px] text-primary hover:text-secondary transition">View all</Link>
              </div>
              <div className="mt-4 space-y-2">
                {notifs.length === 0 && <p className="py-2 text-center text-xs text-text-dim">All caught up!</p>}
                {notifs.map((n, i) => (
                  <div key={n.id || i} className="flex items-start gap-2 rounded-xl border border-line/10 bg-black/10 px-3 py-2">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-text-dim" : "bg-primary"}`} />
                    <p className="text-xs text-text-muted line-clamp-2">{n.body || n.title}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Friends */}
            <FriendsCard />

            {/* Recent Achievements */}
            <RecentAchievements />

            {/* Quick actions */}
            <Card variant="glass">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Quick Actions</p>
              <div className="mt-4 grid gap-3">
                <Link to="/arena"><Button size="sm" className="w-full justify-center">Enter Arena</Button></Link>
                <Link to="/live-quiz"><Button variant="secondary" size="sm" className="w-full justify-center">Join Live Quiz</Button></Link>
                <Link to="/certificates"><Button variant="ghost" size="sm" className="w-full justify-center">View Certificates</Button></Link>
                <Link to="/projects"><Button variant="ghost" size="sm" className="w-full justify-center">Browse Projects</Button></Link>
                <Link to="/referrals"><Button variant="ghost" size="sm" className="w-full justify-center">Invite Friends</Button></Link>
              </div>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}

/** Recent achievements mini-card for dashboard sidebar */
function RecentAchievements() {
  const [myAch, setMyAch] = useState([]);
  const [allAch, setAllAch] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      achievementsApi.mine().catch(() => ({ data: [] })),
      achievementsApi.list().catch(() => ({ data: [] })),
    ]).then(([mine, all]) => {
      setMyAch(Array.isArray(mine.data) ? mine.data : []);
      setAllAch(Array.isArray(all.data) ? all.data : []);
      setLoading(false);
    });
  }, []);

  const unlockedIds = new Set(myAch.map(u => u.achievement_id));
  const recent = myAch.slice(0, 3);

  if (loading) return null;
  if (allAch.length === 0) return null;

  return (
    <Card variant="glass">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Achievements</p>
        <span className="math-text text-[10px] text-text-dim">{unlockedIds.size}/{allAch.length}</span>
      </div>
      {recent.length === 0 ? (
        <p className="mt-3 text-xs text-text-dim">No achievements unlocked yet. Keep going!</p>
      ) : (
        <div className="mt-3 space-y-2">
          {recent.map(u => {
            const ach = u.achievements || allAch.find(a => a.id === u.achievement_id);
            if (!ach) return null;
            return <AchievementBadge key={u.id} achievement={ach} unlocked compact />;
          })}
        </div>
      )}
      <Link to="/profile" className="mt-3 block text-center font-mono text-[10px] text-primary/60 hover:text-primary transition">
        View all →
      </Link>
    </Card>
  );
}
