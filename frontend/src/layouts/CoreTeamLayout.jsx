/**
 * CoreTeamLayout — shell for the Core Team portal (/core/*).
 *
 * Gates on core-store: a loader while membership resolves, the access
 * gate for outsiders, and the full sidebar + Outlet for members.
 */
import { useEffect } from "react";
import { motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import GridBackground from "@/components/backgrounds/GridBackground";
import BrandMark from "@/components/navigation/BrandMark";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useCoreStore } from "@/store/core-store";
import { useAuthStore } from "@/store/auth-store";
import CoreBadge from "@/features/coreTeam/components/CoreBadge";
import CoreAccessGate from "@/features/coreTeam/components/CoreAccessGate";

const NAV = [
  { to: "/core",          label: "Dashboard", end: true,  icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" },
  { to: "/core/tasks",    label: "Tasks",     icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { to: "/core/feedback", label: "Feedback",  icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" },
  { to: "/core/ideas",    label: "Ideas",     icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { to: "/core/trends",   label: "Trends",    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { to: "/core/meetings", label: "Meetings",  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to: "/core/chat",     label: "Chat",      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { to: "/core/roster",   label: "Roster",    icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.93" },
];

function navClass(isActive) {
  return cn(
    "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 transition duration-200",
    isActive
      ? "border border-primary/30 bg-primary/12 text-white shadow-orbit"
      : "text-text-muted hover:bg-white/[0.04] hover:text-white",
  );
}

function NavIcon({ d }) {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function CoreTeamLayout() {
  const location = useLocation();
  const { status, member, teamRank, fetchMe } = useCoreStore();
  const authUserId = useAuthStore((s) => s.user?.id);

  // Re-resolve core membership whenever the signed-in user changes.
  // CRITICAL on shared computers: the core-store is module-level, so
  // without this the previous person's core profile stays cached and
  // the next user sees the wrong identity. Keying on authUserId forces
  // a fresh /core/me for each user.
  useEffect(() => {
    if (authUserId) fetchMe();
  }, [authUserId, fetchMe]);

  // ── resolving / error / outsider states ──
  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian">
        <Loader variant="orbit" size="lg" label="Opening the portal…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-obsidian px-4 text-center">
        <p className="text-text-muted">The portal couldn&apos;t load right now.</p>
        <Button variant="secondary" size="sm" onClick={fetchMe}>Retry</Button>
      </div>
    );
  }

  if (status === "outsider") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-obsidian text-text-primary">
        <GridBackground accent="primary" />
        <div className="relative z-10">
          <CoreAccessGate />
        </div>
      </div>
    );
  }

  // ── member view ──
  const active = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))) || NAV[0];
  const teamName = member?.core_teams?.name || (member?.tier === "council" ? "Club Council" : "Core Team");

  return (
    <div className="relative min-h-screen overflow-hidden bg-obsidian text-text-primary">
      <GridBackground accent="primary" />

      <div className="relative z-10 flex min-h-screen w-full flex-col gap-4 px-4 py-4 lg:flex-row">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-[16.5rem] lg:flex-col"
        >
          <div className="rounded-2xl border border-line/15 bg-surface/60 p-5 shadow-panel backdrop-blur-2xl lg:flex lg:h-full lg:flex-col">
            <div className="flex items-center justify-between gap-3">
              <BrandMark compact />
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                Core
              </span>
            </div>

            {/* Member chip */}
            <div className="mt-5 rounded-xl border border-line/12 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-display text-sm font-bold text-white">
                  {(member?.name || "C")[0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{member?.name}</p>
                  <p className="truncate font-mono text-[10px] text-text-dim">{member?.position} · {teamName}</p>
                </div>
              </div>
              {/* Points + rank are lg-only — on phones the chip stays a
                  single compact row so the stacked sidebar doesn't push
                  the page content below the fold. */}
              <div className="mt-3 hidden items-center justify-between lg:flex">
                <CoreBadge tier={member?.tier} />
                <span className="math-text text-sm font-bold text-primary">
                  {member?.points ?? 0} <span className="font-mono text-[9px] text-text-dim">pts</span>
                </span>
              </div>
              {teamRank && (
                <p className="mt-2 hidden font-mono text-[10px] text-text-dim lg:block">
                  Rank #{teamRank.rank} of {teamRank.of} in {teamName}
                </p>
              )}
            </div>

            {/* Below lg the nav collapses into a horizontally scrollable
                pill row instead of a full-height stacked list. */}
            <nav className="mt-5 flex gap-1.5 overflow-x-auto lg:block lg:flex-1 lg:space-y-1.5 lg:overflow-visible">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navClass(isActive)}>
                  <NavIcon d={item.icon} />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <NavLink
              to="/"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-white/[0.03] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition hover:border-secondary/25 hover:text-white"
            >
              Exit Portal
            </NavLink>
          </div>
        </motion.aside>

        {/* Main */}
        <div className="flex-1 lg:min-w-0">
          <motion.header
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="sticky top-4 z-30 mb-6 rounded-2xl border border-line/15 bg-surface/60 px-6 py-4 shadow-panel backdrop-blur-2xl"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
              Core Team / {active.label}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.04em] text-white">
              {teamName}
            </h1>
          </motion.header>

          <main className="flex flex-1 flex-col pb-10 [&>*]:flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
