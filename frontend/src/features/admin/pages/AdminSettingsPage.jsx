import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import { events as eventsApi, admin } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";

export default function AdminSettingsPage() {
  useMonument("magma");
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    eventsApi.settings()
      .then((r) => { setSettings(r.data || {}); setLoadError(false); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const saveSetting = async (key, value) => {
    setSaving(true);
    try {
      await eventsApi.updateSetting(key, value);
      showMsg(`"${key}" updated`);
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to save");
    }
    setSaving(false);
  };

  const updateAndSave = (key, value) => {
    setSettings({ ...settings, [key]: value });
    saveSetting(key, value);
  };

  if (loading) return <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} /><div className="flex justify-center py-20"><Loader variant="orbit" size="lg" label="Loading settings..." /></div></div>;
  if (loadError) return <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} /><div className="flex flex-col items-center gap-3 py-20 text-center"><p className="text-4xl">⚠️</p><p className="text-sm text-danger">Couldn&apos;t load site settings</p><button onClick={() => { setLoadError(false); setLoading(true); eventsApi.settings().then(r => setSettings(r.data || {})).catch(() => setLoadError(true)).finally(() => setLoading(false)); }} className="rounded border border-line/20 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10">Retry</button></div></div>;

  return (
    <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} />
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="font-display text-2xl font-bold text-white">System Settings</h2>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{msg}</motion.div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Registration Gate — Prominent control */}
        <Card variant="solid" className="xl:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                settings.registrations_open === "true" ? "bg-success/15" : "bg-danger/15"
              }`}>
                {settings.registrations_open === "true" ? "🔓" : "🔒"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg font-bold text-white">
                    Student Registrations
                  </p>
                  <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    settings.registrations_open === "true"
                      ? "bg-success/15 text-success border border-success/30"
                      : "bg-danger/15 text-danger border border-danger/30"
                  }`}>
                    {settings.registrations_open === "true" ? "Open" : "Closed"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-dim">
                  {settings.registrations_open === "true"
                    ? "New students can create accounts right now"
                    : "Registration page shows a \"closed\" message to visitors"}
                </p>
              </div>
            </div>
            <Button
              variant={settings.registrations_open === "true" ? "danger" : "primary"}
              size="sm"
              loading={saving}
              onClick={() => updateAndSave("registrations_open", settings.registrations_open === "true" ? "false" : "true")}
            >
              {settings.registrations_open === "true" ? "Close Registrations" : "Open Registrations"}
            </Button>
          </div>
          {/* Custom closed message */}
          {settings.registrations_open !== "true" && (
            <div className="mt-4 rounded-xl border border-line/10 bg-black/10 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">Closed Message (shown to visitors)</p>
              <textarea
                value={settings.registration_message || ""}
                onChange={(e) => setSettings({ ...settings, registration_message: e.target.value })}
                placeholder="Registrations are currently closed. Check back soon!"
                rows={2}
                className="mt-2 w-full rounded-lg border border-line/15 bg-black/15 px-3 py-2 text-sm text-white outline-none focus:border-primary/30"
              />
              <Button size="sm" variant="ghost" className="mt-2" loading={saving}
                onClick={() => saveSetting("registration_message", settings.registration_message || "")}>
                Save Message
              </Button>
            </div>
          )}
        </Card>

        {/* Other Site Controls */}
        <Card variant="solid">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Site Controls</p>
          <div className="mt-5 space-y-4">
            {[
              { key: "arena_open", label: "Arena Open", desc: "Allow students to access challenges and submit answers" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-line/10 bg-black/10 px-4 py-3">
                <div>
                  <p className="text-sm text-white">{item.label}</p>
                  <p className="text-xs text-text-dim">{item.desc}</p>
                </div>
                <button
                  onClick={() => updateAndSave(item.key, settings[item.key] === "true" ? "false" : "true")}
                  disabled={saving}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings[item.key] === "true" ? "bg-primary" : "bg-white/10"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings[item.key] === "true" ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Announcement Banner */}
        <Card variant="glass">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">Announcement Banner</p>
              <p className="mt-1 text-xs text-text-dim">
                {settings.banner_enabled === "true"
                  ? "Live — pinned to the top of every page"
                  : "Off — turn on to pin the message to the top of every page"}
              </p>
            </div>
            <button
              onClick={() => updateAndSave("banner_enabled", settings.banner_enabled === "true" ? "false" : "true")}
              disabled={saving}
              aria-label="Toggle announcement banner"
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.banner_enabled === "true" ? "bg-primary" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.banner_enabled === "true" ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <textarea
            value={settings.site_notice || ""}
            onChange={(e) => setSettings({ ...settings, site_notice: e.target.value })}
            placeholder="Registrations are open — join the Collective!"
            rows={3}
            className="mt-4 w-full rounded-xl border border-line/15 bg-black/15 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <div className="flex overflow-hidden rounded-full border border-line/15">
                {[
                  { value: "guests", label: "New visitors" },
                  { value: "all", label: "Everyone" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateAndSave("banner_audience", opt.value)}
                    disabled={saving}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                      (settings.banner_audience === "all" ? "all" : "guests") === opt.value
                        ? "bg-primary/20 text-white"
                        : "text-text-muted hover:text-white"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex overflow-hidden rounded-full border border-line/15">
                {[
                  { value: "ticker", label: "Ticker" },
                  { value: "static", label: "Static" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateAndSave("banner_style", opt.value)}
                    disabled={saving}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                      (settings.banner_style === "ticker" ? "ticker" : "static") === opt.value
                        ? "bg-secondary/20 text-white"
                        : "text-text-muted hover:text-white"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={() => saveSetting("site_notice", settings.site_notice || "")} loading={saving}>
              Update Notice
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-text-dim">
            &ldquo;New visitors&rdquo; shows the banner (with a Join CTA) only to people who aren&apos;t signed in.
            &ldquo;Ticker&rdquo; scrolls the message like running news.
          </p>
        </Card>

        {/* Platform Info */}
        <Card variant="glass">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-warning">Current Settings</p>
          <div className="mt-4 space-y-2">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-line/5 bg-black/5 px-3 py-2">
                <span className="font-mono text-[11px] text-text-dim">{key}</span>
                <span className={`font-mono text-xs ${value === "true" ? "text-success" : value === "false" ? "text-danger" : "text-white"}`}>
                  {String(value) || "—"}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Danger Zone */}
        <Card variant="solid" className="border-danger/15" style={{ boxShadow: "0 0 24px rgba(255,0,0,0.15)" }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-danger">Danger Zone</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-line/10 bg-black/10 px-4 py-3">
              <p className="text-sm text-white">Weekly Leaderboard Reset</p>
              <p className="text-xs text-text-dim">Archive current standings, record winner, start fresh week</p>
              <Button size="sm" variant="danger" className="mt-3" onClick={async () => {
                if (!confirm("Reset weekly leaderboard? This archives current standings.")) return;
                try { const { data } = await admin.resetWeek(); showMsg(data.message || "Reset complete"); } catch { showMsg("Reset failed"); }
              }}>
                Trigger Reset
              </Button>
            </div>
            <div className="rounded-xl border border-danger/15 bg-danger/5 px-4 py-3">
              <p className="text-sm text-white">Clear All Attempts</p>
              <p className="text-xs text-danger/70">Permanently delete every submission. Cannot be undone.</p>
              <Button size="sm" variant="danger" className="mt-3" onClick={async () => {
                if (!confirm("Delete ALL attempts for ALL users? This CANNOT be undone.")) return;
                if (!confirm("Are you absolutely sure?")) return;
                try { await admin.clearAllAttempts(); showMsg("All attempts cleared"); } catch { showMsg("Failed"); }
              }}>
                Clear Everything
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
    </div>
  );
}
