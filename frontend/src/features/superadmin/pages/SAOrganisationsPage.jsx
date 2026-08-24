import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import { superAdmin } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";

export default function SAOrganisationsPage() {
  useMonument("magma");
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", primary_color: "#7c3aed" });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [statsId, setStatsId] = useState(null);
  const [statsData, setStatsData] = useState(null);

  const fetchOrgs = () => {
    setLoading(true);
    superAdmin.orgs()
      .then((r) => { const d = r.data; setOrgs(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []); })
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrgs(); }, []);
  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const handleCreate = async (e) => {
    e.preventDefault(); setCreating(true);
    try { await superAdmin.createOrg(form); setForm({ name: "", slug: "", primary_color: "#7c3aed" }); setShowCreate(false); showMsg("Organisation created"); fetchOrgs(); }
    catch (err) { showMsg(err.response?.data?.error || "Failed"); }
    setCreating(false);
  };

  if (loading) return <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.08} /><div className="flex justify-center py-20"><Loader variant="orbit" size="lg" /></div></div>;

  return (
    <div style={{ position: "relative" }}>
    <MonumentBackground monument="magma" intensity={0.08} />
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Organisations</h2>
          <p className="text-sm text-text-muted">{orgs.length} registered</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "Create Organisation"}</Button>
      </div>

      {msg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{msg}</motion.div>}

      {showCreate && (
        <Card variant="glow">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-display text-lg font-bold text-white">New Organisation</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
                  placeholder="Organisation name" required className="w-full rounded-xl border border-line/15 bg-black/15 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/30" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Slug</label>
                <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="org-slug" required className="w-full rounded-xl border border-line/15 bg-black/15 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/30" />
              </div>
            </div>
            <Button type="submit" loading={creating} size="sm">Create</Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {orgs.length === 0 && <p className="py-8 text-center text-text-dim">No organisations yet</p>}
        {orgs.map((org) => (
          <Card key={org.id} variant="solid">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full" style={{ background: org.primary_color || "#7c3aed" }} />
                <div>
                  <p className="text-sm font-medium text-white">{org.name}</p>
                  <p className="font-mono text-[10px] text-text-dim">{org.slug} · {org.plan_name || "free"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase ${org.status === "active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{org.status}</span>
                <button onClick={async () => { setStatsId(org.id); setStatsData(null); try { const { data } = await superAdmin.orgStats(org.id); setStatsData(data); } catch { setStatsData({ error: true }); } }}
                  className="rounded-lg bg-white/5 px-3 py-2 font-mono text-[10px] text-text-muted hover:text-white transition sm:px-2.5 sm:py-1">Stats</button>
                {org.status === "active" ? (
                  <button
                    onClick={async () => {
                      if (!confirm("Suspend?")) return;
                      try { await superAdmin.suspendOrg(org.id); showMsg("Suspended"); }
                      catch (err) { showMsg(err.response?.data?.error || "Suspend failed"); return; }
                      fetchOrgs();
                    }}
                    className="rounded-lg bg-warning/10 px-3 py-2 font-mono text-[10px] text-warning sm:px-2.5 sm:py-1">Suspend</button>
                ) : (
                  <button
                    onClick={async () => {
                      try { await superAdmin.activateOrg(org.id); showMsg("Activated"); }
                      catch (err) { showMsg(err.response?.data?.error || "Activate failed"); return; }
                      fetchOrgs();
                    }}
                    className="rounded-lg bg-success/10 px-3 py-2 font-mono text-[10px] text-success sm:px-2.5 sm:py-1">Activate</button>
                )}
                <button
                  onClick={async () => {
                    if (!confirm("DELETE permanently?")) return;
                    try { await superAdmin.deleteOrg(org.id); showMsg("Deleted"); }
                    catch (err) { showMsg(err.response?.data?.error || "Delete failed"); return; }
                    fetchOrgs();
                  }}
                  className="rounded-lg bg-danger/10 px-3 py-2 font-mono text-[10px] text-danger sm:px-2.5 sm:py-1">Delete</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Stats modal */}
      <AnimatePresence>
        {statsId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setStatsId(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line/15 bg-surface/95 p-6 shadow-panel backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-lg font-bold text-white">Org Stats</h3>
              {!statsData ? <div className="py-6"><Loader variant="orbit" size="md" /></div> : statsData.error ? <p className="py-4 text-danger">Failed</p> : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {Object.entries(statsData).filter(([k]) => !["org", "id"].includes(k)).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-line/10 bg-black/10 px-3 py-2 text-center">
                      <p className="font-display text-lg font-bold text-primary">{v ?? 0}</p>
                      <p className="font-mono text-[9px] text-text-dim capitalize">{k.replace(/_/g, " ")}</p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setStatsId(null)} className="mt-4 w-full rounded-xl bg-white/5 py-2 text-sm text-text-muted hover:text-white transition">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}
