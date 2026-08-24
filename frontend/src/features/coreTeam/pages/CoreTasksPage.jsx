import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { core } from "@/lib/api";
import { useCoreStore } from "@/store/core-store";
import { ModalShell, Field, INPUT_CLS } from "@/features/coreTeam/components/FormBits";

const STATUS = {
  open:        { label: "Open",        cls: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" },
  todo:        { label: "To do",       cls: "border-line/30 bg-white/5 text-text-muted" },
  in_progress: { label: "In progress", cls: "border-warning/40 bg-warning/10 text-warning" },
  submitted:   { label: "Submitted",   cls: "border-secondary/40 bg-secondary/10 text-secondary" },
  confirmed:   { label: "Confirmed",   cls: "border-success/40 bg-success/10 text-success" },
};

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function CoreTasksPage() {
  const { member } = useCoreStore();
  const [tasks, setTasks] = useState(null);
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState("mine");
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [submitFor, setSubmitFor] = useState(null);

  const isLead = member?.tier === "council" || member?.tier === "head";

  const load = useCallback(() => {
    core.tasks()
      .then((r) => setTasks(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTasks([]));
  }, []);

  useEffect(() => {
    load();
    core.teams().then((r) => setTeams(r.data?.teams || [])).catch(() => {});
  }, [load]);

  const act = async (fn, id) => {
    setBusy(id);
    setErr(null);
    try {
      await fn();
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || "Action failed.");
    }
    setBusy(null);
  };

  if (!tasks) {
    return <div className="flex justify-center py-20"><Loader variant="orbit" size="lg" label="Loading tasks…" /></div>;
  }

  const FILTERS = [
    { key: "mine",    label: "My Tasks" },
    { key: "team",    label: "My Team" },
    { key: "open",    label: "Open" },
    ...(isLead ? [{ key: "confirm", label: "Awaiting Confirm" }] : []),
    { key: "all",     label: "All" },
  ];

  const visible = tasks.filter((t) => {
    if (filter === "mine")    return t.claimer?.id === member?.id;
    if (filter === "team")    return t.team_id && t.team_id === member?.team_id;
    if (filter === "open")    return t.is_open;
    if (filter === "confirm") return t.status === "submitted" &&
      (member?.tier === "council" || (member?.tier === "head" && t.team_id === member?.team_id));
    return true;
  });

  return (
    <div className="space-y-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                filter === f.key
                  ? "border-primary/40 bg-primary/12 text-white"
                  : "border-line/15 bg-white/[0.02] text-text-muted hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {isLead && (
          <Button size="sm" variant="primary" magnetic={false} onClick={() => setShowNew(true)}>
            + New Task
          </Button>
        )}
      </div>

      {err && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{err}</p>
      )}

      {/* list */}
      <div className="grid gap-3">
        {visible.length === 0 && (
          <Card variant="solid" spotlight={false} className="text-center">
            <p className="py-6 text-sm text-text-dim">No tasks here yet.</p>
          </Card>
        )}
        {visible.map((t) => {
          const st = STATUS[t.status] || STATUS.todo;
          const mine = t.claimer?.id === member?.id;
          const canClaim = !t.claimed_by && ["open", "todo"].includes(t.status) &&
            (!t.team_id || member?.tier === "council" || t.team_id === member?.team_id);
          const canSubmit = mine && t.status === "in_progress";
          const canConfirm = t.status === "submitted" &&
            (member?.tier === "council" || (member?.tier === "head" && t.team_id === member?.team_id));
          const canDelete = member?.tier === "council" ||
            (member?.tier === "head" && t.team_id === member?.team_id);
          const overdue = t.deadline && t.status !== "confirmed" && new Date(t.deadline) < new Date();

          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <Card variant="glass" spotlight={false} noEntrance>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${st.cls}`}>
                        {st.label}
                      </span>
                      {t.is_open && (
                        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300">
                          Open · FCFS
                        </span>
                      )}
                      {t.core_teams && (
                        <span className="font-mono text-[10px] text-text-dim">{t.core_teams.name}</span>
                      )}
                      <span className="math-text text-xs font-bold text-primary">{t.points} pts</span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold text-white">{t.title}</h3>
                    {t.description && (
                      <p className="mt-1 break-words text-sm leading-6 text-text-muted">{t.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-text-dim">
                      {t.claimer && <span>Claimed by {t.claimer.name}</span>}
                      {t.deadline && (
                        <span className={overdue ? "text-danger" : ""}>
                          {overdue ? "Overdue · " : "Due "}{fmtDate(t.deadline)}
                        </span>
                      )}
                    </div>
                    {t.submission && (
                      <p className="mt-2 break-words rounded-lg border border-line/10 bg-black/20 px-3 py-2 text-xs text-text-muted">
                        <span className="text-text-dim">Submission: </span>{t.submission}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {canClaim && (
                      <Button size="sm" variant="primary" magnetic={false} loading={busy === t.id}
                        onClick={() => act(() => core.claimTask(t.id), t.id)}>
                        Claim
                      </Button>
                    )}
                    {canSubmit && (
                      <Button size="sm" variant="secondary" magnetic={false}
                        onClick={() => setSubmitFor(t)}>
                        Mark done
                      </Button>
                    )}
                    {canConfirm && (
                      <Button size="sm" variant="primary" magnetic={false} loading={busy === t.id}
                        onClick={() => act(() => core.confirmTask(t.id), t.id)}>
                        Confirm
                      </Button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => act(() => core.deleteTask(t.id), t.id)}
                        className="font-mono text-[10px] uppercase tracking-wider text-text-dim transition hover:text-danger"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* modals */}
      <AnimatePresence>
        {showNew && (
          <NewTaskModal
            member={member}
            teams={teams}
            onClose={() => setShowNew(false)}
            onCreated={() => { setShowNew(false); load(); }}
          />
        )}
        {submitFor && (
          <SubmitModal
            task={submitFor}
            onClose={() => setSubmitFor(null)}
            onDone={() => { setSubmitFor(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── New-task modal ──────────────────────────────────────── */
function NewTaskModal({ member, teams, onClose, onCreated }) {
  const isCouncil = member?.tier === "council";
  const [form, setForm] = useState({
    title: "", description: "", points: 10,
    isOpen: false, teamId: isCouncil ? "" : member?.team_id || "", deadline: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    if (!form.title.trim()) { setErr("Give the task a title."); return; }
    setBusy(true); setErr(null);
    try {
      await core.createTask({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        isOpen: isCouncil ? form.isOpen : false,
        teamId: form.isOpen ? null : (form.teamId || null),
        points: Number(form.points) || 10,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      });
      onCreated();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.response?.data?.issues?.[0]?.message || "Could not create task.");
      setBusy(false);
    }
  };

  return (
    <ModalShell title="New task" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={INPUT_CLS} placeholder="What needs doing?" />
        </Field>
        <Field label="Details (optional)">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3} className={INPUT_CLS} placeholder="Context, links, expectations…" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Points">
            <input type="number" min={1} max={500} value={form.points}
              onChange={(e) => setForm({ ...form, points: e.target.value })} className={INPUT_CLS} />
          </Field>
          <Field label="Deadline (optional)">
            <input type="date" value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={INPUT_CLS} />
          </Field>
        </div>
        {isCouncil && (
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" checked={form.isOpen}
              onChange={(e) => setForm({ ...form, isOpen: e.target.checked })} />
            Open task — anyone can claim it (first come, first serve)
          </label>
        )}
        {isCouncil && !form.isOpen && (
          <Field label="Assign to team">
            <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} className={INPUT_CLS}>
              <option value="">— pick a team —</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        )}
        {!isCouncil && (
          <p className="text-xs text-text-dim">This task goes to your team: {member?.core_teams?.name}.</p>
        )}
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" magnetic={false} loading={busy} onClick={save}>Create</Button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Submission-note modal ───────────────────────────────── */
function SubmitModal({ task, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    if (!note.trim()) { setErr("Add a quick note on what you did."); return; }
    setBusy(true); setErr(null);
    try {
      await core.submitTask(task.id, note.trim());
      onDone();
    } catch (e) {
      setErr(e?.response?.data?.error || "Could not submit.");
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Mark task done" onClose={onClose}>
      <p className="text-sm text-text-muted">{task.title}</p>
      <Field label="What did you do?">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className={INPUT_CLS}
          placeholder="A short note for the head who confirms this…" />
      </Field>
      {err && <p className="text-xs text-danger">{err}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" magnetic={false} loading={busy} onClick={save}>Submit</Button>
      </div>
    </ModalShell>
  );
}

