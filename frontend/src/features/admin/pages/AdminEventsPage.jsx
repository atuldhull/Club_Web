/**
 * AdminEventsPage — Complete event management dashboard.
 *
 * Sections:
 *   1. Stats overview (total, upcoming, live, registrations, reg open)
 *   2. Create/edit event form (all fields including new schema)
 *   3. Event list with filters, inline actions
 *   4. Registration viewer (expandable per event, with CSV export)
 *   5. Attendance viewer (expandable per event, with CSV export)
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InputField from "@/components/ui/InputField";
import Loader from "@/components/ui/Loader";
import EventStatusBadge from "@/components/ui/EventStatusBadge";
import EventTypeBadge from "@/components/ui/EventTypeBadge";
import CapacityBar from "@/components/ui/CapacityBar";
import { events as eventsApi, insights } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";
import UserHoverCard from "@/components/social/UserHoverCard";

const EMPTY_FORM = {
  title: "", description: "", location: "", date: "",
  event_type: "general", organiser: "", tags: "",
  capacity: "", venue_type: "in-person", venue_link: "",
  xp_reward: "0", xp_bonus_first: "0", xp_bonus_winner: "0",
  requires_checkin: false, checkin_code: "",
  starts_at: "", ends_at: "", cover_image_url: "",
  registration_deadline: "", banner_color: "#7c3aed",
  // Paid-event fields (migration 19). price_rupees is a UI-only
  // field; we convert to paise in the submit handler. Keeping it as
  // rupees in the form matches how a teacher actually thinks about
  // the fee.
  is_paid: false, price_rupees: "", payment_upi_id: "",
  payment_qr_base64: "", payment_instructions: "",
  // Team-event fields (migration 22). Only meaningful when
  // is_team_event is true; the DB defaults keep solo events clean
  // if a teacher flips the checkbox on + off without touching the
  // size inputs.
  is_team_event: false, min_team_size: "2", max_team_size: "5",
};

export default function AdminEventsPage() {
  useMonument("magma");
  const navigate = useNavigate();

  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [expandedRegs, setExpandedRegs] = useState(null);
  const [expandedAtt, setExpandedAtt] = useState(null);
  const [regsData, setRegsData] = useState([]);
  const [attData, setAttData] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [attLoading, setAttLoading] = useState(false);
  const [expandedHealth, setExpandedHealth] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [adminInsights, setAdminInsights] = useState(null);
  // Paid-event reconciliation panel (migration 19)
  const [expandedPayments, setExpandedPayments] = useState(null);
  const [paymentsData, setPaymentsData] = useState({ event: null, registrations: [] });
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [reconcilingId, setReconcilingId] = useState(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    eventsApi.list()
      .then(r => setEventsList(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEventsList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Fetch admin insights
  useEffect(() => {
    insights.admin().then(r => setAdminInsights(r.data)).catch(() => {});
  }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3500); };
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const stats = {
    total: eventsList.length,
    upcoming: eventsList.filter(e => e.status === "upcoming" || e.status === "registering").length,
    live: eventsList.filter(e => e.status === "active").length,
    totalRegs: eventsList.reduce((s, e) => s + (e.registration_count || 0), 0),
    regOpen: eventsList.filter(e => e.registration_open).length,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    // Paid events with a blank price silently shipped as free before
    // this guard — backend would accept is_paid:true with price_paise:0
    // and students would register without ever seeing a pay screen.
    // Block the save here with a clear message instead.
    if (form.is_paid) {
      const rupees = Number(form.price_rupees);
      if (!form.price_rupees || !(rupees > 0)) {
        showMsg("Paid events need a price greater than 0");
        return;
      }
      if (!form.payment_upi_id && !form.payment_qr_base64) {
        showMsg("Paid events need a UPI ID or a QR image for students to pay");
        return;
      }
    }
    if (form.is_team_event) {
      const mn = Number(form.min_team_size);
      const mx = Number(form.max_team_size);
      if (!(mn >= 1) || !(mx >= mn) || mx > 50) {
        showMsg("Team size range must be 1 ≤ min ≤ max ≤ 50");
        return;
      }
    }
    setSaving(true);
    try {
      // <input type="datetime-local"> emits values like "2026-04-20T12:00"
      // (no seconds, no timezone). Zod's .datetime() requires full ISO
      // with timezone ("...T12:00:00Z"), so every date entered in the
      // form was failing validation with "date: Invalid datetime". Pad
      // the string to a full ISO instant before POST — the local wall
      // clock is the user's intent, so "Z" marks it as UTC without
      // silently shifting by their tz offset.
      const toIsoOrNull = (v) => {
        if (!v) return null;
        if (typeof v !== "string") return v;
        // Already full ISO? ends with Z or an offset (+/-hh:mm)
        if (/Z$|[+-]\d{2}:?\d{2}$/.test(v)) return v;
        // YYYY-MM-DDTHH:MM → add :00 seconds
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00Z`;
        // YYYY-MM-DDTHH:MM:SS → add Z
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) return `${v}Z`;
        // YYYY-MM-DD (date only) — leave alone, validator's second
        // branch accepts it via regex.
        return v;
      };
      const payload = {
        ...form,
        capacity: form.capacity ? Number(form.capacity) : null,
        xp_reward: Number(form.xp_reward) || 0,
        xp_bonus_first: Number(form.xp_bonus_first) || 0,
        xp_bonus_winner: Number(form.xp_bonus_winner) || 0,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        // Zod's .url() and isoDate regex both reject "". Inputs that were
        // never touched sit at "" in form state, so without this coercion
        // every unfilled date or URL field triggers a blanket "Validation
        // failed" on event create.
        date:                 toIsoOrNull(form.date),
        venue_link:           form.venue_link || null,
        cover_image_url:      form.cover_image_url || null,
        starts_at: toIsoOrNull(form.starts_at || form.date),
        ends_at:   toIsoOrNull(form.ends_at),
        registration_deadline: toIsoOrNull(form.registration_deadline),
        // Paid-event fields. Convert rupees → paise for the API.
        // Empty strings become nulls so the validator's optional()
        // branches are hit instead of failing on "" vs. UPI regex.
        is_paid: !!form.is_paid,
        price_paise: form.is_paid && form.price_rupees
          ? Math.round(Number(form.price_rupees) * 100)
          : 0,
        payment_upi_id:       form.is_paid ? (form.payment_upi_id || null) : null,
        payment_qr_base64:    form.is_paid ? (form.payment_qr_base64 || null) : null,
        payment_instructions: form.is_paid ? (form.payment_instructions || null) : null,
        // Team-event fields. When is_team_event is off we send the DB
        // defaults (2/5) rather than null — the columns are NOT NULL
        // per migration 22.
        is_team_event:  !!form.is_team_event,
        min_team_size:  form.is_team_event ? Number(form.min_team_size) || 2 : 2,
        max_team_size:  form.is_team_event ? Number(form.max_team_size) || 5 : 5,
      };
      // strip the UI-only field before sending
      delete payload.price_rupees;
      if (editId) {
        await eventsApi.update(editId, payload);
        showMsg("Event updated");
      } else {
        await eventsApi.create(payload);
        showMsg("Event created");
      }
      setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(false);
      fetchEvents();
    } catch (err) {
      // Surface the first Zod issue (path + message) when the validator
      // rejects the payload, so "Validation failed" stops being an
      // unactionable wall and the admin can see e.g. "venue_link: must
      // be a URL".
      const data = err.response?.data;
      const firstIssue = data?.issues?.[0];
      const detail = firstIssue
        ? `${firstIssue.path}: ${firstIssue.message}`
        : null;
      showMsg(detail || data?.error || "Failed");
    }
    setSaving(false);
  };

  const handleEdit = (ev) => {
    setForm({
      title: ev.title || "", description: ev.description || "", location: ev.location || "",
      date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : "",
      event_type: ev.event_type || "general", organiser: ev.organiser || "",
      tags: (ev.tags || []).join(", "), capacity: ev.capacity || "",
      venue_type: ev.venue_type || "in-person", venue_link: ev.venue_link || "",
      xp_reward: String(ev.xp_reward || 0), xp_bonus_first: String(ev.xp_bonus_first || 0),
      xp_bonus_winner: String(ev.xp_bonus_winner || 0),
      requires_checkin: ev.requires_checkin || false, checkin_code: ev.checkin_code || "",
      starts_at: ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 16) : "",
      ends_at: ev.ends_at ? new Date(ev.ends_at).toISOString().slice(0, 16) : "",
      cover_image_url: ev.cover_image_url || "",
      registration_deadline: ev.registration_deadline ? new Date(ev.registration_deadline).toISOString().slice(0, 16) : "",
      banner_color: ev.banner_color || "#7c3aed",
      // Paid-event fields
      is_paid: !!ev.is_paid,
      price_rupees: ev.price_paise ? String(ev.price_paise / 100) : "",
      payment_upi_id: ev.payment_upi_id || "",
      payment_qr_base64: ev.payment_qr_base64 || "",
      payment_instructions: ev.payment_instructions || "",
      // Team-event fields
      is_team_event: !!ev.is_team_event,
      min_team_size: ev.min_team_size != null ? String(ev.min_team_size) : "2",
      max_team_size: ev.max_team_size != null ? String(ev.max_team_size) : "5",
    });
    setEditId(ev.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Convert an uploaded file (File object) to a data:URL string so
  // the backend can store it inline. 200KB cap is enforced by the
  // Zod validator server-side; we surface an early error client-side
  // so the user doesn't upload then get rejected.
  const handleQrFile = async (file) => {
    if (!file) return;
    if (file.size > 200 * 1024) {
      showMsg("QR image too large — re-export at a lower resolution (target <50KB)");
      return;
    }
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      showMsg("QR must be a PNG or JPEG image");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setField("payment_qr_base64", reader.result);
    reader.readAsDataURL(file);
  };

  const viewPayments = async (eventId) => {
    if (expandedPayments === eventId) { setExpandedPayments(null); return; }
    setExpandedPayments(eventId); setPaymentsLoading(true);
    try {
      const { data } = await eventsApi.listPayments(eventId);
      setPaymentsData({ event: data.event, registrations: data.registrations || [] });
    } catch {
      setPaymentsData({ event: null, registrations: [] });
    }
    setPaymentsLoading(false);
  };

  const refreshPayments = async (eventId) => {
    setPaymentsLoading(true);
    try {
      const { data } = await eventsApi.listPayments(eventId);
      setPaymentsData({ event: data.event, registrations: data.registrations || [] });
    } catch { /* keep prior data */ }
    setPaymentsLoading(false);
  };

  const handleMarkPaid = async (eventId, regId) => {
    setReconcilingId(regId);
    try {
      await eventsApi.markPaid(eventId, regId);
      showMsg("Marked paid");
      await refreshPayments(eventId);
    } catch (err) {
      showMsg(err.response?.data?.error || "Mark-paid failed");
    } finally {
      setReconcilingId(null);
    }
  };

  const handleRejectPayment = async (eventId, regId) => {
    const reason = window.prompt("Reason for rejecting this payment (shown to the student):");
    if (!reason || !reason.trim()) return;
    setReconcilingId(regId);
    try {
      await eventsApi.rejectPayment(eventId, regId, reason.trim());
      showMsg("Payment rejected");
      await refreshPayments(eventId);
    } catch (err) {
      showMsg(err.response?.data?.error || "Reject failed");
    } finally {
      setReconcilingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this event?")) return;
    try { await eventsApi.remove(id); showMsg("Event deleted"); fetchEvents(); }
    catch (err) { showMsg(err.response?.data?.error || "Delete failed"); }
  };

  const handleToggleReg = async (id) => {
    try { await eventsApi.toggleReg(id); fetchEvents(); }
    catch (err) { showMsg(err.response?.data?.error || "Could not toggle registration"); }
  };

  const viewRegistrations = async (eventId) => {
    if (expandedRegs === eventId) { setExpandedRegs(null); return; }
    setExpandedRegs(eventId); setRegsLoading(true);
    try { const { data } = await eventsApi.registrations(eventId); setRegsData(Array.isArray(data) ? data : []); }
    catch { setRegsData([]); }
    setRegsLoading(false);
  };

  const viewAttendance = async (eventId) => {
    if (expandedAtt === eventId) { setExpandedAtt(null); return; }
    setExpandedAtt(eventId); setAttLoading(true);
    try { const { data } = await eventsApi.attendance(eventId); setAttData(Array.isArray(data) ? data : []); }
    catch { setAttData([]); }
    setAttLoading(false);
  };

  const viewHealth = async (eventId) => {
    if (expandedHealth === eventId) { setExpandedHealth(null); return; }
    setExpandedHealth(eventId); setHealthLoading(true);
    try { const { data } = await insights.eventHealth(eventId); setHealthData(data); }
    catch { setHealthData(null); }
    setHealthLoading(false);
  };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const rows = data.map(row => {
      const flat = { ...row };
      if (row.students) { flat.student_name = row.students.name; flat.student_email = row.students.email; }
      delete flat.students;
      // Nested values (team members, payment details) would otherwise
      // serialise as "[object Object]".
      for (const k of Object.keys(flat)) {
        if (flat[k] !== null && typeof flat[k] === "object") flat[k] = JSON.stringify(flat[k]);
      }
      return flat;
    });
    // Union of keys — later rows can carry fields the first row lacks.
    const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => cell(r[h])).join(","))].join("\n");
    // BOM so Excel reads UTF-8 (avatar emojis, accented names) correctly.
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filtered = filter === "all" ? eventsList
    : filter === "live" ? eventsList.filter(e => e.status === "active")
    : filter === "upcoming" ? eventsList.filter(e => e.status === "upcoming" || e.status === "registering")
    : eventsList.filter(e => e.status === "completed" || e.status === "past");

  if (loading) return (
    <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} />
      <div className="flex justify-center py-20"><Loader variant="orbit" size="lg" label="Loading events..." /></div>
    </div>
  );

  return (
    <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} />
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Event Management</h2>
          <div className="mt-1 flex gap-4 font-mono text-[11px] text-text-dim">
            <span>{stats.total} total</span><span className="text-secondary">{stats.upcoming} upcoming</span>
            <span className="text-success">{stats.live} live</span><span className="text-primary">{stats.totalRegs} regs</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate("/teacher/scanner")}>QR Scanner</Button>
          <Button size="sm" onClick={() => { setShowForm(!showForm); if (showForm) { setEditId(null); setForm({ ...EMPTY_FORM }); } }}>
            {showForm ? "Cancel" : "Create Event"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Upcoming", value: stats.upcoming, color: "text-secondary" },
          { label: "Live Now", value: stats.live, color: "text-success" },
          { label: "Registrations", value: stats.totalRegs, color: "text-primary" },
          { label: "Reg Open", value: stats.regOpen, color: "text-warning" },
        ].map(s => (
          <Card key={s.label} variant="glass" className="text-center !py-3">
            <p className={`math-text text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-text-dim">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {msg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{msg}</motion.div>}
      </AnimatePresence>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card variant="glow">
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-display text-lg font-bold text-white">{editId ? "Edit Event" : "New Event"}</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2"><InputField label="Title" placeholder="Event name" value={form.title} onChange={e => setField("title", e.target.value)} required /></div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Type</label>
                    <select value={form.event_type} onChange={e => setField("event_type", e.target.value)}
                      className="w-full rounded-xl border border-line/15 bg-panel/70 px-4 py-3 text-sm text-white outline-none">
                      <option value="general">General</option><option value="hackathon">Hackathon</option>
                      <option value="workshop">Workshop</option><option value="competition">Competition</option><option value="seminar">Seminar</option>
                    </select>
                  </div>
                </div>
                <InputField label="Description" placeholder="Event details" value={form.description} onChange={e => setField("description", e.target.value)} multiline />
                <div className="grid gap-4 sm:grid-cols-3">
                  <InputField label="Location" placeholder="Campus / Online" value={form.location} onChange={e => setField("location", e.target.value)} />
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Venue</label>
                    <select value={form.venue_type} onChange={e => setField("venue_type", e.target.value)}
                      className="w-full rounded-xl border border-line/15 bg-panel/70 px-4 py-3 text-sm text-white outline-none">
                      <option value="in-person">In-Person</option><option value="online">Online</option><option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  {(form.venue_type === "online" || form.venue_type === "hybrid") && (
                    <InputField label="Meeting Link" placeholder="https://meet.google.com/..." value={form.venue_link} onChange={e => setField("venue_link", e.target.value)} />
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Start</label>
                    <input type="datetime-local" value={form.starts_at || form.date} onChange={e => { setField("starts_at", e.target.value); setField("date", e.target.value); }}
                      className="w-full rounded-xl border border-line/15 bg-panel/70 px-4 py-3 text-sm text-white outline-none" /></div>
                  <div><label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">End</label>
                    <input type="datetime-local" value={form.ends_at} onChange={e => setField("ends_at", e.target.value)}
                      className="w-full rounded-xl border border-line/15 bg-panel/70 px-4 py-3 text-sm text-white outline-none" /></div>
                  <div><label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Reg Deadline</label>
                    <input type="datetime-local" value={form.registration_deadline} onChange={e => setField("registration_deadline", e.target.value)}
                      className="w-full rounded-xl border border-line/15 bg-panel/70 px-4 py-3 text-sm text-white outline-none" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  <InputField label="Capacity" placeholder="∞" type="number" value={form.capacity} onChange={e => setField("capacity", e.target.value)} />
                  <InputField label="XP Reward" placeholder="0" type="number" value={form.xp_reward} onChange={e => setField("xp_reward", e.target.value)} />
                  <InputField label="Early Bird XP" placeholder="0" type="number" value={form.xp_bonus_first} onChange={e => setField("xp_bonus_first", e.target.value)} />
                  <InputField label="Winner XP" placeholder="0" type="number" value={form.xp_bonus_winner} onChange={e => setField("xp_bonus_winner", e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <InputField label="Organiser" placeholder="Dept of AI&ML" value={form.organiser} onChange={e => setField("organiser", e.target.value)} />
                  <InputField label="Tags (comma)" placeholder="math, hackathon" value={form.tags} onChange={e => setField("tags", e.target.value)} />
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Check-in</label>
                    <div className="flex items-center gap-3 mt-1">
                      <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                        <input type="checkbox" checked={form.requires_checkin} onChange={e => setField("requires_checkin", e.target.checked)} className="accent-primary" />
                        Require code
                      </label>
                      {form.requires_checkin && (
                        <input type="text" placeholder="6-digit" value={form.checkin_code} onChange={e => setField("checkin_code", e.target.value)} maxLength={6}
                          className="w-24 rounded-lg border border-line/15 bg-black/15 px-2 py-1 font-mono text-sm text-white outline-none" />
                      )}
                    </div>
                  </div>
                </div>
                {/* ── Team Event (migration 22) ── */}
                <div className="rounded-xl border border-line/15 bg-panel/40 p-4">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input type="checkbox" checked={form.is_team_event} onChange={e => setField("is_team_event", e.target.checked)} className="accent-primary" />
                    <span className="font-semibold">This is a team event</span>
                    <span className="font-mono text-[10px] text-text-dim">(one leader registers on behalf of the team)</span>
                  </label>
                  {form.is_team_event && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <InputField
                        label="Min team size"
                        type="number"
                        value={form.min_team_size}
                        onChange={e => setField("min_team_size", e.target.value)}
                        placeholder="2"
                      />
                      <InputField
                        label="Max team size"
                        type="number"
                        value={form.max_team_size}
                        onChange={e => setField("max_team_size", e.target.value)}
                        placeholder="5"
                      />
                    </div>
                  )}
                  {form.is_team_event && (
                    <p className="mt-3 font-mono text-[10px] text-text-dim">
                      Students will be asked for a team name and team size at registration. The size is validated against the range above. One QR / one check-in per team.
                    </p>
                  )}
                </div>
                {/* ── Paid Event (migration 19) ── */}
                <div className="rounded-xl border border-line/15 bg-panel/40 p-4">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input type="checkbox" checked={form.is_paid} onChange={e => setField("is_paid", e.target.checked)} className="accent-primary" />
                    <span className="font-semibold">This is a paid event</span>
                    <span className="font-mono text-[10px] text-text-dim">(manual UPI / QR)</span>
                  </label>
                  {form.is_paid && (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InputField label="Price (₹)" placeholder="50" type="number" value={form.price_rupees} onChange={e => setField("price_rupees", e.target.value)} />
                        <InputField label="UPI ID (VPA)" placeholder="name@okhdfcbank" value={form.payment_upi_id} onChange={e => setField("payment_upi_id", e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">QR Image (PNG/JPEG, &lt;50KB ideal)</label>
                        <input type="file" accept="image/png,image/jpeg" onChange={e => handleQrFile(e.target.files?.[0])}
                          className="w-full rounded-xl border border-line/15 bg-panel/70 px-4 py-3 text-sm text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1 file:text-white" />
                        {form.payment_qr_base64 && (
                          <div className="mt-2 flex items-start gap-2">
                            <img src={form.payment_qr_base64} alt="QR preview" loading="lazy" decoding="async" width="96" height="96" className="h-24 w-24 rounded-lg border border-line/15 bg-white p-1" />
                            <button type="button" onClick={() => setField("payment_qr_base64", "")}
                              className="font-mono text-[10px] text-danger hover:underline">remove</button>
                          </div>
                        )}
                      </div>
                      <InputField label="Instructions (shown to students)" placeholder="Include your USN in the transaction note"
                        value={form.payment_instructions} onChange={e => setField("payment_instructions", e.target.value)} multiline />
                      <p className="font-mono text-[10px] text-text-dim">
                        Students will see the QR + UPI ID on the event page, pay from their UPI app, and submit the 12-digit reference number. You verify in your own bank app and mark them paid from the Payments panel on each event.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="submit" loading={saving} size="sm">{editId ? "Update Event" : "Create Event"}</Button>
                  {editId && <Button variant="ghost" size="sm" onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setShowForm(false); }}>Cancel Edit</Button>}
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[{ key: "all", label: "All" }, { key: "upcoming", label: "Upcoming" }, { key: "live", label: "Live" }, { key: "past", label: "Past" }].map(f => (
          <Button key={f.key} variant={filter === f.key ? "primary" : "ghost"} size="sm" onClick={() => setFilter(f.key)}>{f.label}</Button>
        ))}
      </div>

      {/* Event List */}
      <div className="space-y-4">
        {filtered.length === 0 && <p className="py-8 text-center text-text-dim">No events found</p>}
        {filtered.map(ev => (
          <div key={ev.id}>
            <Card variant={ev.status === "active" ? "glow" : "glass"}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventStatusBadge status={ev.status} />
                    <EventTypeBadge type={ev.event_type} />
                    <button onClick={() => handleToggleReg(ev.id)}
                      className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase transition ${ev.registration_open ? "border-success/20 bg-success/8 text-success" : "border-danger/20 bg-danger/8 text-danger"}`}>
                      Reg: {ev.registration_open ? "Open" : "Closed"}
                    </button>
                    {ev.xp_reward > 0 && <span className="math-text text-[10px] text-primary">+{ev.xp_reward} XP</span>}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold text-white">{ev.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-text-dim">
                    {(ev.starts_at || ev.date) && <span>{new Date(ev.starts_at || ev.date).toLocaleString()}</span>}
                    {ev.location && <span>{ev.location}</span>}
                    {ev.organiser && <span>by {ev.organiser}</span>}
                  </div>
                  {ev.description && <p className="mt-2 text-xs text-text-muted line-clamp-2">{ev.description}</p>}
                  {(ev.capacity || ev.registration_count > 0) && (
                    <div className="mt-2 max-w-xs"><CapacityBar current={ev.registration_count || 0} max={ev.capacity} /></div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => viewRegistrations(ev.id)}>
                    {expandedRegs === ev.id ? "Hide" : `Regs (${ev.registration_count || 0})`}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => viewAttendance(ev.id)}>
                    {expandedAtt === ev.id ? "Hide" : "Attendance"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => viewHealth(ev.id)}>
                    {expandedHealth === ev.id ? "Hide" : "Health"}
                  </Button>
                  {ev.is_paid && (
                    <Button variant="ghost" size="sm" onClick={() => viewPayments(ev.id)}>
                      {expandedPayments === ev.id ? "Hide" : "Payments"}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(ev)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(ev.id)}>Delete</Button>
                </div>
              </div>
            </Card>

            {/* Registrations Panel */}
            <AnimatePresence>
              {expandedRegs === ev.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <Card variant="solid" className="mt-1 ml-4 border-l-2 border-l-primary/30">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Registrations</p>
                      {regsData.length > 0 && <Button variant="ghost" size="sm" onClick={() => exportCSV(regsData, `regs-${ev.title}`)}>Export CSV</Button>}
                    </div>
                    {regsLoading ? <Loader variant="dots" size="sm" /> : regsData.length === 0 ? (
                      <p className="text-xs text-text-dim">No registrations yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="border-b border-line/10 font-mono text-[9px] uppercase tracking-wider text-text-dim">
                            <th className="px-2 py-2">Student</th><th className="px-2 py-2">Email</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Team</th>
                          </tr></thead>
                          <tbody>
                            {regsData.map(r => (
                              <tr key={r.id} className="border-b border-line/5 hover:bg-white/[0.02]">
                                <td className="px-2 py-2 text-white">
                                  {r.user_id
                                    ? <UserHoverCard userId={r.user_id}>{r.students?.name || "—"}</UserHoverCard>
                                    : (r.students?.name || "—")}
                                </td>
                                <td className="px-2 py-2 text-text-dim">{r.students?.email || "—"}</td>
                                <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 font-mono text-[8px] uppercase ${
                                  r.status === "attended" ? "bg-success/10 text-success" : r.status === "registered" ? "bg-secondary/10 text-secondary" :
                                  r.status === "waitlisted" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"
                                }`}>{r.status}</span></td>
                                <td className="px-2 py-2 text-text-dim">{r.registered_at ? new Date(r.registered_at).toLocaleDateString() : "—"}</td>
                                <td className="px-2 py-2 text-text-dim">{r.team_name || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attendance Panel */}
            <AnimatePresence>
              {expandedAtt === ev.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <Card variant="solid" className="mt-1 ml-4 border-l-2 border-l-success/30">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-success">Attendance</p>
                      {attData.length > 0 && <Button variant="ghost" size="sm" onClick={() => exportCSV(attData, `attendance-${ev.title}`)}>Export CSV</Button>}
                    </div>
                    {attLoading ? <Loader variant="dots" size="sm" /> : attData.length === 0 ? (
                      <p className="text-xs text-text-dim">No attendance yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="border-b border-line/10 font-mono text-[9px] uppercase tracking-wider text-text-dim">
                            <th className="px-2 py-2">Student</th><th className="px-2 py-2">Method</th><th className="px-2 py-2">Time</th><th className="px-2 py-2">XP</th><th className="px-2 py-2">Session</th>
                          </tr></thead>
                          <tbody>
                            {attData.map(a => (
                              <tr key={a.id} className="border-b border-line/5 hover:bg-white/[0.02]">
                                <td className="px-2 py-2 text-white">
                                  {a.user_id
                                    ? <UserHoverCard userId={a.user_id}>{a.students?.name || "—"}</UserHoverCard>
                                    : (a.students?.name || "—")}
                                </td>
                                <td className="px-2 py-2"><span className={`rounded px-1.5 py-0.5 font-mono text-[8px] uppercase ${
                                  a.checkin_method === "qr" ? "bg-primary/10 text-primary" : a.checkin_method === "code" ? "bg-secondary/10 text-secondary" : "bg-white/5 text-text-dim"
                                }`}>{a.checkin_method}</span></td>
                                <td className="px-2 py-2 text-text-dim">{a.checkin_time ? new Date(a.checkin_time).toLocaleString() : "—"}</td>
                                <td className="px-2 py-2 math-text text-primary">{a.xp_awarded || 0}</td>
                                <td className="px-2 py-2 text-text-dim">{a.session_label || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Payments Panel (migration 19) */}
            <AnimatePresence>
              {expandedPayments === ev.id && ev.is_paid && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <Card variant="solid" className="mt-1 ml-4 border-l-2 border-l-secondary/30">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-secondary">Payments</p>
                        {paymentsData.event && (
                          <p className="mt-0.5 font-mono text-[10px] text-text-dim">
                            ₹{((paymentsData.event.price_paise || 0) / 100).toFixed(2)} per seat
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {paymentsData.registrations.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => exportCSV(paymentsData.registrations, `payments-${ev.title}`)}>Export CSV</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => refreshPayments(ev.id)}>Refresh</Button>
                      </div>
                    </div>
                    {paymentsLoading ? <Loader variant="dots" size="sm" /> : paymentsData.registrations.length === 0 ? (
                      <p className="text-xs text-text-dim">No registrations yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="border-b border-line/10 font-mono text-[9px] uppercase tracking-wider text-text-dim">
                            <th className="px-2 py-2">Student</th><th className="px-2 py-2">Email</th><th className="px-2 py-2">UPI Ref</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Paid At</th><th className="px-2 py-2">Actions</th>
                          </tr></thead>
                          <tbody>
                            {paymentsData.registrations.map(r => {
                              const ps = r.payment_status || "pending";
                              const busy = reconcilingId === r.id;
                              return (
                                <tr key={r.id} className="border-b border-line/5 hover:bg-white/[0.02]">
                                  <td className="px-2 py-2 text-white">
                                    {r.user_id
                                      ? <UserHoverCard userId={r.user_id}>{r.students?.name || "—"}</UserHoverCard>
                                      : (r.students?.name || "—")}
                                  </td>
                                  <td className="px-2 py-2 text-text-dim">{r.students?.email || "—"}</td>
                                  <td className="px-2 py-2 font-mono text-text-muted">{r.payment_ref || "—"}</td>
                                  <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 font-mono text-[8px] uppercase ${
                                    ps === "paid" ? "bg-success/10 text-success" :
                                    ps === "submitted" ? "bg-secondary/10 text-secondary" :
                                    ps === "rejected" ? "bg-danger/10 text-danger" :
                                    ps === "pending" ? "bg-warning/10 text-warning" :
                                    "bg-white/5 text-text-dim"
                                  }`}>{ps.replace("_", " ")}</span></td>
                                  <td className="px-2 py-2 text-text-dim">{r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}</td>
                                  <td className="px-2 py-2">
                                    {ps === "submitted" && (
                                      <div className="flex gap-1">
                                        <Button variant="primary" size="sm" loading={busy} onClick={() => handleMarkPaid(ev.id, r.id)}>Mark paid</Button>
                                        <Button variant="danger" size="sm" loading={busy} onClick={() => handleRejectPayment(ev.id, r.id)}>Reject</Button>
                                      </div>
                                    )}
                                    {ps === "rejected" && r.rejection_reason && (
                                      <span className="font-mono text-[10px] text-danger">{r.rejection_reason}</span>
                                    )}
                                    {ps === "paid" && (
                                      <span className="font-mono text-[10px] text-success">✓ verified</span>
                                    )}
                                    {(ps === "pending" || ps === "not_required") && (
                                      <span className="font-mono text-[10px] text-text-dim">awaiting ref</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Health Metrics Panel */}
            <AnimatePresence>
              {expandedHealth === ev.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <Card variant="solid" className="mt-1 ml-4 border-l-2 border-l-warning/30">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-warning">Event Health</p>
                    {healthLoading ? <Loader variant="dots" size="sm" /> : !healthData ? (
                      <p className="mt-2 text-xs text-text-dim">No data</p>
                    ) : (
                      <div className="mt-3 grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <p className="font-mono text-[9px] uppercase text-text-dim">Registration</p>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div><p className="math-text text-lg font-bold text-white">{healthData.registration?.total || 0}</p><p className="text-[8px] text-text-dim">Total</p></div>
                            <div><p className="math-text text-lg font-bold text-success">{healthData.registration?.attended || 0}</p><p className="text-[8px] text-text-dim">Attended</p></div>
                            <div><p className="math-text text-lg font-bold text-danger">{healthData.registration?.cancelled || 0}</p><p className="text-[8px] text-text-dim">Cancelled</p></div>
                            <div><p className="math-text text-lg font-bold text-warning">{healthData.registration?.waitlisted || 0}</p><p className="text-[8px] text-text-dim">Waitlisted</p></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-mono text-[9px] uppercase text-text-dim">Rates</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-text-dim">Fill Rate</span>
                              <span className="math-text text-white">{healthData.rates?.fill_rate ?? "∞"}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-text-dim">Attendance</span>
                              <span className={`math-text ${healthData.rates?.attendance_rate >= 70 ? "text-success" : healthData.rates?.attendance_rate >= 40 ? "text-warning" : "text-danger"}`}>
                                {healthData.rates?.attendance_rate || 0}%
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-text-dim">Cancel Rate</span>
                              <span className={`math-text ${healthData.rates?.cancel_rate <= 10 ? "text-success" : "text-danger"}`}>
                                {healthData.rates?.cancel_rate || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-mono text-[9px] uppercase text-text-dim">Check-in Methods</p>
                          <div className="space-y-1">
                            {[
                              { label: "QR Scan", val: healthData.attendance?.qr || 0, color: "text-primary" },
                              { label: "Code", val: healthData.attendance?.code || 0, color: "text-secondary" },
                              { label: "Manual", val: healthData.attendance?.manual || 0, color: "text-text-dim" },
                            ].map(m => (
                              <div key={m.label} className="flex justify-between text-xs">
                                <span className="text-text-dim">{m.label}</span>
                                <span className={`math-text ${m.color}`}>{m.val}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex justify-between text-xs border-t border-line/10 pt-2">
                            <span className="text-text-dim">Total XP Awarded</span>
                            <span className="math-text text-primary">{healthData.xp?.total_awarded || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Platform Insights */}
      {adminInsights && (
        <Card variant="glass">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">Platform Insights</p>
          <h3 className="mt-2 font-display text-lg font-bold text-white">Overview</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <p className="math-text text-2xl font-bold text-primary">{adminInsights.registrations?.active_users || 0}</p>
              <p className="font-mono text-[9px] text-text-dim">Active Users</p>
            </div>
            <div className="text-center">
              <p className="math-text text-2xl font-bold text-success">{adminInsights.registrations?.attendance_rate || 0}%</p>
              <p className="font-mono text-[9px] text-text-dim">Attendance Rate</p>
            </div>
            <div className="text-center">
              <p className="math-text text-2xl font-bold text-warning">{adminInsights.achievements?.total_unlocks || 0}</p>
              <p className="font-mono text-[9px] text-text-dim">Achievements Unlocked</p>
            </div>
            <div className="text-center">
              <p className="math-text text-2xl font-bold text-secondary">{adminInsights.registrations?.total || 0}</p>
              <p className="font-mono text-[9px] text-text-dim">Total Registrations</p>
            </div>
          </div>
          {adminInsights.top_events?.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[9px] uppercase text-text-dim mb-2">Top Events by Registration</p>
              {adminInsights.top_events.map((ev, i) => (
                <div key={ev.id} className="flex items-center gap-3 py-1.5">
                  <span className="math-text w-6 text-xs text-text-dim text-right">{i + 1}.</span>
                  <span className="flex-1 text-xs text-white truncate">{ev.title}</span>
                  <span className="rounded px-1.5 py-0.5 font-mono text-[8px] uppercase bg-white/5 text-text-dim">{ev.type}</span>
                  <span className="math-text text-xs text-primary">{ev.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </motion.div>
    </div>
  );
}
