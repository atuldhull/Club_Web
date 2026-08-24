import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { events as eventsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";

// Dismissal is remembered per-message: publishing a NEW notice re-shows
// the bar to people who dismissed the previous one.
const DISMISS_KEY = "mc-banner-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/**
 * Site-wide announcement bar pinned above the header on every MainLayout
 * page. Driven by four site_settings keys (admin → Settings):
 *   banner_enabled  "true" | "false"   — the on/off toggle
 *   site_notice     free text          — the message itself
 *   banner_audience "guests" | "all"   — "guests" targets logged-out
 *                    visitors (the join-us / registrations-open pitch);
 *                    "all" shows it to signed-in members too.
 *   banner_style    "ticker" | "static" — "ticker" scrolls the message
 *                    continuously like a news ticker; falls back to
 *                    static when the viewer prefers reduced motion.
 */
export default function AnnouncementBar() {
  const status = useAuthStore((s) => s.status);
  const reducedMotion = useReducedMotionPreference();
  const [settings, setSettings] = useState(null);
  const [dismissed, setDismissed] = useState(() => readDismissed());

  useEffect(() => {
    let cancelled = false;
    eventsApi
      .settings()
      .then((r) => {
        if (!cancelled) setSettings(r.data || {});
      })
      .catch(() => {
        // Public endpoint down → no banner; never block the page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const notice = (settings?.site_notice || "").trim();
  const enabled = settings?.banner_enabled === "true";
  const audience = settings?.banner_audience === "all" ? "all" : "guests";
  const ticker = settings?.banner_style === "ticker" && !reducedMotion;
  // Slow the scroll down for longer messages so reading speed stays constant.
  const tickerDuration = `${Math.max(14, Math.round(notice.length / 3))}s`;
  // "guests" waits for the auth check to land as guest so signed-in
  // members never get a flash of the join-us pitch while /auth/me is
  // still in flight.
  const audienceOk = audience === "all" || status === "guest";
  const showJoin = status === "guest" && settings?.registrations_open === "true";
  const visible = enabled && notice.length > 0 && audienceOk && dismissed !== notice;

  const dismiss = () => {
    setDismissed(notice);
    try {
      localStorage.setItem(DISMISS_KEY, notice);
    } catch {
      // Storage unavailable (private mode) — dismissal lasts this visit only.
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-50 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 border-b border-primary/25 bg-gradient-to-r from-primary/15 via-secondary/10 to-primary/15 px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-4">
            <svg
              className="hidden h-4 w-4 shrink-0 text-primary sm:block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
            </svg>
            {ticker ? (
              <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                <div
                  className="flex w-max animate-marquee items-center hover:[animation-play-state:paused]"
                  style={{ "--marquee-duration": tickerDuration }}
                >
                  {/* Two copies make the loop seamless — the animation ends
                      at -50%, exactly where the second copy begins. */}
                  {[false, true].map((isClone) => (
                    <span
                      key={isClone ? "clone" : "main"}
                      aria-hidden={isClone || undefined}
                      className="flex items-center gap-2 whitespace-nowrap pr-24 text-[13px] leading-snug text-text-primary sm:text-sm"
                    >
                      {notice}
                      {showJoin && (
                        <Link
                          to="/register"
                          tabIndex={isClone ? -1 : 0}
                          className="inline-block whitespace-nowrap rounded-full border border-primary/40 bg-primary/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white transition hover:bg-primary/30"
                        >
                          Join now →
                        </Link>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="min-w-0 text-center text-[13px] leading-snug text-text-primary sm:text-sm [overflow-wrap:anywhere]">
                {notice}
                {showJoin && (
                  <Link
                    to="/register"
                    className="ml-2 inline-block whitespace-nowrap rounded-full border border-primary/40 bg-primary/20 px-2.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wider text-white transition hover:bg-primary/30"
                  >
                    Join now →
                  </Link>
                )}
              </p>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
