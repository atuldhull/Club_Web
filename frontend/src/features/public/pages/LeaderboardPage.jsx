import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import MonumentHero from "@/components/monument/MonumentHero";
import { useMonument } from "@/hooks/useMonument";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import { leaderboard, events as eventsApi } from "@/lib/api";
// Phase 15 — wrap name mentions with UserHoverCard so any leaderboard
// row reveals Add Friend / Message on hover. Pre-warm the relationship
// store on page load so hovers are instant rather than firing N requests.
import UserHoverCard from "@/components/social/UserHoverCard";
import { useRelationshipStore } from "@/store/relationship-store";


export default function LeaderboardPage() {
  useMonument("glacier");
  const [tab, setTab] = useState("weekly");
  const [weekly, setWeekly] = useState([]);
  const [allTime, setAllTime] = useState([]);
  const [winners, setWinners] = useState([]);
  const [weekInfo, setWeekInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Event leaderboard state
  const [competitionEvents, setCompetitionEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventLb, setEventLb] = useState([]);
  const [eventLbLoading, setEventLbLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      leaderboard.weekly().catch(() => ({ data: [] })),
      leaderboard.allTime().catch(() => ({ data: [] })),
      leaderboard.winners().catch(() => ({ data: [] })),
      leaderboard.weekInfo().catch(() => ({ data: null })),
      eventsApi.list().catch(() => ({ data: [] })),
    ]).then(([w, a, win, info, ev]) => {
      setWeekly(Array.isArray(w.data) ? w.data : []);
      setAllTime(Array.isArray(a.data) ? a.data : []);
      setWinners(Array.isArray(win.data) ? win.data : []);
      setWeekInfo(info.data);
      // Only show competition/hackathon events that have ended
      const comps = (Array.isArray(ev.data) ? ev.data : [])
        .filter(e => (e.event_type === "competition" || e.event_type === "hackathon") && (e.status === "completed" || e.status === "past"));
      setCompetitionEvents(comps);
      setLoading(false);
    });
  }, []);

  // Fetch event leaderboard when event selected
  useEffect(() => {
    if (!selectedEventId) { setEventLb([]); return; }
    setEventLbLoading(true);
    eventsApi.leaderboard(selectedEventId)
      .then(r => setEventLb(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEventLb([]))
      .finally(() => setEventLbLoading(false));
  }, [selectedEventId]);

  const current = tab === "weekly" ? weekly : tab === "alltime" ? allTime : tab === "events" ? eventLb : winners;

  // Phase 15 — pre-warm the relationship store with every user_id
  // visible in the current tab, in a single batched request. Without
  // this, hovering each row would fire its own GET and the first hover
  // on a freshly-rendered list feels slow. With this, the cache is
  // already populated by the time the user moves their cursor.
  useEffect(() => {
    const ids = current.map((p) => p.user_id).filter(Boolean);
    if (ids.length === 0) return;
    useRelationshipStore.getState().fetchBatch(ids).catch(() => {});
  }, [current]);

  const rankColors = ["text-warning", "text-text-muted", "text-warning/70"];

  // Pick the correct XP field for the current tab. Uses ?? (nullish
  // coalescing), NOT || — an entry with `xp: 0` has a *real* zero and
  // we must not silently fall through to another field (that's what
  // made the weekly list look mis-ordered: rows with weekly_xp=0 but
  // lifetime xp>0 were showing lifetime XP instead of the 0 they'd
  // been sorted by).
  function xpFor(player) {
    if (tab === "weekly")  return player.xp         ?? 0; // backend sets xp = weekly_xp here
    if (tab === "alltime") return player.xp         ?? 0; // backend sets xp = lifetime xp here
    if (tab === "events")  return player.score      ?? 0; // event leaderboard shape
    if (tab === "winners") return player.winner_xp  ?? 0; // weekly_winners table
    return player.xp ?? player.total_xp ?? player.score ?? 0;
  }

  // The Hall of Fame uses the weekly_winners table which has a different
  // schema (winner_name, winner_email, winner_xp, week_start, week_end)
  // — not a live student row. Pull display fields tab-aware.
  function nameFor(player) {
    if (tab === "winners") return player.winner_name || "Anonymous";
    return player.name || player.student_name || "Member";
  }
  function subtitleFor(player) {
    if (tab === "winners") {
      const start = player.week_start ? new Date(player.week_start) : null;
      if (start && !Number.isNaN(start.getTime())) {
        return `Week of ${start.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}`;
      }
      return "Weekly winner";
    }
    return player.title || player.email || "";
  }

  // Profile-link target. Winners rows don't carry a user_id, so render a
  // non-clickable wrapper for those.
  function linkFor(player) {
    // Phase 15: point at the rich /profile/:userId route directly. The
    // /student/:userId redirect still works for any external/old links.
    if (tab !== "winners" && player.user_id) return `/profile/${player.user_id}`;
    return null;
  }

  return (
    <div style={{ position: "relative" }}>
      <MonumentBackground monument="glacier" intensity={0.15} />
      <div className="relative z-10 space-y-10 pb-16">
        <MonumentHero
          monument="glacier"
          title="Leaderboard"
          subtitle="Rankings"
          description={
            // Backend /api/leaderboard/week-info returns `weekEnd` + `timeLeftStr`.
            // Prefer the pre-formatted human string; otherwise parse weekEnd.
            // Guard against bad/missing dates so we never render "Invalid Date".
            (() => {
              if (!weekInfo) return undefined;
              if (weekInfo.timeLeftStr) return `Week resets in ${weekInfo.timeLeftStr}`;
              const end = weekInfo.weekEnd ? new Date(weekInfo.weekEnd) : null;
              if (end && !Number.isNaN(end.getTime())) {
                return `Week resets: ${end.toLocaleDateString()}`;
              }
              return undefined;
            })()
          }
        />

        <div className="flex flex-wrap justify-center gap-3">
          {[
            { key: "weekly", label: "This Week" },
            { key: "alltime", label: "All Time" },
            { key: "winners", label: "Hall of Fame" },
            { key: "events", label: "Events" },
          ].map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? "primary" : "ghost"}
              size="sm"
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {/* Event selector for Events tab */}
        {tab === "events" && (
          <div className="mx-auto max-w-md">
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
            >
              <option value="">— Select a competition —</option>
              {competitionEvents.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
            {competitionEvents.length === 0 && (
              <p className="mt-2 text-center text-xs text-text-dim">No completed competitions yet</p>
            )}
          </div>
        )}

        {(loading || (tab === "events" && eventLbLoading)) ? (
          <div className="relative z-10 flex justify-center py-20">
            <Loader variant="orbit" size="lg" label="Loading rankings..." />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto w-full max-w-6xl"
          >
            {/* Top 3 podium */}
            {current.length >= 3 && tab !== "winners" && (
              <div className="mx-auto mb-10 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
                {[1, 0, 2].map((idx) => {
                  const p = current[idx];
                  if (!p) return null;
                  const rank = idx + 1;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`text-center ${idx === 0 ? "order-first md:order-none md:-mt-4" : ""}`}
                    >
                      <Card variant={rank === 1 ? "glow" : "glass"} className="text-center" style={{ boxShadow: "0 0 20px var(--page-glow)" }}>
                        <p className={`math-text text-3xl font-bold ${rankColors[rank - 1] || "text-text-dim"}`}>
                          #{rank}
                        </p>
                        <p className="mt-2 text-sm font-medium text-white">
                          {p.user_id ? (
                            <UserHoverCard userId={p.user_id}>{nameFor(p)}</UserHoverCard>
                          ) : nameFor(p)}
                        </p>
                        {subtitleFor(p) && <p className="font-mono text-[9px] uppercase tracking-wider text-secondary/70">{subtitleFor(p)}</p>}
                        <p className="math-text mt-1 text-2xl font-bold text-primary">
                          {xpFor(p)}
                        </p>
                        <p className="font-mono text-[10px] text-text-dim">XP</p>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Full list — two columns on wide screens so the ranking
                fills the page instead of a thin centred strip. */}
            <Card variant="solid">
              <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-x-4">
                {current.length === 0 && (
                  <p className="py-8 text-center text-text-dim lg:col-span-2">
                    {tab === "winners"
                      ? "No past winners yet. Weekly winners appear here after each week closes."
                      : tab === "events"
                        ? "Pick a competition above to see its final leaderboard."
                        : "No rankings available yet."}
                  </p>
                )}
                {current.map((player, i) => {
                  const href = linkFor(player);
                  const body = (
                    <>
                      <p className={`truncate text-sm font-medium text-white ${href ? "hover:text-primary" : ""}`}>
                        {player.user_id ? (
                          <UserHoverCard userId={player.user_id}>{nameFor(player)}</UserHoverCard>
                        ) : nameFor(player)}
                      </p>
                      <p className="truncate font-mono text-[10px] text-text-dim">
                        {subtitleFor(player)}
                      </p>
                    </>
                  );
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      className="flex items-center gap-4 rounded-xl border border-line/10 bg-black/10 px-4 py-3"
                    >
                      <span className={`math-text flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        i < 3 ? `${rankColors[i]} bg-warning/10` : "bg-white/5 text-text-dim"
                      }`}>
                        {i + 1}
                      </span>
                      {href ? (
                        <Link to={href} className="flex-1 min-w-0 transition hover:opacity-80">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex-1 min-w-0">{body}</div>
                      )}
                      <span className="math-text text-lg font-bold text-primary">
                        {xpFor(player)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
