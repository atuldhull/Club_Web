/**
 * EventExplorer — Interactive environment-based event category selector.
 *
 * Instead of boring filter buttons, users explore 5 themed environments
 * that represent event categories. Clicking an environment filters events.
 *
 * Category → Environment mapping:
 *   General     → Desert (warm gold, observatory)
 *   Hackathon   → Magma (volcanic orange, forge)
 *   Workshop    → Jungle (tropical green, ruins)
 *   Competition → Glacier (arctic cyan, citadel)
 *   Seminar     → Pyramid (mystical purple, theorem)
 *
 * Each card:
 *   - Themed gradient background with CSS particle animation
 *   - Math symbol watermark
 *   - Category name + event count
 *   - Hover: scale up, glow, reveal description
 *   - Click: sets filter, scroll to timeline
 *   - Active state: bright border, pulsing glow
 *
 * Performance: Pure CSS animations, no canvas, no per-frame JS.
 */

import { motion } from "framer-motion";

const CATEGORIES = [
  {
    key: "all",
    label: "All Events",
    symbol: "∞",
    gradient: "linear-gradient(135deg, #0a1628 0%, #1a0a30 50%, #0a1020 100%)",
    accent: "#B695F8",
    glow: "rgba(182,149,248,0.15)",
    description: "Browse everything",
    particles: "pyramidPulse",
  },
  {
    key: "competition",
    label: "Competitions",
    symbol: "ε",
    gradient: "linear-gradient(135deg, #001428 0%, #002244 50%, #001020 100%)",
    accent: "#00CFFF",
    glow: "rgba(0,207,255,0.15)",
    description: "Test your skills against others",
    particles: "auroraShift",
  },
  {
    key: "hackathon",
    label: "Hackathons",
    symbol: "∀",
    gradient: "linear-gradient(135deg, #1a0500 0%, #2a0800 50%, #100300 100%)",
    accent: "#FF6B35",
    glow: "rgba(255,107,53,0.15)",
    description: "Build, innovate, ship",
    particles: "desertFloat",
  },
  {
    key: "workshop",
    label: "Workshops",
    symbol: "∞",
    gradient: "linear-gradient(135deg, #001a08 0%, #002a0a 50%, #001005 100%)",
    accent: "#2ECC71",
    glow: "rgba(46,204,113,0.15)",
    description: "Learn hands-on skills",
    particles: "vineGrow",
  },
  {
    key: "seminar",
    label: "Seminars",
    symbol: "∫",
    gradient: "linear-gradient(135deg, #0a0030 0%, #1a0050 50%, #080020 100%)",
    accent: "#7B4FE0",
    glow: "rgba(123,79,224,0.15)",
    description: "Deep dives and talks",
    particles: "pyramidPulse",
  },
];

export default function EventExplorer({ activeFilter, onFilterChange, eventCounts = {}, onExplore }) {
  return (
    <section className="mx-auto max-w-5xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim mb-6">
          Choose your path
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORIES.map((cat, i) => {
            const isActive = activeFilter === cat.key;
            const count = cat.key === "all"
              ? Object.values(eventCounts).reduce((s, v) => s + v, 0)
              : (eventCounts[cat.key] || 0);

            return (
              <motion.button
                key={cat.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onFilterChange(cat.key);
                  onExplore?.();
                }}
                className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-300 ${
                  isActive
                    ? "border-white/20 shadow-lg"
                    : "border-white/[0.06] hover:border-white/15"
                }`}
                style={{
                  background: cat.gradient,
                  boxShadow: isActive ? `0 0 30px ${cat.glow}, 0 0 60px ${cat.glow}` : "none",
                }}
              >
                {/* Ambient glow orb */}
                <div
                  className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-[40px] transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: cat.accent,
                    opacity: isActive ? 0.2 : 0.05,
                  }}
                />

                {/* Math symbol watermark */}
                <span
                  className="absolute bottom-1 right-2 font-mono transition-all duration-500 group-hover:scale-110"
                  style={{
                    fontSize: "3rem",
                    color: cat.accent,
                    opacity: isActive ? 0.15 : 0.06,
                    lineHeight: 1,
                  }}
                >
                  {cat.symbol}
                </span>

                {/* Content */}
                <div className="relative z-10 p-4">
                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.span
                      layoutId="explorer-dot"
                      className="absolute top-3 right-3 h-2 w-2 rounded-full"
                      style={{ background: cat.accent, boxShadow: `0 0 8px ${cat.accent}` }}
                    />
                  )}

                  <p className="font-display text-sm font-bold text-white">{cat.label}</p>

                  {/* Description (revealed on hover/active) */}
                  <p className={`mt-1 text-[10px] leading-snug transition-all duration-300 ${
                    isActive ? "text-text-muted opacity-100" : "text-text-dim opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  }`}>
                    {cat.description}
                  </p>

                  {/* Count */}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="math-text text-lg font-bold"
                      style={{ color: cat.accent }}
                    >
                      {count}
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-text-dim">
                      events
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
