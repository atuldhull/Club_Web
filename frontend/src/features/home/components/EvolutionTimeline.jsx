/**
 * EvolutionTimeline — homepage section showing the lineage of math.
 *
 * Vertical timeline with 8 milestones from antiquity to the AI era.
 * Each milestone is a glassmorphism card sitting on alternating sides
 * of a central spine (desktop), stacked vertically on mobile. Cards
 * fade + slide in as they enter the viewport, on a subtle stagger.
 *
 * Math expressions in each entry are rendered through the existing
 * <MathRender /> component so $\\int$ etc. show as proper notation.
 */

import { motion } from "framer-motion";
import MathRender from "@/components/math/MathRender";

const MILESTONES = [
  {
    era:    "c. 500 BCE",
    name:   "Pythagoras",
    domain: "Geometry",
    note:   "Right-triangle relation — bridge between number and shape.",
    formula: "$a^2 + b^2 = c^2$",
    accent: "#d4a017",
  },
  {
    era:    "c. 300 BCE",
    name:   "Euclid",
    domain: "Axiomatic foundations",
    note:   "Elements — axiomatic geometry that ruled for two millennia.",
    formula: "$\\text{point, line, plane}$",
    accent: "#7c3aed",
  },
  {
    era:    "1687",
    name:   "Newton & Leibniz",
    domain: "Calculus",
    note:   "Independent invention of differential and integral calculus.",
    formula: "$\\dfrac{dy}{dx}, \\;\\; \\int f(x)\\,dx$",
    accent: "#23c1ff",
  },
  {
    era:    "1748",
    name:   "Leonhard Euler",
    domain: "Analysis",
    note:   "Most beautiful identity in mathematics.",
    formula: "$e^{i\\pi} + 1 = 0$",
    accent: "#00cfff",
  },
  {
    era:    "1801",
    name:   "Carl Friedrich Gauss",
    domain: "Number theory",
    note:   "Disquisitiones Arithmeticae — modular arithmetic + the prince of mathematics.",
    formula: "$\\sum_{k=1}^{n} k = \\dfrac{n(n+1)}{2}$",
    accent: "#a888ff",
  },
  {
    era:    "1859",
    name:   "Bernhard Riemann",
    domain: "Complex analysis",
    note:   "The Riemann hypothesis — still open, still the most important.",
    formula: "$\\zeta(s) = \\sum_{n=1}^{\\infty} n^{-s}$",
    accent: "#ff5599",
  },
  {
    era:    "1936",
    name:   "Alan Turing",
    domain: "Computation",
    note:   "Computable numbers — the seed of every computer that followed.",
    formula: "$\\text{Halting problem}$",
    accent: "#10b981",
  },
  {
    era:    "Today",
    name:   "Math + ML",
    domain: "21st-century synthesis",
    note:   "Optimisation, probability, geometry — the language of intelligence.",
    formula: "$\\theta \\leftarrow \\theta - \\eta\\,\\nabla L(\\theta)$",
    accent: "#7c3aed",
  },
];

export default function EvolutionTimeline() {
  return (
    <section className="relative z-[1] mx-auto max-w-5xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="text-center"
      >
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary/85">
          The Long Lineage
        </p>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
          Evolution of Mathematics
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-text-muted">
          Twenty-five centuries of inheritance — from one right triangle to the
          gradient-descent step that trains a transformer.
        </p>
      </motion.div>

      <div className="relative mt-16">
        {/* Central timeline spine — gradient line on desktop, hidden on
            mobile where cards stack flush. */}
        <div
          className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 md:block"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.4) 8%, rgba(35,193,255,0.4) 50%, rgba(124,58,237,0.4) 92%, transparent 100%)",
          }}
        />

        <ol className="space-y-10 md:space-y-16">
          {MILESTONES.map((m, i) => {
            const onLeft = i % 2 === 0;
            return (
              <motion.li
                key={m.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className={`relative md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6`}
              >
                {/* Spacer on the empty side so the card floats to the
                    correct half on desktop. */}
                <div className={onLeft ? "md:block" : "hidden md:block"} />
                {!onLeft && <div className="md:block" />}

                {/* Spine dot — only renders on desktop (the spine is
                    hidden on mobile). */}
                <div
                  aria-hidden="true"
                  className="hidden h-3 w-3 shrink-0 rounded-full md:block"
                  style={{
                    background: m.accent,
                    boxShadow: `0 0 16px ${m.accent}`,
                    gridColumn: "2",
                  }}
                />

                {/* The card */}
                <div className={onLeft ? "md:order-first" : "md:order-last"}>
                  <article
                    className="group relative overflow-hidden rounded-2xl border border-line/15 bg-surface/65 p-5 backdrop-blur-2xl transition-colors hover:border-line/35 sm:p-6"
                    style={{ borderTop: `2px solid ${m.accent}` }}
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.3em]"
                        style={{ color: m.accent }}
                      >
                        {m.era}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
                        {m.domain}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-bold tracking-[-0.02em] text-white">
                      {m.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-text-muted">{m.note}</p>
                    <div
                      className="mt-4 overflow-x-auto rounded-xl border border-white/5 bg-black/25 px-4 py-3 text-base leading-7 text-white/90"
                      style={{
                        // STIX Two Math / Cambria Math are intentional serif math
                        // fonts for the formula block — not in tailwind.config
                        // because they're only used here.
                        // eslint-disable-next-line no-restricted-syntax
                        fontFamily: "'STIX Two Math', 'Cambria Math', serif",
                      }}
                    >
                      <MathRender source={m.formula} />
                    </div>

                    {/* Cursor-tracked spotlight — same effect Card got
                        in Phase 21, written inline so this section can
                        keep its own custom border styling. */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background:
                          `radial-gradient(360px circle at var(--ti-x, -1000px) var(--ti-y, -1000px), ${m.accent}33, transparent 60%)`,
                      }}
                      onMouseMoveCapture={() => {}} /* satisfy linter — handler is on parent */
                    />
                  </article>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
