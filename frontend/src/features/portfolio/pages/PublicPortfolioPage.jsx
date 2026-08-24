/**
 * PublicPortfolioPage — /u/:handle
 *
 * Auth-FREE shareable portfolio. Pulls a single aggregated payload
 * (/api/portfolio/:handle) and renders the student's writeups,
 * projects, achievements, certificates, and completed roadmaps in a
 * single-column layout designed to look good when pasted on LinkedIn
 * or in a résumé bullet.
 *
 * If the handle is unknown OR the owner hasn't opted in, the API
 * returns 404 — we render a generic "not available" page so we don't
 * leak which handles exist privately.
 *
 * No org context, no friends list, no clickstream. Strictly the
 * student's *artifacts*.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { portfolio } from "@/lib/api";
import Loader from "@/components/ui/Loader";

const RARITY_COLOR = {
  common:    "rgba(148, 163, 184, 0.4)",
  uncommon:  "rgba(110, 231, 183, 0.4)",
  rare:      "rgba(147, 197, 253, 0.45)",
  epic:      "rgba(216, 180, 254, 0.45)",
  legendary: "rgba(252, 211, 77, 0.5)",
};

export default function PublicPortfolioPage() {
  const { handle } = useParams();
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ data: null, loading: true, error: null });
    portfolio.public(handle, { signal: ctrl.signal })
      .then(({ data }) => setState({ data, loading: false, error: null }))
      .catch((err) => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        setState({
          data: null, loading: false,
          error: err?.response?.status === 404 ? "not-found" : (err?.response?.data?.error || "Couldn't load portfolio"),
        });
      });
    return () => ctrl.abort();
  }, [handle]);

  if (state.loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader variant="orbit" /></div>;
  }

  if (state.error === "not-found") {
    return (
      <div className="mx-auto w-full max-w-2xl py-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">404</p>
        <h1 className="font-display mt-2 text-2xl text-white">Portfolio not available.</h1>
        <p className="mt-3 text-sm text-text-soft">
          The owner of <span className="font-mono text-text-muted">@{handle}</span> hasn't made their portfolio public,
          or this handle doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg border border-line/20 bg-white/[0.05] px-4 py-2 font-mono text-xs uppercase tracking-wider text-white hover:border-primary/40"
        >
          ← Math Collective
        </Link>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mx-auto w-full max-w-2xl py-20">
        <div className="rounded-2xl border border-danger/30 bg-danger/8 p-6 text-sm text-danger">
          {state.error}
        </div>
      </div>
    );
  }

  const d = state.data;

  return (
    <article className="mx-auto w-full max-w-3xl pb-24 pt-12">
      {/* ── Header card ── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl border border-line/15 bg-gradient-to-br from-white/[0.04] to-primary/[0.04] p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl shadow-lg"
            style={{ background: d.avatar?.color || "linear-gradient(135deg,#7c3aed,#3b82f6)" }}
          >
            {d.avatar?.emoji || "🧠"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl"
                style={{ textWrap: "balance" }}>
              {d.name}
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">
              @{d.handle} · {d.title}
            </p>
            {d.headline && (
              <p className="mt-3 text-sm leading-7 text-text-soft" style={{ textWrap: "balance" }}>
                {d.headline}
              </p>
            )}

            {/* Socials */}
            {d.socials && Object.keys(d.socials).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(d.socials).map(([k, v]) => (
                  <a
                    key={k}
                    href={absoluteUrl(v)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-line/20 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-soft transition hover:border-primary/40 hover:text-white sm:py-1"
                  >
                    {k}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stat row */}
        <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-line/10 bg-bg/40 p-4">
          <Stat label="XP"             value={d.stats?.xp || 0} />
          <Stat label="Streak"         value={d.stats?.streak_days || 0} suffix="d" />
          <Stat label="Joined"         value={d.stats?.joined ? new Date(d.stats.joined).getFullYear() : "—"} mono />
        </div>

        {d.bio && (
          <p className="mt-5 text-sm leading-7 text-text-soft">{d.bio}</p>
        )}
      </motion.header>

      {/* ── Writeups ── */}
      {d.writeups?.length > 0 && (
        <Section title="Writeups">
          <div className="space-y-3">
            {d.writeups.map((w) => (
              <article key={w.id} className="rounded-xl border border-line/15 bg-white/[0.02] p-4">
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{w.title}</p>
                  <span className="font-mono text-[10px] text-text-dim">▲ {w.vote_count} · {new Date(w.created_at).toLocaleDateString()}</span>
                </header>
                {w.problem && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                    {w.problem.source} · {w.problem.title}
                  </p>
                )}
                <p className="mt-2 text-sm leading-6 text-text-soft line-clamp-4">{w.body}</p>
                {w.repo_url && (
                  <a
                    href={w.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 break-all font-mono text-[11px] text-primary hover:underline"
                  >
                    ↗ {w.repo_url.replace(/^https?:\/\//, "").slice(0, 60)}
                  </a>
                )}
              </article>
            ))}
          </div>
        </Section>
      )}

      {/* ── Projects ── */}
      {d.projects?.length > 0 && (
        <Section title="Projects">
          <div className="grid gap-3 sm:grid-cols-2">
            {d.projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-line/15 bg-white/[0.025] p-4">
                <p className="text-sm font-semibold text-white">{p.title}</p>
                {p.category && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-text-dim">{p.category}</p>
                )}
                <p className="mt-2 text-xs leading-5 text-text-soft line-clamp-3">{p.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px]">
                  {p.github_url && (
                    <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">↗ GitHub</a>
                  )}
                  {p.demo_url && (
                    <a href={p.demo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">↗ Demo</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Roadmaps completed ── */}
      {d.roadmaps_completed?.length > 0 && (
        <Section title="Roadmaps completed">
          <div className="flex flex-wrap gap-2">
            {d.roadmaps_completed.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/[0.08] px-3 py-1 text-sm text-success"
                title={r.title}
              >
                <span aria-hidden="true">{r.cover_emoji || "✓"}</span>
                {r.title}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Achievements ── */}
      {d.achievements?.length > 0 && (
        <Section title="Achievements">
          <div className="grid gap-2 sm:grid-cols-2">
            {d.achievements.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl border bg-white/[0.025] p-3"
                style={{ borderColor: RARITY_COLOR[a.rarity] || RARITY_COLOR.common }}
              >
                <span className="text-2xl leading-none" aria-hidden="true">{a.icon || "🏅"}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="mt-0.5 text-xs text-text-soft">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Certificates ── */}
      {d.certificates?.length > 0 && (
        <Section title="Certificates">
          <ul className="space-y-2">
            {d.certificates.map((c) => (
              <li key={c.id} className="rounded-xl border border-line/15 bg-white/[0.02] p-3">
                <p className="text-sm text-white">{c.event_name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-text-dim">
                  {new Date(c.issued_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Empty-but-public state */}
      {d.writeups?.length === 0 &&
       d.projects?.length === 0 &&
       d.achievements?.length === 0 &&
       d.certificates?.length === 0 &&
       d.roadmaps_completed?.length === 0 && (
        <p className="mt-12 rounded-2xl border border-dashed border-line/15 bg-white/[0.02] p-8 text-center text-sm text-text-dim">
          @{d.handle} is just getting started. Check back soon.
        </p>
      )}

      {/* Footer attribution */}
      <p className="mt-16 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-text-dim">
        portfolio · math collective
      </p>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Section({ title, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10"
    >
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-text-dim">{title}</h2>
      {children}
    </motion.section>
  );
}

function Stat({ label, value, suffix, mono }) {
  return (
    <div className="text-center">
      <p className={"font-semibold text-white " + (mono ? "font-mono text-lg" : "text-xl")}>
        {value}{suffix ? <span className="font-mono text-xs text-text-dim">{suffix}</span> : null}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-text-dim">{label}</p>
    </div>
  );
}

// Tolerate bare social usernames in the socials JSON ("github": "atul-dhull")
// — render them with a sensible base. Users can also paste full URLs;
// we pass those through unchanged.
function absoluteUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "#";
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s.replace(/^\/+/, "");
}
