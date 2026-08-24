/**
 * RoadmapEditorPage — /roadmaps/:slug/edit
 *
 * The author's space. Top half is a meta form (title, summary,
 * description, difficulty, topic, hours, cover emoji). Bottom half
 * is the step list with add / edit / remove / reorder.
 *
 * Submission states surfaced clearly:
 *   draft     — fully editable, "Submit for review" button live
 *   pending   — read-mostly + "Withdraw" button
 *   approved  — visible to everyone; edits locked unless admin
 *   rejected  — editable + reject_reason callout + "Re-submit"
 *
 * On the wire: meta saves are debounced (don't blast on every
 * keystroke). Step add/edit/delete are immediate. Reorder uses two
 * arrow buttons per row — not a drag-handle because dnd-kit isn't
 * already a dep and the steps list is short (~6-15 entries).
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { roadmaps as roadmapsApi } from "@/lib/api";
import Loader from "@/components/ui/Loader";

const STATUS_CLASS = {
  draft:    { border: "border-line/25",    text: "text-text-soft",  label: "Draft" },
  pending:  { border: "border-warning/40", text: "text-warning",    label: "Pending review" },
  approved: { border: "border-success/40", text: "text-success",    label: "Approved" },
  rejected: { border: "border-danger/40",  text: "text-danger",     label: "Rejected" },
};

const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

export default function RoadmapEditorPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [roadmap,  setRoadmap]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Form state — kept local; we PATCH on Save click rather than
  // on every keystroke to avoid pinging the API mid-typing.
  const [form, setForm] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Working set of steps for reorder ergonomics (the rendered order
  // matches `roadmap.steps` after each mutation).
  const steps = roadmap?.steps || [];

  // Load.
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    roadmapsApi.get(slug, { signal: ctrl.signal })
      .then(({ data }) => {
        setRoadmap(data);
        setForm({
          title:       data.title || "",
          summary:     data.summary || "",
          description: data.description || "",
          difficulty:  data.difficulty || "intermediate",
          topic:       data.topic || "",
          est_hours:   data.est_hours ?? "",
          cover_emoji: data.cover_emoji || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        setError(err?.response?.status === 404 ? "not-found" : (err?.response?.data?.error || "Couldn't load roadmap"));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [slug]);

  const readOnly = useMemo(() => {
    if (!roadmap) return true;
    if (roadmap.is_owner) return roadmap.submission_status === "pending" || roadmap.submission_status === "approved";
    return true;        // moderators can edit too but we don't expose that UI here
  }, [roadmap]);

  // ── Save meta ──
  const onSaveMeta = useCallback(async () => {
    if (!roadmap || !form || saving) return;
    setSaving(true); setSaveMsg(null);
    try {
      const patch = {
        title:       form.title,
        summary:     form.summary,
        description: form.description,
        difficulty:  form.difficulty,
        topic:       form.topic,
        ...(form.est_hours === "" ? {} : { est_hours: Number(form.est_hours) }),
        cover_emoji: form.cover_emoji,
      };
      const { data } = await roadmapsApi.update(roadmap.id, patch);
      setRoadmap((r) => ({ ...r, ...data }));
      setSaveMsg("Saved ✓");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (err) {
      setSaveMsg(err?.response?.data?.error || "Couldn't save");
    } finally {
      setSaving(false);
    }
  }, [roadmap, form, saving]);

  // ── Step mutations ──
  const onAddStep = useCallback(async () => {
    if (!roadmap) return;
    const title = prompt("Step title?");
    if (!title || !title.trim()) return;
    try {
      const { data: step } = await roadmapsApi.addStep(roadmap.id, { title: title.trim() });
      setRoadmap((r) => ({ ...r, steps: [...(r.steps || []), { ...step, done: false }] }));
    } catch (err) {
      alert(err?.response?.data?.error || "Couldn't add step");
    }
  }, [roadmap]);

  const onUpdateStep = useCallback(async (stepId, patch) => {
    try {
      const { data: step } = await roadmapsApi.updateStep(stepId, patch);
      setRoadmap((r) => ({
        ...r,
        steps: r.steps.map((s) => s.id === stepId ? { ...s, ...step } : s),
      }));
    } catch (err) {
      alert(err?.response?.data?.error || "Couldn't save step");
    }
  }, []);

  const onDeleteStep = useCallback(async (stepId) => {
    if (!confirm("Delete this step?")) return;
    try {
      await roadmapsApi.removeStep(stepId);
      setRoadmap((r) => ({ ...r, steps: r.steps.filter((s) => s.id !== stepId) }));
    } catch (err) {
      alert(err?.response?.data?.error || "Couldn't delete step");
    }
  }, []);

  const onMove = useCallback(async (stepId, direction) => {
    if (!roadmap) return;
    const order = [...steps.map((s) => s.id)];
    const idx = order.indexOf(stepId);
    if (idx === -1) return;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= order.length) return;
    [order[idx], order[swap]] = [order[swap], order[idx]];
    // Optimistic reorder + revert on failure.
    setRoadmap((r) => ({
      ...r,
      steps: order.map((id) => r.steps.find((s) => s.id === id)),
    }));
    try {
      await roadmapsApi.reorderSteps(roadmap.id, order);
    } catch {
      // Refetch to recover canonical order.
      const { data } = await roadmapsApi.get(slug);
      setRoadmap(data);
    }
  }, [roadmap, steps, slug]);

  // ── Submission lifecycle ──
  const onSubmit = useCallback(async () => {
    if (!roadmap) return;
    try {
      await roadmapsApi.submit(roadmap.id);
      const { data } = await roadmapsApi.get(slug);
      setRoadmap(data);
    } catch (err) {
      alert(err?.response?.data?.error || "Couldn't submit");
    }
  }, [roadmap, slug]);

  const onWithdraw = useCallback(async () => {
    if (!roadmap) return;
    try {
      await roadmapsApi.withdraw(roadmap.id);
      const { data } = await roadmapsApi.get(slug);
      setRoadmap(data);
    } catch (err) {
      alert(err?.response?.data?.error || "Couldn't withdraw");
    }
  }, [roadmap, slug]);

  const onDeleteRoadmap = useCallback(async () => {
    if (!roadmap) return;
    if (!confirm("Delete this entire roadmap? This cannot be undone.")) return;
    try {
      await roadmapsApi.remove(roadmap.id);
      navigate("/roadmaps");
    } catch (err) {
      alert(err?.response?.data?.error || "Couldn't delete");
    }
  }, [roadmap, navigate]);

  // ── Render ──
  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader variant="orbit" /></div>;
  }

  if (error === "not-found") {
    return (
      <div className="mx-auto w-full max-w-2xl py-20 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">404</p>
        <h1 className="font-display mt-2 text-2xl text-white">Roadmap not found.</h1>
        <Link to="/roadmaps" className="mt-4 inline-block font-mono text-xs text-primary hover:underline">← All roadmaps</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl py-20">
        <div className="rounded-2xl border border-danger/30 bg-danger/8 p-6 text-sm text-danger">{error}</div>
      </div>
    );
  }

  if (!roadmap?.is_owner && !["admin", "teacher", "super_admin"].includes(roadmap?.viewer_role)) {
    // Backend doesn't ship viewer_role; we just gate on is_owner.
    // Moderators landing here will see a read-only view.
  }

  const status = STATUS_CLASS[roadmap.submission_status] || STATUS_CLASS.draft;

  return (
    <div className="mx-auto w-full max-w-4xl pb-24 pt-8">
      <Link
        to={`/roadmaps/${encodeURIComponent(roadmap.slug)}`}
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim transition hover:text-white"
      >
        ← Back to roadmap
      </Link>

      {/* Status banner */}
      <div className={"mb-6 rounded-2xl border bg-white/[0.025] p-4 " + status.border}>
        <p className={"font-mono text-[11px] uppercase tracking-wider " + status.text}>
          Status · {status.label}
        </p>
        {roadmap.submission_status === "rejected" && roadmap.reject_reason && (
          <p className="mt-2 text-sm text-danger">Reason: {roadmap.reject_reason}</p>
        )}
        {roadmap.submission_status === "pending" && (
          <p className="mt-2 text-sm text-text-soft">An admin will review this shortly. You can withdraw to keep editing.</p>
        )}
      </div>

      {/* Meta form */}
      <section className="rounded-2xl border border-line/15 bg-white/[0.025] p-5 sm:p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-dim">Meta</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-[80px_1fr]">
          <Field label="Emoji" inline>
            <input
              type="text" value={form.cover_emoji}
              onChange={(e) => setForm((f) => ({ ...f, cover_emoji: e.target.value }))}
              maxLength={4} disabled={readOnly}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-center text-2xl text-white disabled:opacity-60"
            />
          </Field>
          <Field label="Title">
            <input
              type="text" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={120} disabled={readOnly}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white disabled:opacity-60"
            />
          </Field>
        </div>

        <Field label="Summary" hint="One-line elevator pitch, max 240 chars">
          <input
            type="text" value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            maxLength={240} disabled={readOnly}
            className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white disabled:opacity-60"
          />
        </Field>

        <Field label="Description" hint="Longer intro (optional)">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4} maxLength={4000} disabled={readOnly}
            className="w-full resize-y rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-text-soft disabled:opacity-60"
          />
        </Field>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Difficulty">
            <select
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
              disabled={readOnly}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Topic">
            <input
              type="text" value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              maxLength={60} disabled={readOnly}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white disabled:opacity-60"
            />
          </Field>
          <Field label="Est. hours">
            <input
              type="number" min={0} max={1000} value={form.est_hours}
              onChange={(e) => setForm((f) => ({ ...f, est_hours: e.target.value }))}
              disabled={readOnly}
              className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white disabled:opacity-60"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {saveMsg && <p className={"mr-auto text-xs " + (saveMsg.includes("✓") ? "text-success" : "text-danger")}>{saveMsg}</p>}
          <button
            type="button"
            onClick={onSaveMeta}
            disabled={readOnly || saving}
            className="rounded-lg border border-primary/40 bg-primary/15 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white transition hover:bg-primary/20 disabled:opacity-50 sm:py-1.5"
          >
            {saving ? "Saving…" : "Save meta"}
          </button>
        </div>
      </section>

      {/* Steps */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-dim">Steps · {steps.length}</h2>
          <button
            type="button"
            onClick={onAddStep}
            disabled={readOnly}
            className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-white transition hover:bg-primary/20 disabled:opacity-50 sm:py-1.5"
          >
            + Add step
          </button>
        </div>

        <ol className="space-y-3">
          <AnimatePresence initial={false}>
            {steps.map((step, i) => (
              <StepEditor
                key={step.id}
                step={step}
                index={i}
                isFirst={i === 0}
                isLast={i === steps.length - 1}
                readOnly={readOnly}
                onUpdate={(patch) => onUpdateStep(step.id, patch)}
                onDelete={() => onDeleteStep(step.id)}
                onMoveUp={() => onMove(step.id, "up")}
                onMoveDown={() => onMove(step.id, "down")}
              />
            ))}
          </AnimatePresence>
        </ol>

        {steps.length === 0 && (
          <p className="rounded-xl border border-dashed border-line/15 bg-white/[0.02] p-6 text-center text-sm text-text-dim">
            No steps yet. Add the first one above.
          </p>
        )}
      </section>

      {/* Submission controls */}
      {roadmap.is_owner && (
        <section className="mt-10 rounded-2xl border border-line/15 bg-white/[0.025] p-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-dim">Submission</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {(roadmap.submission_status === "draft" || roadmap.submission_status === "rejected") && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={steps.length < 3}
                title={steps.length < 3 ? "Need at least 3 steps" : "Send to moderation"}
                className="rounded-lg border border-success/40 bg-success/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white transition hover:bg-success/20 disabled:opacity-50 sm:py-2"
              >
                {roadmap.submission_status === "rejected" ? "Re-submit for review" : "Submit for review"}
              </button>
            )}
            {roadmap.submission_status === "pending" && (
              <button
                type="button"
                onClick={onWithdraw}
                className="rounded-lg border border-line/25 bg-white/[0.04] px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-text-soft transition hover:border-warning/40 hover:text-warning sm:py-2"
              >
                Withdraw
              </button>
            )}
            <button
              type="button"
              onClick={onDeleteRoadmap}
              className="rounded-lg border border-danger/30 bg-danger/8 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-danger transition hover:bg-danger/12 sm:ml-auto sm:py-2"
            >
              Delete roadmap
            </button>
          </div>
          {steps.length < 3 && (roadmap.submission_status === "draft" || roadmap.submission_status === "rejected") && (
            <p className="mt-2 font-mono text-[10px] text-text-dim">Roadmaps need at least 3 steps before submission.</p>
          )}
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Field({ label, hint, inline = false, children }) {
  return (
    <label className={"block " + (inline ? "" : "mt-3")}>
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 font-mono text-[10px] text-text-dim">{hint}</p>}
    </label>
  );
}

function StepEditor({ step, index, isFirst, isLast, readOnly, onUpdate, onDelete, onMoveUp, onMoveDown }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState({
    title:          step.title || "",
    description:    step.description || "",
    resource_url:   step.resource_url || "",
    resource_label: step.resource_label || "",
    est_minutes:    step.est_minutes ?? "",
  });

  const onSave = useCallback(() => {
    onUpdate({
      title:          local.title,
      description:    local.description,
      resource_url:   local.resource_url || null,
      resource_label: local.resource_label || null,
      est_minutes:    local.est_minutes === "" ? null : Number(local.est_minutes),
    });
    setOpen(false);
  }, [local, onUpdate]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-line/15 bg-white/[0.025] p-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex items-start gap-3 sm:contents">
          <span className="mt-0.5 w-7 shrink-0 font-mono text-[11px] text-text-dim">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{step.title}</p>
            {step.description && <p className="mt-1 text-xs leading-5 text-text-soft line-clamp-2">{step.description}</p>}
            <div className="mt-1.5 flex flex-wrap gap-2 font-mono text-[10px] text-text-dim">
              {step.problem && <span className="text-primary">Problem · {step.problem.title?.slice(0, 30)}</span>}
              {step.resource_url && <span className="max-w-full truncate">↗ {step.resource_label || step.resource_url}</span>}
              {step.est_minutes ? <span>~{step.est_minutes}m</span> : null}
            </div>
          </div>
        </div>
        {/* Actions row — wraps to its own line on mobile so the step
            content has the full width to itself. */}
        <div className="flex shrink-0 items-center justify-end gap-1.5">
          <button type="button" onClick={onMoveUp}   disabled={readOnly || isFirst} aria-label="Move step up"   className="h-9 w-9 rounded-lg border border-line/20 text-text-soft transition hover:border-primary/40 disabled:opacity-30 sm:h-7 sm:w-7">↑</button>
          <button type="button" onClick={onMoveDown} disabled={readOnly || isLast}  aria-label="Move step down" className="h-9 w-9 rounded-lg border border-line/20 text-text-soft transition hover:border-primary/40 disabled:opacity-30 sm:h-7 sm:w-7">↓</button>
          <button type="button" onClick={() => setOpen((v) => !v)} disabled={readOnly} className="rounded-lg border border-line/20 bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-text-soft transition hover:border-primary/40 hover:text-white disabled:opacity-50 sm:px-2 sm:py-1">{open ? "Cancel" : "Edit"}</button>
          <button type="button" onClick={onDelete}   disabled={readOnly} aria-label="Delete step" className="rounded-lg border border-danger/30 bg-danger/8 px-3 py-2 font-mono text-sm text-danger transition hover:bg-danger/12 disabled:opacity-50 sm:px-2 sm:py-1 sm:text-[10px]">×</button>
        </div>
      </div>

      <AnimatePresence>
        {open && !readOnly && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              <input
                value={local.title}
                onChange={(e) => setLocal((l) => ({ ...l, title: e.target.value }))}
                placeholder="Step title"
                maxLength={200}
                className="w-full rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-white"
              />
              <textarea
                value={local.description}
                onChange={(e) => setLocal((l) => ({ ...l, description: e.target.value }))}
                rows={3} maxLength={2000} placeholder="Description (optional)"
                className="w-full resize-y rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-sm text-text-soft"
              />
              <div className="grid gap-2 sm:grid-cols-[1fr_140px_100px]">
                <input
                  value={local.resource_url}
                  onChange={(e) => setLocal((l) => ({ ...l, resource_url: e.target.value }))}
                  placeholder="Resource URL (optional)" maxLength={500}
                  className="rounded-lg border border-line/20 bg-bg/40 px-3 py-2 font-mono text-xs text-text-soft"
                />
                <input
                  value={local.resource_label}
                  onChange={(e) => setLocal((l) => ({ ...l, resource_label: e.target.value }))}
                  placeholder="Resource label" maxLength={120}
                  className="rounded-lg border border-line/20 bg-bg/40 px-3 py-2 font-mono text-xs text-text-soft"
                />
                <input
                  type="number" min={0} max={10000}
                  value={local.est_minutes}
                  onChange={(e) => setLocal((l) => ({ ...l, est_minutes: e.target.value }))}
                  placeholder="Mins"
                  className="rounded-lg border border-line/20 bg-bg/40 px-3 py-2 text-center font-mono text-xs text-white"
                />
              </div>
              <div className="flex items-center justify-end">
                <button type="button" onClick={onSave} className="rounded-lg border border-primary/40 bg-primary/15 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white transition hover:bg-primary/20 sm:py-1.5">
                  Save step
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
