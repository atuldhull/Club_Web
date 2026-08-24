import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { core } from "@/lib/api";
import { useCoreStore } from "@/store/core-store";
import { ModalShell, Field, INPUT_CLS } from "@/features/coreTeam/components/FormBits";

const RSVP_OPTS = [
  { key: "going", label: "Going",  cls: "border-success/40 bg-success/15 text-success" },
  { key: "maybe", label: "Maybe",  cls: "border-warning/40 bg-warning/15 text-warning" },
  { key: "no",    label: "Can't",  cls: "border-danger/40 bg-danger/15 text-danger" },
];

function fmtWhen(d) {
  return new Date(d).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function CoreMeetingsPage() {
  const { member } = useCoreStore();
  const isLead = member?.tier === "council" || member?.tier === "head";
  const [meetings, setMeetings] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    core.meetings()
      .then((r) => setMeetings(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMeetings([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rsvp = async (meeting, status) => {
    setBusy(meeting.id);
    try {
      await core.rsvpMeeting(meeting.id, status);
      setMeetings((prev) => prev.map((m) => {
        if (m.id !== meeting.id) return m;
        const counts = { ...m.counts };
        if (m.myRsvp) counts[m.myRsvp] = Math.max(0, counts[m.myRsvp] - 1);
        counts[status] = (counts[status] || 0) + 1;
        return { ...m, myRsvp: status, counts };
      }));
    } catch { /* ignore */ }
    setBusy(null);
  };

  const remove = async (id) => {
    try { await core.deleteMeeting(id); setMeetings((p) => p.filter((m) => m.id !== id)); } catch { /* ignore */ }
  };

  if (!meetings) {
    return <div className="flex justify-center py-20"><Loader variant="orbit" size="lg" label="Loading meetings…" /></div>;
  }

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at).getTime() >= now);
  const past     = meetings.filter((m) => new Date(m.scheduled_at).getTime() < now).reverse();

  const MeetingCard = ({ m, isPast }) => {
    const canDelete = member?.tier === "council" ||
      (member?.tier === "head" && m.team_id && m.team_id === member?.team_id);
    return (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card variant={isPast ? "solid" : "glass"} spotlight={false} noEntrance className={isPast ? "opacity-75" : ""}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
              {m.core_teams ? m.core_teams.name : "Whole club"}
            </span>
            <span className="font-mono text-[10px] text-text-dim">{fmtWhen(m.scheduled_at)}</span>
            {canDelete && (
              <button onClick={() => remove(m.id)}
                className="ml-auto font-mono text-[10px] uppercase tracking-wider text-text-dim transition hover:text-danger">
                Delete
              </button>
            )}
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold text-white">{m.title}</h3>
          {m.description && <p className="mt-1 break-words text-sm leading-6 text-text-muted">{m.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-text-dim">
            {m.location && <span>📍 {m.location}</span>}
            {m.host && <span>Hosted by {m.host.name}</span>}
            <span className="text-success">{m.counts?.going || 0} going</span>
            <span className="text-warning">{m.counts?.maybe || 0} maybe</span>
          </div>

          {!isPast && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line/10 pt-3">
              {RSVP_OPTS.map((o) => (
                <button
                  key={o.key}
                  disabled={busy === m.id}
                  onClick={() => rsvp(m, o.key)}
                  className={`rounded-full border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition disabled:opacity-50 sm:px-3.5 sm:py-1.5 ${
                    m.myRsvp === o.key ? o.cls : "border-line/15 bg-white/[0.02] text-text-muted hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {isLead && (
        <div className="flex justify-end">
          <Button size="sm" variant="primary" magnetic={false} onClick={() => setShowNew(true)}>
            + Schedule meeting
          </Button>
        </div>
      )}

      <div>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Upcoming</p>
        {upcoming.length === 0 ? (
          <Card variant="solid" spotlight={false} className="text-center">
            <p className="py-6 text-sm text-text-dim">No meetings scheduled yet.</p>
          </Card>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {upcoming.map((m) => <MeetingCard key={m.id} m={m} isPast={false} />)}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">Past</p>
          <div className="grid gap-3 xl:grid-cols-2">
            {past.map((m) => <MeetingCard key={m.id} m={m} isPast />)}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showNew && (
          <NewMeetingModal
            member={member}
            onClose={() => setShowNew(false)}
            onCreated={() => { setShowNew(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewMeetingModal({ member, onClose, onCreated }) {
  const isCouncil = member?.tier === "council";
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", location: "", scheduledAt: "", teamId: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (isCouncil) core.teams().then((r) => setTeams(r.data?.teams || [])).catch(() => {});
  }, [isCouncil]);

  const save = async () => {
    if (form.title.trim().length < 3) { setErr("Give the meeting a title."); return; }
    if (!form.scheduledAt) { setErr("Pick a date and time."); return; }
    setBusy(true); setErr(null);
    try {
      await core.createMeeting({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        teamId: isCouncil ? (form.teamId || null) : null,
      });
      onCreated();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.response?.data?.issues?.[0]?.message || "Could not create meeting.");
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Schedule a meeting" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={INPUT_CLS} placeholder="Weekly sync, event briefing…" />
        </Field>
        <Field label="Details (optional)">
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={INPUT_CLS} placeholder="Agenda, what to bring…" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="When">
            <input type="datetime-local" value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className={INPUT_CLS} />
          </Field>
          <Field label="Where (optional)">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={INPUT_CLS} placeholder="Room / link" />
          </Field>
        </div>
        {isCouncil ? (
          <Field label="Audience">
            <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} className={INPUT_CLS}>
              <option value="">Whole club</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        ) : (
          <p className="text-xs text-text-dim">This meeting goes to your team: {member?.core_teams?.name}.</p>
        )}
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" magnetic={false} loading={busy} onClick={save}>Schedule</Button>
        </div>
      </div>
    </ModalShell>
  );
}
