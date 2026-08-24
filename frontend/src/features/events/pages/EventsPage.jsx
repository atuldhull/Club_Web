/**
 * EventsPage — Complete event browsing + registration + check-in flow.
 *
 * User Flows:
 *   1. Browse: Timeline of events with filters (All/Live/Upcoming/Completed)
 *   2. Register: Click "Register" → confirm modal → success/waitlisted/error
 *   3. Cancel: Click "Cancel Registration" → confirm → removed
 *   4. Check-in: Click "Check In" → enter code (if required) → XP awarded
 *   5. View Details: Expanded card with description, capacity, leaderboard link
 *
 * States: loading, empty, error, registered, waitlisted, attended, full
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import EventStatusBadge from "@/components/ui/EventStatusBadge";
import EventTypeBadge from "@/components/ui/EventTypeBadge";
import CapacityBar from "@/components/ui/CapacityBar";
import EventQrCode from "@/components/ui/EventQrCode";
import EventHero from "@/features/events/components/EventHero";
import EventExplorer from "@/features/events/components/EventExplorer";
import { events as eventsApi, insights } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { openRazorpayCheckout } from "@/lib/razorpay";

// ── Helpers ──────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function timeUntil(d) {
  if (!d) return "";
  const diff = new Date(d) - new Date();
  if (diff < 0) return "Started";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// ── Main Component ───────────────────────────────────────

export default function EventsPage() {
  useMonument("jungle");
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");       // status filter
  const [typeFilter, setTypeFilter] = useState("all"); // category/type filter

  // Modal/action states
  const [actionLoading, setActionLoading] = useState(null); // event id being acted on
  const [actionResult, setActionResult] = useState(null); // { eventId, type, message }
  const [checkinCode, setCheckinCode] = useState("");
  const [showCheckin, setShowCheckin] = useState(null); // event id showing checkin input
  // Team registration — open a small inline form for team events
  // (name + size). Keyed by event.id so the form shows for just the
  // event being registered, not all team events at once.
  const [showTeamForm, setShowTeamForm] = useState(null); // event id
  const [teamForm, setTeamForm] = useState({ name: "", size: "" });
  const [recs, setRecs] = useState([]);
  const [recPrefs, setRecPrefs] = useState(null);
  // Paid-event payment submission state (migration 19).
  // Keyed by event.id so multiple open payment forms on the page
  // don't trample each other.
  const [payRefInputs, setPayRefInputs] = useState({});
  const [payLoading, setPayLoading] = useState(null);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await eventsApi.list();
      setEventsList(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load events");
      setEventsList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Fetch personalized recommendations (only if logged in)
  useEffect(() => {
    if (!user) return;
    insights.recommendations()
      .then(r => { setRecs(r.data?.recommendations || []); setRecPrefs(r.data?.preferences || null); })
      .catch(() => {});
  }, [user]);

  // Clear action result after 4 seconds
  useEffect(() => {
    if (!actionResult) return;
    const t = setTimeout(() => setActionResult(null), 4000);
    return () => clearTimeout(t);
  }, [actionResult]);

  // Filter: apply both type and status filters
  const filtered = eventsList.filter((e) => {
    if (typeFilter !== "all" && (e.event_type || "general") !== typeFilter) return false;
    if (filter !== "all") {
      const s = e.status || "upcoming";
      // "completed" filter should also match "past" status
      if (filter === "completed") { if (s !== "completed" && s !== "past") return false; }
      else if (s !== filter) return false;
    }
    return true;
  });

  // Event type counts (for explorer cards)
  const typeCounts = {};
  eventsList.forEach(e => {
    const t = e.event_type || "general";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  // ── Actions ────────────────────────────────────────────

  const handleRegister = async (event) => {
    if (!user) { navigate("/login"); return; }
    // Team events collect a team name + size before calling the API.
    // Clicking Register on a team event opens the inline form and
    // returns — the real register call happens from that form's
    // confirm button via submitTeamRegistration.
    if (event.is_team_event) {
      setShowTeamForm(event.id);
      setTeamForm({ name: "", size: String(event.min_team_size || 2) });
      return;
    }
    await submitRegistration(event, null);
  };

  async function submitRegistration(event, teamPayload) {
    setActionLoading(event.id);
    try {
      const { data } = await eventsApi.register(event.id, teamPayload || undefined);
      setActionResult({
        eventId: event.id,
        type: data.waitlisted ? "warning" : "success",
        message: data.waitlisted
          ? "You're on the waitlist — we'll notify you if a spot opens"
          : "Registered successfully!",
      });
      setShowTeamForm(null);
      setTeamForm({ name: "", size: "" });
      fetchEvents(); // refresh counts
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      setActionResult({ eventId: event.id, type: "error", message: msg });
    } finally {
      setActionLoading(null);
    }
  }

  const submitTeamRegistration = (event) => {
    const name = teamForm.name.trim();
    const size = Number(teamForm.size);
    if (!name) {
      setActionResult({ eventId: event.id, type: "error", message: "Team name required" });
      return;
    }
    const mn = event.min_team_size || 1;
    const mx = event.max_team_size || 50;
    if (!Number.isInteger(size) || size < mn || size > mx) {
      setActionResult({
        eventId: event.id,
        type: "error",
        message: `Team size must be between ${mn} and ${mx}`,
      });
      return;
    }
    return submitRegistration(event, { team_name: name, team_size: size });
  };

  const handleCancel = async (event) => {
    if (!confirm("Cancel your registration?")) return;
    setActionLoading(event.id);
    try {
      await eventsApi.cancelReg(event.id);
      setActionResult({ eventId: event.id, type: "success", message: "Registration cancelled" });
      fetchEvents();
    } catch (err) {
      setActionResult({ eventId: event.id, type: "error", message: err.response?.data?.error || "Cancel failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // Paid-event: submit UPI transaction reference after paying.
  const handleSubmitPayment = async (event) => {
    const regId = event.user_registration?.id;
    const ref = (payRefInputs[event.id] || "").trim();
    if (!regId || !ref) return;
    setPayLoading(event.id);
    try {
      await eventsApi.submitPayment(event.id, regId, ref);
      setActionResult({
        eventId: event.id,
        type: "success",
        message: "Payment reference submitted — an admin will verify shortly",
      });
      setPayRefInputs((s) => ({ ...s, [event.id]: "" }));
      fetchEvents();
    } catch (err) {
      const issues = err.response?.data?.issues;
      const msg = issues?.[0]?.message
        || err.response?.data?.error
        || "Submission failed";
      setActionResult({ eventId: event.id, type: "error", message: msg });
    } finally {
      setPayLoading(null);
    }
  };

  // Razorpay auto-verify flow (migration 23). Creates a server-side
  // order, opens the checkout widget, and polls for payment_status
  // updates driven by the webhook — no manual UPI ref needed.
  const handleRazorpayPay = async (event) => {
    const regId = event.user_registration?.id;
    if (!regId) return;
    setPayLoading(event.id);
    try {
      const { data: order } = await eventsApi.createRazorpayOrder(event.id, regId);
      if (!order?.order_id || !order?.key_id) {
        throw new Error(order?.error || "Razorpay order not created");
      }
      await openRazorpayCheckout({
        keyId:       order.key_id,
        orderId:     order.order_id,
        amountPaise: order.amount,
        eventTitle:  order.event_title || event.title,
        prefill:     { name: user?.name, email: user?.email },
      });
      // The webhook is the source of truth; the checkout modal
      // closing only tells us the user clicked "success" at
      // Razorpay's end. Poll a few times — most webhooks land in
      // under 3 seconds.
      setActionResult({
        eventId: event.id,
        type: "success",
        message: "Payment captured — verifying with our server…",
      });
      let attempts = 0;
      const poll = async () => {
        attempts++;
        await fetchEvents();
        if (attempts < 5) setTimeout(poll, 1500);
      };
      setTimeout(poll, 1500);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Payment failed";
      // Don't treat "user cancelled" as a red toast — it's just a
      // close. Razorpay's own modal already showed the relevant UI.
      if (/cancel/i.test(msg)) {
        setActionResult({ eventId: event.id, type: "warning", message: "Payment cancelled — retry when ready" });
      } else {
        setActionResult({ eventId: event.id, type: "error", message: msg });
      }
    } finally {
      setPayLoading(null);
    }
  };

  const handleCheckin = async (event) => {
    if (!user) { navigate("/login"); return; }
    setActionLoading(event.id);
    try {
      const { data } = await eventsApi.checkin(event.id, { code: checkinCode || undefined });
      setActionResult({
        eventId: event.id,
        type: "success",
        message: data.xp_awarded > 0
          ? `Checked in! +${data.xp_awarded} XP earned`
          : "Checked in successfully!",
      });
      setShowCheckin(null);
      setCheckinCode("");
      fetchEvents();
    } catch (err) {
      setActionResult({ eventId: event.id, type: "error", message: err.response?.data?.error || "Check-in failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // Scroll to timeline
  const timelineRef = useRef(null);
  const scrollToTimeline = () => {
    timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Compute hero stats
  const heroStats = {
    total: eventsList.length,
    upcoming: eventsList.filter(e => e.status === "upcoming" || e.status === "registering").length,
    live: eventsList.filter(e => e.status === "active").length,
  };

  // ── Render ─────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="jungle" intensity={0.15} />
        <div className="relative z-10 flex min-h-[60vh] items-center justify-center">
          <Loader variant="orbit" size="lg" label="Loading events..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="jungle" intensity={0.15} />
        <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-4xl">⚠️</p>
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchEvents}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <MonumentBackground monument="jungle" intensity={0.15} />

      {/* Ambient math glyphs — same visual signature as auth + dashboard
          so every page in the app reads as part of the same family.
          Jungle-themed (success/green tint) to match the page's
          MonumentBackground colour cue. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 select-none">
        <span className="math-text absolute left-[3%] top-[14%] text-[9rem] text-success/[0.045]">∮</span>
        <span className="math-text absolute right-[5%] top-[8%] text-[8rem] text-white/[0.03]">∇</span>
        <span className="math-text absolute left-[15%] top-[60%] text-[6rem] text-white/[0.03]">τ</span>
        <span className="math-text absolute right-[8%] bottom-[20%] text-[7rem] text-primary/[0.04]">ℵ</span>
        <span className="math-text absolute left-[48%] top-[40%] text-[5rem] text-white/[0.025]">η</span>
      </div>

      {/* Outer wraps the whole page; inner sections set their own
          max-width. The padding here gives a consistent gutter so
          content never touches the screen edge on small viewports. */}
      <div className="relative z-10 pb-16 px-4 sm:px-6 lg:px-10">
        {/* Cinematic Entry Hero */}
        <EventHero stats={heroStats} onExplore={scrollToTimeline} />

        {/* Timeline section (scroll target) */}
        <div ref={timelineRef} className="space-y-10 pt-10">

        {/* Category Explorer — interactive environment cards */}
        <EventExplorer
          activeFilter={typeFilter}
          onFilterChange={setTypeFilter}
          eventCounts={typeCounts}
          onExplore={scrollToTimeline}
        />

        {/* Status filter row (compact, below explorer). On mobile the
            "Status:" label is hidden — pills are self-explanatory and
            hiding it lets all 5 fit on one row at 375px without an
            ugly wrap. Label returns on sm+ where there's space. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-text-dim sm:inline">Status:</span>
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Live" },
            { key: "registering", label: "Open" },
            { key: "upcoming", label: "Upcoming" },
            { key: "completed", label: "Past" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key === filter ? "all" : f.key)}
              className={`min-h-[36px] rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition sm:min-h-0 sm:px-2.5 sm:py-1 sm:text-[9px] ${
                filter === f.key
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-line/10 bg-white/[0.02] text-text-dim hover:text-text-muted hover:border-line/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Recommended for You */}
        {recs.length > 0 && filter === "all" && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">Recommended for You</p>
              {recPrefs?.top_type && (
                <span className="rounded-full border border-line/15 bg-white/5 px-2 py-0.5 font-mono text-[8px] uppercase text-text-dim">
                  Based on your {recPrefs.top_type} interest
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recs.slice(0, 3).map(ev => (
                <Card key={ev.id} variant="glass" interactive spotlight className="cursor-pointer" onClick={() => {
                  const el = document.getElementById(`event-${ev.id}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}>
                  <EventTypeBadge type={ev.event_type} />
                  <h4 className="mt-2 font-display text-sm font-bold text-white truncate">{ev.title}</h4>
                  <p className="mt-1 font-mono text-[10px] text-text-dim">
                    {ev.starts_at || ev.date ? new Date(ev.starts_at || ev.date).toLocaleDateString() : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    {ev.xp_reward > 0 && <span className="math-text text-[10px] text-primary">+{ev.xp_reward} XP</span>}
                    <span className="font-mono text-[9px] text-text-dim">{ev.registration_count || 0} registered</span>
                  </div>
                </Card>
              ))}
            </div>
          </motion.section>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-20 text-center">
            <svg
              aria-hidden="true"
              className="mx-auto h-14 w-14 text-text-dim/50"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.4}
              strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 11h18" />
            </svg>
            <p className="mt-4 text-lg text-text-muted">No events found</p>
            <p className="mt-2 text-sm text-text-dim">
              {filter !== "all" ? "Try a different filter." : "Check back later for new events!"}
            </p>
          </motion.div>
        )}

        {/* Event Timeline */}
        <div className="relative mx-auto max-w-6xl">
          {/* Timeline vertical line */}
          <div className="absolute left-6 top-0 hidden h-full md:block event-timeline-line" />

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((event, i) => {
                const status = event.status || "upcoming";
                const isRegistered = event.user_registration && event.user_registration.status !== "cancelled";
                const isAttended = event.user_registration?.status === "attended";
                const isWaitlisted = event.user_registration?.status === "waitlisted";
                const isActing = actionLoading === event.id;
                const result = actionResult?.eventId === event.id ? actionResult : null;

                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    id={`event-${event.id}`}
                    className="relative md:pl-16"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-4 top-8 hidden md:block">
                      <span className={`event-timeline-dot`}
                        data-active={status === "active" || status === "registering"} />
                    </div>

                    <Card variant={status === "active" ? "glow" : "glass"} spotlight>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        {/* Left: Event info */}
                        <div className="flex-1 min-w-0">
                          {/* Badges row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <EventStatusBadge status={status} />
                            <EventTypeBadge type={event.event_type} />
                            {event.xp_reward > 0 && (
                              <span className="math-text rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-bold text-primary">
                                +{event.xp_reward} XP
                              </span>
                            )}
                            {isRegistered && !isAttended && (
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                                isWaitlisted
                                  ? "border-warning/25 bg-warning/8 text-warning"
                                  : "border-success/25 bg-success/8 text-success"
                              }`}>
                                {isWaitlisted ? "Waitlisted" : "Registered ✓"}
                              </span>
                            )}
                            {isAttended && (
                              <span className="rounded-full border border-success/25 bg-success/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-success">
                                Attended ✓
                              </span>
                            )}
                            {/* Paid-event badges (migration 19) */}
                            {event.is_paid && event.price_paise > 0 && (
                              <span className="rounded-full border border-secondary/25 bg-secondary/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-secondary">
                                ₹{(event.price_paise / 100).toFixed(0)}
                              </span>
                            )}
                            {event.is_paid && isRegistered && event.user_registration?.payment_status === "paid" && (
                              <span className="rounded-full border border-success/25 bg-success/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-success">
                                Paid ✓
                              </span>
                            )}
                            {event.is_paid && isRegistered && event.user_registration?.payment_status === "submitted" && (
                              <span className="rounded-full border border-secondary/25 bg-secondary/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-secondary">
                                Awaiting verification
                              </span>
                            )}
                            {event.is_paid && isRegistered && event.user_registration?.payment_status === "rejected" && (
                              <span className="rounded-full border border-danger/25 bg-danger/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-danger">
                                Payment rejected
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="mt-3 font-display text-2xl font-bold tracking-[-0.03em] text-white">
                            {event.title}
                          </h3>

                          {/* Meta row */}
                          <div className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-text-dim">
                            {(event.starts_at || event.date) && (
                              <span>📅 {formatDate(event.starts_at || event.date)}</span>
                            )}
                            {(event.starts_at || event.date) && (
                              <span>🕐 {formatTime(event.starts_at || event.date)}</span>
                            )}
                            {event.location && <span>📍 {event.location}</span>}
                            {event.organiser && <span>by {event.organiser}</span>}
                            {event.venue_type && event.venue_type !== "in-person" && (
                              <span className="text-secondary">{event.venue_type === "online" ? "🌐 Online" : "🔄 Hybrid"}</span>
                            )}
                          </div>

                          {/* Countdown for upcoming */}
                          {(status === "upcoming" || status === "registering") && (event.starts_at || event.date) && (
                            <p className="mt-1 math-text text-[11px] text-secondary">
                              Starts in {timeUntil(event.starts_at || event.date)}
                            </p>
                          )}

                          {/* Tags */}
                          {event.tags?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {event.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-primary/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary/70">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Description (truncated) */}
                          {event.description && (
                            <p className="mt-3 text-sm leading-7 text-text-muted line-clamp-3">
                              {event.description}
                            </p>
                          )}

                          {/* Capacity bar */}
                          {(event.capacity || event.registration_count > 0) && (
                            <div className="mt-3 max-w-xs">
                              <CapacityBar current={event.registration_count || 0} max={event.capacity} />
                            </div>
                          )}

                          {/* QR Code — shown when registered, not yet attended,
                             AND (free event OR payment verified). Paid events
                             previously showed the QR immediately on registration
                             which was misleading: the attendance controller
                             refuses to check in an unpaid registration, so
                             scanning would fail anyway. Gating here means the
                             QR only appears once the student is actually
                             cleared to walk through the door. */}
                          {(() => {
                            const reg = event.user_registration;
                            if (!isRegistered || isAttended || !reg?.qr_token) return null;
                            const paymentCleared =
                              !event.is_paid
                              || reg.payment_status === "paid"
                              || reg.payment_status === "not_required";
                            if (!paymentCleared) {
                              return (
                                <p className="mt-4 rounded-lg border border-warning/25 bg-warning/[0.06] px-3 py-2 text-xs text-warning">
                                  Your entry QR unlocks here as soon as your payment clears.
                                </p>
                              );
                            }
                            return (
                              <div className="mt-4">
                                <EventQrCode
                                  eventId={event.id}
                                  qrToken={reg.qr_token}
                                  eventTitle={event.title}
                                />
                              </div>
                            );
                          })()}

                          {/* Paid-event: payment panel (migration 19).
                              Only shown to registered students whose
                              payment isn't already verified. */}
                          {event.is_paid && isRegistered && event.user_registration?.payment_status !== "paid" && event.user_registration?.payment_status !== "not_required" && (
                            <div className="mt-4 rounded-xl border border-secondary/20 bg-secondary/[0.04] p-4">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                  <p className="font-mono text-[10px] uppercase tracking-wider text-secondary">Payment required</p>
                                  <p className="mt-1 math-text text-xl font-bold text-white">
                                    ₹{((event.price_paise || 0) / 100).toFixed(2)}
                                  </p>
                                </div>
                                {event.payment_qr_base64 && (
                                  <img
                                    src={event.payment_qr_base64}
                                    alt="Payment QR"
                                    loading="lazy"
                                    className="h-28 w-28 rounded-lg border border-line/15 bg-white p-1"
                                  />
                                )}
                              </div>
                              {event.payment_upi_id && (
                                <p className="mt-2 font-mono text-[11px] text-text-muted">
                                  UPI ID: <span className="select-all text-white">{event.payment_upi_id}</span>
                                </p>
                              )}
                              {event.payment_instructions && (
                                <p className="mt-2 text-[11px] leading-5 text-text-dim whitespace-pre-wrap">
                                  {event.payment_instructions}
                                </p>
                              )}

                              {/* Rejection reason — shown so the student knows why and how to retry. */}
                              {event.user_registration?.payment_status === "rejected" && event.user_registration?.rejection_reason && (
                                <p className="mt-2 rounded-lg border border-danger/25 bg-danger/[0.06] px-3 py-2 text-[11px] text-danger">
                                  Previous attempt rejected: {event.user_registration.rejection_reason}
                                </p>
                              )}

                              {/* Razorpay auto-verify button — primary payment path.
                                  Hidden once status='submitted' (manual flow in progress) or while polling. */}
                              {event.user_registration?.payment_status !== "submitted" && (
                                <div className="mt-3">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRazorpayPay(event)}
                                    loading={payLoading === event.id}
                                    className="w-full sm:w-auto"
                                  >
                                    {event.user_registration?.payment_status === "rejected" ? "Retry Payment" : `Pay ₹${((event.price_paise || 0) / 100).toFixed(0)} securely`}
                                  </Button>
                                  <p className="mt-1.5 font-mono text-[10px] text-text-dim">
                                    Opens Razorpay — cards, UPI, netbanking. Your registration flips to ✓ automatically once the payment clears (no admin verification needed).
                                  </p>
                                </div>
                              )}

                              {/* Manual UPI ref fallback — shown collapsed, expands on click.
                                  Keeps the old path available when Razorpay is down / not wired. */}
                              {event.user_registration?.payment_status !== "submitted" && (
                                <details className="mt-3">
                                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-text-dim hover:text-text-muted">
                                    Or pay manually via UPI + submit ref
                                  </summary>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="UPI Ref / Transaction ID"
                                      value={payRefInputs[event.id] || ""}
                                      onChange={(e) => setPayRefInputs((s) => ({ ...s, [event.id]: e.target.value }))}
                                      onKeyDown={(e) => e.key === "Enter" && handleSubmitPayment(event)}
                                      className="w-full min-w-0 flex-1 rounded-lg border border-line/15 bg-black/15 px-3 py-2 font-mono text-sm text-white outline-none focus:border-secondary/40 sm:w-auto sm:min-w-[180px]"
                                      maxLength={32}
                                    />
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleSubmitPayment(event)}
                                      loading={payLoading === event.id}
                                      disabled={!((payRefInputs[event.id] || "").trim())}
                                    >
                                      Submit ref
                                    </Button>
                                  </div>
                                </details>
                              )}
                              {event.user_registration?.payment_status === "submitted" && (
                                <p className="mt-3 font-mono text-[10px] text-text-dim">
                                  Ref submitted: <span className="text-text-muted">{event.user_registration.payment_ref}</span> — an admin will verify shortly.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Action result toast */}
                          <AnimatePresence>
                            {result && (
                              <motion.div
                                initial={{ opacity: 0, y: -8, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -8, height: 0 }}
                                className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                                  result.type === "success" ? "border-success/25 bg-success/8 text-success" :
                                  result.type === "warning" ? "border-warning/25 bg-warning/8 text-warning" :
                                  "border-danger/25 bg-danger/8 text-danger"
                                }`}
                              >
                                {result.message}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Check-in code input */}
                          <AnimatePresence>
                            {showCheckin === event.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 flex flex-wrap items-center gap-2"
                              >
                                <input
                                  type="text"
                                  placeholder="Enter check-in code"
                                  value={checkinCode}
                                  onChange={(e) => setCheckinCode(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && handleCheckin(event)}
                                  className="w-full min-w-0 rounded-lg border border-line/15 bg-black/15 px-3 py-2 font-mono text-sm text-white outline-none focus:border-primary/30 sm:w-40"
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleCheckin(event)} loading={isActing}>
                                  Confirm
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setShowCheckin(null); setCheckinCode(""); }}>
                                  Cancel
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Team registration form — shown when the
                             student clicks Register on a team event. */}
                          <AnimatePresence>
                            {showTeamForm === event.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 rounded-xl border border-primary/30 bg-primary/[0.05] p-4"
                              >
                                <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-primary">
                                  Team details
                                </p>
                                <div className="flex flex-wrap items-end gap-3">
                                  <div className="flex-1 min-w-[180px]">
                                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Team name</label>
                                    <input
                                      type="text"
                                      value={teamForm.name}
                                      onChange={(e) => setTeamForm((s) => ({ ...s, name: e.target.value }))}
                                      placeholder="e.g. Euler's Engineers"
                                      maxLength={80}
                                      autoFocus
                                      className="w-full rounded-lg border border-line/15 bg-black/15 px-3 py-2 text-sm text-white outline-none focus:border-primary/40"
                                    />
                                  </div>
                                  <div className="w-32">
                                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                                      Team size ({event.min_team_size || 1}–{event.max_team_size || 50})
                                    </label>
                                    <input
                                      type="number"
                                      min={event.min_team_size || 1}
                                      max={event.max_team_size || 50}
                                      value={teamForm.size}
                                      onChange={(e) => setTeamForm((s) => ({ ...s, size: e.target.value }))}
                                      className="w-full rounded-lg border border-line/15 bg-black/15 px-3 py-2 font-mono text-sm text-white outline-none focus:border-primary/40"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => submitTeamRegistration(event)} loading={isActing}>
                                      Confirm
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setShowTeamForm(null); setTeamForm({ name: "", size: "" }); }}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                                <p className="mt-3 font-mono text-[10px] text-text-dim">
                                  You're registering on behalf of your team. One QR + one check-in covers everyone.
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Right: Action buttons. Stretch to full
                           width on mobile so they sit below the info
                           block cleanly; right-align at tablet+ where
                           the card goes horizontal. */}
                        <div className="flex flex-col items-stretch gap-2 flex-shrink-0 sm:items-end">
                          {/* Register button */}
                          {(status === "upcoming" || status === "registering") && !isRegistered && !event.is_full && (
                            <Button size="sm" onClick={() => handleRegister(event)} loading={isActing}>
                              Register Now
                            </Button>
                          )}

                          {/* Full — join waitlist */}
                          {(status === "upcoming" || status === "registering") && !isRegistered && event.is_full && (
                            <Button size="sm" variant="secondary" onClick={() => handleRegister(event)} loading={isActing}>
                              Join Waitlist
                            </Button>
                          )}

                          {/* Cancel registration */}
                          {isRegistered && !isAttended && status !== "completed" && status !== "past" && (
                            <Button variant="ghost" size="sm" onClick={() => handleCancel(event)} loading={isActing}>
                              Cancel Registration
                            </Button>
                          )}

                          {/* Check-in (for active/registering events when registered) */}
                          {isRegistered && !isAttended && (status === "active" || status === "registering") && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                if (event.requires_checkin) {
                                  setShowCheckin(event.id);
                                } else {
                                  handleCheckin(event);
                                }
                              }}
                              loading={isActing && showCheckin !== event.id}
                            >
                              Check In
                            </Button>
                          )}

                          {/* External registration link (fallback) */}
                          {event.registration_form_url && !isRegistered && (
                            <a href={event.registration_form_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">External Form ↗</Button>
                            </a>
                          )}

                          {/* Online venue link */}
                          {event.venue_link && (status === "active" || isRegistered) && (
                            <a href={event.venue_link} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">Join Online ↗</Button>
                            </a>
                          )}

                          {/* View leaderboard for competitions */}
                          {(event.event_type === "competition" || event.event_type === "hackathon") && status === "completed" && (
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${event.id}/leaderboard`)}>
                              Leaderboard
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
