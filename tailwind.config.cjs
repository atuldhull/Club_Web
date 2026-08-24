/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/index.html",
    "./frontend/src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "rgb(var(--color-obsidian) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        glow: "rgb(var(--color-glow) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        "text-dim": "rgb(var(--color-text-dim) / <alpha-value>)",
      },
      fontFamily: {
        // Phase 16 — Satoshi (body) + Clash Display (headings), both
        // loaded via Fontshare CDN in frontend/index.html. Outfit / Syne
        // / system-ui kept as fallback chains so a slow CDN doesn't
        // blow up the typography on first paint.
        sans:    ["Satoshi", "Outfit", "system-ui", "sans-serif"],
        display: ["Clash Display", "Syne", "Space Grotesk", "sans-serif"],
        mono:    ["IBM Plex Mono", "JetBrains Mono", "monospace"],
      },
      spacing: {
        "space-2xs": "var(--space-2xs)",
        "space-xs": "var(--space-xs)",
        "space-sm": "var(--space-sm)",
        "space-md": "var(--space-md)",
        "space-lg": "var(--space-lg)",
        "space-xl": "var(--space-xl)",
        "space-2xl": "var(--space-2xl)",
        "space-3xl": "var(--space-3xl)",
      },
      boxShadow: {
        orbit: "var(--shadow-orbit)",
        panel: "var(--shadow-panel)",
        pulse: "var(--shadow-pulse)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      backgroundImage: {
        "mesh-radial": "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.18), transparent 32%), radial-gradient(circle at 80% 0%, rgba(124, 58, 237, 0.24), transparent 36%), radial-gradient(circle at 50% 100%, rgba(14, 165, 233, 0.16), transparent 30%)",
        "panel-grid": "linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-130%) skewX(-18deg)" },
          "100%": { transform: "translateX(240%) skewX(-18deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.55", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        // News-ticker scroll for the announcement bar: the track holds
        // two copies of the message, so -50% lands exactly on the start
        // of the second copy for a seamless loop.
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.8s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        "pulse-slow": "pulseSlow 4s ease-in-out infinite",
        marquee: "marquee var(--marquee-duration, 18s) linear infinite",
      },
    },
  },
  plugins: [],
};
