import { motion } from "framer-motion";
import { Link, Outlet } from "react-router-dom";
import { useState } from "react";
import CosmicPortalBackground from "@/components/backgrounds/CosmicPortalBackground";
import BrandMark from "@/components/navigation/BrandMark";
import { usePublicStats, formatStat } from "@/hooks/usePublicStats";

const faqs = [
  { q: "What is Math Collective?", a: "A competitive mathematics platform where university students solve challenges, compete in live quizzes, and climb leaderboards." },
  { q: "Is it free to join?", a: "Yes! Students can register for free. Organisations choose a plan based on their needs." },
  { q: "How do live quizzes work?", a: "Teachers host real-time quizzes using Socket.IO. Students join with a code and answer questions under time pressure." },
  { q: "Can my university join?", a: "Absolutely. Contact us and we'll set up your organisation with a custom dashboard, branding, and student management." },
  { q: "What topics are covered?", a: "Calculus, Linear Algebra, Probability, Number Theory, Combinatorics, Topology, and more." },
  { q: "How is XP earned?", a: "Solve arena challenges correctly to earn XP. Harder problems give more XP. Weekly leaderboards track top performers." },
  { q: "Are certificates provided?", a: "Yes. Teachers can generate PDF certificates for events, competitions, and achievements." },
  { q: "Is there an AI assistant?", a: "Meet PANDA — our AI math tutor. It guides you with hints without giving direct answers. Available on every page." },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={false} className="border-b border-line/10 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
        <span className="text-sm text-white">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="shrink-0 text-text-dim">+</motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="pb-3 text-xs leading-5 text-text-muted">{a}</p>
      </motion.div>
    </motion.div>
  );
}

export default function AuthLayout() {
  // Real platform totals from /api/stats/public. Renders em-dashes
  // until the request resolves so we never flash a fake number.
  const stats = usePublicStats();

  return (
    <div className="relative min-h-screen overflow-hidden bg-obsidian text-text-primary">
      <CosmicPortalBackground />

      <div className="relative z-10 w-full px-5 py-6 sm:px-8 lg:px-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <div className="flex items-center gap-3">
            <Link to="/contact" className="hidden rounded-full border border-line/15 bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition hover:text-white sm:block">
              Contact Us
            </Link>
            <Link to="/" className="rounded-full border border-line/15 bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted backdrop-blur transition hover:text-white">
              Back home
            </Link>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-8 grid min-h-[calc(100vh-10rem)] gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left - Branding + FAQ */}
          <section className="flex flex-col justify-between">
            <div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }} className="mt-8 lg:mt-16">
                <p className="font-mono text-xs uppercase tracking-[0.4em] text-secondary">Math Collective</p>
                <h1 className="mt-5 max-w-lg font-display text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] text-white sm:text-6xl">
                  Enter the
                  <br />
                  <span className="bg-gradient-to-r from-primary via-secondary to-glow bg-clip-text text-transparent">Dimension</span>
                </h1>
                <p className="mt-6 max-w-md text-lg leading-8 text-text-muted">
                  Where mathematics meets competition. Sign in to access challenges, track your progress, and compete with the best minds.
                </p>
              </motion.div>

              {/* FAQ Section */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-dim">Frequently Asked Questions</p>
                <div className="mt-4 rounded-2xl border border-line/10 bg-white/[0.02] px-5 py-2 backdrop-blur">
                  {faqs.map((faq) => (
                    <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Stats — real platform totals from /api/stats/public.
                Each value renders as an em-dash until the request
                resolves so we never show a fake number. */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 hidden pb-4 lg:block">
              <div className="flex gap-8 font-mono text-[11px] uppercase tracking-wider text-text-dim">
                <div>
                  <p className="text-2xl font-bold text-white">{formatStat(stats.members)}</p>
                  <p className="mt-1">Members</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{formatStat(stats.challenges)}</p>
                  <p className="mt-1">Challenges</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{formatStat(stats.events)}</p>
                  <p className="mt-1">Events</p>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Right - Auth form */}
          <main className="order-first flex items-start justify-center pt-8 lg:order-none lg:items-center lg:pt-0">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
