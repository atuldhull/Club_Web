/**
 * SubmitProblemPage — /problems/submit
 *
 * Two-stage flow:
 *   1. Paste a URL — server fetches the page, AI drafts the
 *      catalogue fields, returns a JSON.
 *   2. Review + edit the draft, then submit to the moderation queue.
 *
 * The student can also skip the URL step and fill the form in
 * manually. Either way, the submission lands on the admin queue at
 * /admin/moderation and the catalogue stays clean until approval.
 */

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { problemSubmissions } from "@/lib/api";

const SOURCES     = ["SIH", "GSoC", "Kaggle", "MLH", "Devfolio", "Unstop", "OpenSource"];
const DIFFS       = ["beginner", "intermediate", "advanced"];
const DOMAINS     = ["AI/ML", "Web", "Web3", "IoT", "Govt", "OpenSource", "Health", "FinTech", "Education", "Agriculture", "Robotics", "Gaming"];

function emptyDraft() {
  return {
    title:           "",
    description:     "",
    how_to_start:    "",
    domain:          "",
    difficulty:      "intermediate",
    organisation:    "",
    source:          "OpenSource",
    source_event:    "",
    official_url:    "",
    tags:            [],
    dataset_links:   [],
    resource_links:  [],
    source_url:      "",
    ai_drafted:      false,
  };
}

export default function SubmitProblemPage() {
  const navigate = useNavigate();
  const [url,    setUrl]    = useState("");
  const [draft,  setDraft]  = useState(emptyDraft());
  const [draftingFromUrl, setDraftingFromUrl] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info,  setInfo]  = useState(null);

  const onDraftFromUrl = useCallback(async (e) => {
    e?.preventDefault();
    const u = url.trim();
    if (!u) return;
    setDraftingFromUrl(true);
    setError(null);
    setInfo(null);
    try {
      const { data } = await problemSubmissions.draftFromUrl(u);
      setDraft({ ...emptyDraft(), ...data, ai_drafted: true });
      setInfo("Draft ready — review every field carefully before submitting. The AI is a starting point, not the source of truth.");
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't draft from that URL.");
    } finally {
      setDraftingFromUrl(false);
    }
  }, [url]);

  const onSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await problemSubmissions.create(draft);
      navigate("/problems/submit/thanks");
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't submit.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, draft, navigate]);

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 pt-8">
      <Link to="/problems" className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim transition hover:text-white">
        ← Back to problems
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">Contribute</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl"
            style={{ textWrap: "balance" }}>
          Submit a problem
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-text-soft">
          Paste the URL of a Kaggle competition, SIH problem page, GSoC project, or open-source issue.
          The assistant drafts the catalogue fields; you review and submit. An admin approves it into the public list.
        </p>
      </motion.header>

      {/* Stage 1 — URL drafter */}
      <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">Step 1 · Draft from URL</h2>
        <form onSubmit={onDraftFromUrl} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.kaggle.com/competitions/..."
            className="flex-1 rounded-lg border border-line/20 bg-bg/40 px-3 py-2 font-mono text-sm text-white placeholder:text-text-dim focus:border-primary/50 focus:outline-none"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!url.trim() || draftingFromUrl}
            className="rounded-lg border border-primary/40 bg-primary/15 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-white transition hover:bg-primary/20 disabled:opacity-50 sm:py-2"
          >
            {draftingFromUrl ? "Drafting…" : "Draft with AI"}
          </button>
        </form>
        <p className="mt-2 font-mono text-[10px] text-text-dim">
          Daily cap: 10 drafts per student. Or skip this step and fill the form in by hand.
        </p>
      </section>

      {/* Stage 2 — review/edit + submit */}
      <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-line/15 bg-white/[0.025] p-5 sm:p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-dim">Step 2 · Review &amp; submit</h2>

        {info && (
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning/[0.05] p-3 text-xs text-warning">{info}</div>
        )}

        <Field label="Title">
          <input
            value={draft.title}
            onChange={(e) => setField("title", e.target.value)}
            maxLength={200}
            required
            className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white"
          />
        </Field>

        <Field label="Description" hint="What the problem is and what success looks like. 200-600 words is the sweet spot.">
          <textarea
            value={draft.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={8} maxLength={8000} required
            className="w-full resize-y rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-text-soft"
          />
        </Field>

        <Field label="How to start" hint="2-3 paragraphs of practical first steps for someone new to this.">
          <textarea
            value={draft.how_to_start}
            onChange={(e) => setField("how_to_start", e.target.value)}
            rows={6} maxLength={4000}
            className="w-full resize-y rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-text-soft"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Source">
            <select
              value={draft.source}
              onChange={(e) => setField("source", e.target.value)}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white"
            >
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select
              value={draft.difficulty}
              onChange={(e) => setField("difficulty", e.target.value)}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white"
            >
              {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Domain">
            <input
              list="domains-suggest"
              value={draft.domain}
              onChange={(e) => setField("domain", e.target.value)}
              maxLength={40} required
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white"
            />
            <datalist id="domains-suggest">
              {DOMAINS.map((d) => <option key={d} value={d} />)}
            </datalist>
          </Field>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Organisation">
            <input
              value={draft.organisation || ""}
              onChange={(e) => setField("organisation", e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white"
            />
          </Field>
          <Field label="Source event" hint='e.g. "SIH 2024" / "GSoC 2024"'>
            <input
              value={draft.source_event || ""}
              onChange={(e) => setField("source_event", e.target.value)}
              maxLength={60}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white"
            />
          </Field>
        </div>

        <Field label="Official URL">
          <input
            type="url"
            value={draft.official_url || ""}
            onChange={(e) => setField("official_url", e.target.value)}
            maxLength={500}
            className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 font-mono text-xs text-text-soft"
          />
        </Field>

        <Field label="Tags" hint="Comma-separated. Keep them short and lowercase (e.g. python, computer-vision).">
          <input
            value={(draft.tags || []).join(", ")}
            onChange={(e) => setField("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            maxLength={400}
            className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 font-mono text-xs text-text-soft"
          />
        </Field>

        <LinkListEditor
          label="Dataset links"
          links={draft.dataset_links}
          kindKey="format"
          kindOptions={["csv", "images", "json", "parquet", "api", "geotiff"]}
          onChange={(arr) => setField("dataset_links", arr)}
        />
        <LinkListEditor
          label="Resource links"
          links={draft.resource_links}
          kindKey="kind"
          kindOptions={["docs", "tutorial", "repo", "paper", "video"]}
          onChange={(arr) => setField("resource_links", arr)}
        />

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
          <Link to="/problems" className="order-2 rounded-lg border border-line/20 bg-white/[0.04] px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-wider text-text-soft transition hover:text-white sm:order-1 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="order-1 rounded-lg border border-success/40 bg-success/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white transition hover:bg-success/20 disabled:opacity-50 sm:order-2 sm:py-2"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Field({ label, hint, children }) {
  return (
    <label className="mt-3 block">
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 font-mono text-[10px] text-text-dim">{hint}</p>}
    </label>
  );
}

function LinkListEditor({ label, links, kindKey, kindOptions, onChange }) {
  const add = () => onChange([...(links || []), { label: "", url: "" }]);
  const del = (i) => onChange(links.filter((_, idx) => idx !== i));
  const setAt = (i, patch) => onChange(links.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">{label}</span>
        <button
          type="button"
          onClick={add}
          className="-mx-2 -my-2 px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          + Add
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {(links || []).map((l, i) => (
          <div key={i} className="grid gap-1.5 sm:grid-cols-[1fr_1fr_110px_36px]">
            <input
              value={l.label || ""}
              onChange={(e) => setAt(i, { label: e.target.value })}
              placeholder="Label" maxLength={120}
              className="rounded-lg border border-line/20 bg-bg/40 px-3 py-2 font-mono text-xs text-text-soft"
            />
            <input
              value={l.url || ""}
              onChange={(e) => setAt(i, { url: e.target.value })}
              placeholder="URL" maxLength={500}
              className="rounded-lg border border-line/20 bg-bg/40 px-3 py-2 font-mono text-xs text-text-soft"
            />
            <input
              list={`${kindKey}-options-${i}`}
              value={l[kindKey] || ""}
              onChange={(e) => setAt(i, { [kindKey]: e.target.value })}
              placeholder={kindKey} maxLength={40}
              className="rounded-lg border border-line/20 bg-bg/40 px-3 py-2 font-mono text-xs text-text-soft"
            />
            <datalist id={`${kindKey}-options-${i}`}>
              {kindOptions.map((k) => <option key={k} value={k} />)}
            </datalist>
            <button
              type="button"
              onClick={() => del(i)}
              className="flex h-10 items-center justify-center rounded-lg border border-danger/30 bg-danger/8 text-lg text-danger transition hover:bg-danger/12 sm:h-auto sm:text-base"
              aria-label="Remove link"
            >
              <span className="sm:hidden">Remove link</span>
              <span className="hidden sm:inline">×</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
