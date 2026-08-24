import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { core } from "@/lib/api";
import { useCoreStore } from "@/store/core-store";
import { useAuthStore } from "@/store/auth-store";
import { Field, INPUT_CLS } from "@/features/coreTeam/components/FormBits";

const STATUS_CLS = {
  open:     "border-warning/40 bg-warning/10 text-warning",
  reviewed: "border-secondary/40 bg-secondary/10 text-secondary",
  resolved: "border-success/40 bg-success/10 text-success",
};

export default function CoreFeedbackPage() {
  const { member } = useCoreStore();
  const siteRole = useAuthStore((s) => s.user?.role);
  const isLead = member?.tier === "council" || member?.tier === "head";
  const canReveal = siteRole === "admin" || siteRole === "super_admin";

  const [teams, setTeams] = useState([]);
  const [list, setList] = useState(isLead ? null : []);
  const [form, setForm] = useState({ scope: "club", teamId: "", kind: "suggestion", body: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);
  const [revealed, setRevealed] = useState({});

  const loadList = useCallback(() => {
    if (!isLead) return;
    core.feedback().then((r) => setList(r.data || [])).catch(() => setList([]));
  }, [isLead]);

  useEffect(() => {
    core.teams().then((r) => setTeams(r.data?.teams || [])).catch(() => {});
    loadList();
  }, [loadList]);

  const submit = async () => {
    if (form.body.trim().length < 5) { setErr("Add a little more detail."); return; }
    if (form.scope === "team" && !form.teamId) { setErr("Pick which team this is about."); return; }
    setBusy(true); setErr(null);
    try {
      await core.createFeedback({
        scope: form.scope,
        teamId: form.scope === "team" ? form.teamId : undefined,
        kind: form.kind,
        body: form.body.trim(),
      });
      setSent(true);
      setForm({ scope: "club", teamId: "", kind: "suggestion", body: "" });
      loadList();
      setTimeout(() => setSent(false), 6000);
    } catch (e) {
      setErr(e?.response?.data?.error || "Could not submit — try again.");
    }
    setBusy(false);
  };

  const setStatus = async (id, status) => {
    try {
      await core.setFeedbackStatus(id, status);
      loadList();
    } catch { /* surfaced on reload */ }
  };

  const reveal = async (id) => {
    try {
      const { data } = await core.revealAuthor(id);
      setRevealed((r) => ({ ...r, [id]: data }));
    } catch (e) {
      setRevealed((r) => ({ ...r, [id]: { error: e?.response?.data?.error || "Not permitted." } }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Submit form */}
      <Card variant="glow" spotlight={false}>
        <h2 className="font-display text-xl font-bold text-white">Anonymous feedback</h2>
        <p className="mt-1 text-sm text-text-muted">
          Suggestions and complaints are <span className="text-white">anonymous</span>. Club-wide goes to the
          council; team-specific also reaches that team&apos;s head. Identity is only ever revealed if the
          content is abusive.
        </p>

        {sent ? (
          <div className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-4 text-center text-sm text-success">
            ✓ Sent anonymously. Thank you.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="About">
                <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className={INPUT_CLS}>
                  <option value="club">The whole club</option>
                  <option value="team">A specific team</option>
                </select>
              </Field>
              <Field label="Type">
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={INPUT_CLS}>
                  <option value="suggestion">Suggestion</option>
                  <option value="complaint">Complaint</option>
                </select>
              </Field>
            </div>
            {form.scope === "team" && (
              <Field label="Which team">
                <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} className={INPUT_CLS}>
                  <option value="">— pick a team —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Your message">
              <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                className={INPUT_CLS} placeholder="Say what's on your mind…" />
            </Field>
            {err && <p className="text-xs text-danger">{err}</p>}
            <div className="flex justify-end">
              <Button size="sm" variant="primary" magnetic={false} loading={busy} onClick={submit}>
                Send anonymously
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Inbox — leads only */}
      {isLead && (
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            {member?.tier === "council" ? "All feedback" : "Feedback for your team"}
          </p>
          {list === null ? (
            <div className="flex justify-center py-12"><Loader variant="orbit" size="md" /></div>
          ) : list.length === 0 ? (
            <Card variant="solid" spotlight={false} className="text-center">
              <p className="py-6 text-sm text-text-dim">No feedback yet.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {list.map((f) => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                  <Card variant={f.is_flagged ? "solid" : "glass"} spotlight={false} noEntrance
                    className={f.is_flagged ? "border-danger/35" : ""}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                        f.kind === "complaint" ? "border-danger/40 bg-danger/10 text-danger" : "border-primary/40 bg-primary/10 text-primary"
                      }`}>
                        {f.kind}
                      </span>
                      <span className="font-mono text-[10px] text-text-dim">
                        {f.scope === "team" ? (f.core_teams?.name || "Team") : "Club-wide"}
                      </span>
                      {f.is_flagged && (
                        <span className="rounded-full border border-danger/40 bg-danger/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-danger">
                          ⚠ Flagged
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[10px] text-text-dim">
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-3 break-words text-sm leading-7 text-text-primary">{f.body}</p>
                    {f.flag_reason && <p className="mt-2 text-xs text-danger">{f.flag_reason}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/10 pt-3">
                      <select
                        value={f.status}
                        onChange={(e) => setStatus(f.id, e.target.value)}
                        className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${STATUS_CLS[f.status]}`}
                      >
                        <option value="open">Open</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      {f.is_flagged && canReveal && !revealed[f.id] && (
                        <button onClick={() => reveal(f.id)}
                          className="font-mono text-[10px] uppercase tracking-wider text-danger hover:underline">
                          Reveal author
                        </button>
                      )}
                      {revealed[f.id] && (
                        <span className="font-mono text-[10px] text-text-muted">
                          {revealed[f.id].error
                            ? revealed[f.id].error
                            : `Author: ${revealed[f.id].author_name || "Unknown"}`}
                        </span>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLead && (
        <Card variant="solid" spotlight={false} className="text-center">
          <p className="py-4 text-sm text-text-dim">
            Your submissions go straight to the council and team heads — you won&apos;t see them listed here.
          </p>
        </Card>
      )}
    </div>
  );
}
