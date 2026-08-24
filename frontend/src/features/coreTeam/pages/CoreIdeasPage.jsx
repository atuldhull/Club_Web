import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { core } from "@/lib/api";
import { useCoreStore } from "@/store/core-store";
import { ModalShell, Field, INPUT_CLS } from "@/features/coreTeam/components/FormBits";

const FIELDS = ["Marketing", "Social Media", "Design", "Events", "Technical", "Maths", "General"];

export default function CoreIdeasPage() {
  const { member } = useCoreStore();
  const [ideas, setIdeas] = useState(null);
  const [threshold, setThreshold] = useState(17);
  const [filter, setFilter] = useState("All");
  const [showNew, setShowNew] = useState(false);
  const [voting, setVoting] = useState(null);

  const load = useCallback(() => {
    core.ideas()
      .then((r) => { setIdeas(r.data?.ideas || []); setThreshold(r.data?.threshold || 17); })
      .catch(() => setIdeas([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const vote = async (idea) => {
    setVoting(idea.id);
    try {
      const { data } = await core.voteIdea(idea.id);
      setIdeas((prev) => prev.map((i) =>
        i.id === idea.id
          ? { ...i, vote_count: data.voteCount, hasVoted: data.hasVoted, status: data.approved ? "approved" : i.status }
          : i,
      ));
    } catch { /* ignore */ }
    setVoting(null);
  };

  const remove = async (id) => {
    try { await core.deleteIdea(id); setIdeas((p) => p.filter((i) => i.id !== id)); } catch { /* ignore */ }
  };

  if (!ideas) {
    return <div className="flex justify-center py-20"><Loader variant="orbit" size="lg" label="Loading ideas…" /></div>;
  }

  const fields = ["All", ...new Set(ideas.map((i) => i.field))];
  const visible = filter === "All" ? ideas : ideas.filter((i) => i.field === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {fields.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                filter === f ? "border-primary/40 bg-primary/12 text-white"
                             : "border-line/15 bg-white/[0.02] text-text-muted hover:text-white"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <Button size="sm" variant="primary" magnetic={false} onClick={() => setShowNew(true)}>
          + Share an idea
        </Button>
      </div>

      {visible.length === 0 && (
        <Card variant="solid" spotlight={false} className="text-center">
          <p className="py-8 text-sm text-text-dim">No ideas here yet — be the first to pitch one.</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((idea) => {
          const pct = Math.min(100, Math.round((idea.vote_count / threshold) * 100));
          const approved = idea.status === "approved";
          const canDelete = member?.tier === "council" || idea.author_member_id === member?.id;
          return (
            <motion.div key={idea.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <Card variant={approved ? "glow" : "glass"} spotlight={false} noEntrance className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-secondary">
                    {idea.field}
                  </span>
                  {approved && (
                    <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-success">
                      ✓ Approved
                    </span>
                  )}
                </div>
                <h3 className="mt-3 break-words font-display text-lg font-bold text-white">{idea.title}</h3>
                <p className="mt-1 flex-1 break-words text-sm leading-6 text-text-muted">{idea.body}</p>

                <p className="mt-3 font-mono text-[10px] text-text-dim">by {idea.author_name || "A core member"}</p>

                {/* vote progress */}
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className={`h-full rounded-full ${approved ? "bg-success" : "bg-primary"}`}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-text-dim">
                    {idea.vote_count} / {threshold} votes to green-light
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-line/10 pt-3">
                  <Button
                    size="sm"
                    variant={idea.hasVoted ? "secondary" : "primary"}
                    magnetic={false}
                    loading={voting === idea.id}
                    onClick={() => vote(idea)}
                  >
                    {idea.hasVoted ? "▲ Voted" : "▲ Vote"} · {idea.vote_count}
                  </Button>
                  {canDelete && (
                    <button onClick={() => remove(idea.id)}
                      className="ml-auto font-mono text-[10px] uppercase tracking-wider text-text-dim transition hover:text-danger">
                      Delete
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showNew && <NewIdeaModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      </AnimatePresence>
    </div>
  );
}

function NewIdeaModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ field: "General", title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    if (form.title.trim().length < 3) { setErr("Give your idea a title."); return; }
    if (form.body.trim().length < 10) { setErr("Describe the idea a little more."); return; }
    setBusy(true); setErr(null);
    try {
      await core.createIdea({ field: form.field, title: form.title.trim(), body: form.body.trim() });
      onCreated();
    } catch (e) {
      setErr(e?.response?.data?.error || "Could not post idea.");
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Share an idea" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Field">
          <select value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className={INPUT_CLS}>
            {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={INPUT_CLS} placeholder="One line — what's the idea?" />
        </Field>
        <Field label="Describe it">
          <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            className={INPUT_CLS} placeholder="How would it work? Why is it good?" />
        </Field>
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" magnetic={false} loading={busy} onClick={save}>Post idea</Button>
        </div>
      </div>
    </ModalShell>
  );
}
