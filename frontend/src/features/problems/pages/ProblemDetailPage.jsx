/**
 * ProblemDetailPage — the "complete own space" for one problem.
 *
 * Routed at /problems/:slugOrId. Pulls the full record (description,
 * how_to_start, dataset_links, resource_links, tags, source, etc.)
 * and renders the four sections every problem ought to have:
 *
 *   1. Hero header — title + source pill + difficulty + tags
 *   2. The Problem — full description
 *   3. How to start — 2-3 paragraph getting-started guide
 *   4. Resources — official source, datasets (with format tag),
 *      references / tutorials / repos
 *
 * Markdown is rendered as plain text (with paragraph + bullet
 * breaks). The dataset rows show their declared format ("csv",
 * "images", "geotiff", "parquet") as a small badge so the student
 * knows what they're committing to download.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { problems } from "@/lib/api";
import Loader from "@/components/ui/Loader";
import EngagementPanel from "../components/EngagementPanel";
import AiCompanion from "../components/AiCompanion";
import BookmarkButton from "@/components/ui/BookmarkButton";
import { bookmarks as bookmarksApi } from "@/lib/api";

const SOURCE_COLOR = {
  SIH:        { bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.4)", text: "#fdba74" },
  GSoC:       { bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.4)", text: "#6ee7b7" },
  Kaggle:     { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.4)", text: "#93c5fd" },
  MLH:        { bg: "rgba(236, 72, 153, 0.12)", border: "rgba(236, 72, 153, 0.4)", text: "#f9a8d4" },
  Devfolio:   { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.4)", text: "#d8b4fe" },
  Unstop:     { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.4)", text: "#fcd34d" },
  OpenSource: { bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.4)", text: "#cbd5e1" },
};

const DIFFICULTY_COLOR = {
  beginner:     "#6ee7b7",
  intermediate: "#fcd34d",
  advanced:     "#fca5a5",
};

export default function ProblemDetailPage() {
  const { slugOrId } = useParams();
  const [state, setState] = useState({ problem: null, loading: true, error: null });
  // Initial bookmark state for the "Save" pill in the header. We
  // fetch this alongside the problem itself so the star isn't
  // empty-then-flips-true on first paint.
  const [savedInitial, setSavedInitial] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ problem: null, loading: true, error: null });
    setSavedInitial(false);
    problems.get(slugOrId, { signal: ctrl.signal })
      .then(({ data }) => {
        setState({ problem: data, loading: false, error: null });
        // Now that we have the canonical id, ask if the viewer
        // already saved it. Non-blocking — if it fails the star just
        // shows as un-saved and the user can re-toggle.
        bookmarksApi.state("problem", [data.id], { signal: ctrl.signal })
          .then(({ data: map }) => setSavedInitial(Boolean(map?.[data.id])))
          .catch(() => {});
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        setState({
          problem: null,
          loading: false,
          error:   err?.response?.status === 404 ? "not-found" : (err?.response?.data?.error || "Failed to load problem"),
        });
      });
    return () => ctrl.abort();
  }, [slugOrId]);

  if (state.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader variant="orbit" />
      </div>
    );
  }

  if (state.error === "not-found") {
    return (
      <div className="mx-auto w-full max-w-2xl py-20 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">404</p>
        <h1 className="font-display mt-2 text-2xl text-white">This problem doesn't exist (anymore).</h1>
        <p className="mt-2 text-sm text-text-muted">It may have been archived. Back to the catalogue:</p>
        <Link
          to="/problems"
          className="mt-6 inline-block rounded-lg border border-line/20 bg-white/[0.05] px-4 py-2 font-mono text-xs uppercase tracking-wider text-white hover:border-primary/40"
        >
          ← All problems
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

  const p      = state.problem;
  const colors = SOURCE_COLOR[p.source] || SOURCE_COLOR.OpenSource;

  return (
    <article className="mx-auto w-full max-w-4xl pb-20 pt-8">
      {/* Back link */}
      <Link
        to="/problems"
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim transition hover:text-white"
      >
        ← Catalogue
      </Link>

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
          >
            {p.source}{p.source_event ? ` · ${p.source_event}` : ""}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
            style={{ color: DIFFICULTY_COLOR[p.difficulty], border: `1px solid ${DIFFICULTY_COLOR[p.difficulty]}55` }}
          >
            {p.difficulty}
          </span>
          <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
            {p.domain}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl"
              style={{ textWrap: "balance" }}>
            {p.title}
          </h1>
          <div className="self-start sm:self-auto">
            <BookmarkButton type="problem" id={p.id} initial={savedInitial} withLabel />
          </div>
        </div>

        {p.organisation && (
          <p className="mt-3 text-sm text-text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider text-text-dim">Organisation · </span>
            {p.organisation}
          </p>
        )}
      </motion.header>

      {/* ── Description ── */}
      <Section title="The problem" delay={0.05}>
        <Prose text={p.description} />
      </Section>

      {/* ── How to start ── */}
      {p.how_to_start && (
        <Section title="How to start" delay={0.1} accent>
          <Prose text={p.how_to_start} />
        </Section>
      )}

      {/* ── AI companion — collapsible Socratic Q&A scoped to this problem ── */}
      <AiCompanion slugOrId={p.slug || p.id} />

      {/* ── Datasets ── */}
      {p.dataset_links?.length > 0 && (
        <Section title="Datasets" delay={0.15}>
          <ul className="space-y-2">
            {p.dataset_links.map((link, i) => (
              <LinkRow key={i} link={link} kindBadge={link.format} />
            ))}
          </ul>
        </Section>
      )}

      {/* ── Resources ── */}
      {p.resource_links?.length > 0 && (
        <Section title="Resources" delay={0.2}>
          <ul className="space-y-2">
            {p.resource_links.map((link, i) => (
              <LinkRow key={i} link={link} kindBadge={link.kind} />
            ))}
          </ul>
        </Section>
      )}

      {/* ── Official source ── */}
      {p.official_url && (
        <Section title="Official source" delay={0.25}>
          <a
            href={p.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-xs text-white transition hover:border-primary/60 hover:bg-primary/15"
          >
            Open original page ↗
          </a>
          <p className="mt-2 break-all font-mono text-[11px] text-text-dim">{p.official_url}</p>
        </Section>
      )}

      {/* ── Engagement (interest beacon + writeups) ── */}
      <EngagementPanel slugOrId={p.slug || p.id} />

      {/* ── Tags footer ── */}
      {p.tags?.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-1.5 border-t border-line/10 pt-6">
          {p.tags.map((t) => (
            <Link
              key={t}
              to={`/problems?tag=${encodeURIComponent(t)}`}
              className="rounded-full bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] text-text-muted transition hover:bg-white/[0.08] hover:text-white sm:px-2.5 sm:py-1"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Section({ title, accent = false, delay = 0, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="mt-8"
    >
      <h2 className={`mb-3 font-mono text-[11px] uppercase tracking-[0.25em] ${accent ? "text-primary" : "text-text-dim"}`}>
        {title}
      </h2>
      <div className={accent ? "rounded-2xl border border-primary/20 bg-primary/[0.04] p-5" : ""}>
        {children}
      </div>
    </motion.section>
  );
}

/**
 * Prose — render newline-separated text as <p> blocks. Splits on
 * blank lines for paragraph breaks. Doesn't run markdown — the
 * seed text is hand-written and reads cleanly as plain prose;
 * pulling in a markdown library for this would be overkill.
 */
function Prose({ text }) {
  if (!text) return null;
  const paragraphs = String(text).split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3 break-words text-sm leading-7 text-text-soft">
      {paragraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}

function LinkRow({ link, kindBadge }) {
  return (
    <li>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-lg border border-line/15 bg-white/[0.02] p-3 transition hover:border-primary/30 hover:bg-white/[0.04]"
      >
        <span className="mt-0.5 font-mono text-[10px] text-text-dim">↗</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white group-hover:text-primary">{link.label}</p>
          <p className="mt-0.5 break-all font-mono text-[10px] text-text-dim">{link.url}</p>
        </div>
        {kindBadge && (
          <span className="shrink-0 rounded-full border border-line/20 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
            {kindBadge}
          </span>
        )}
      </a>
    </li>
  );
}
