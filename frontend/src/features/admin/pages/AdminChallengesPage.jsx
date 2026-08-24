import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InputField from "@/components/ui/InputField";
import Loader from "@/components/ui/Loader";
import { challenges, teacher } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";
import LaTeXEditor from "@/components/math/LaTeXEditor";
import MathRender from "@/components/math/MathRender";

const difficultyColors = { easy: "text-success", medium: "text-warning", hard: "text-danger", extreme: "text-glow" };

export default function AdminChallengesPage() {
  useMonument("magma");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", question: "", options: ["", "", "", ""], correct_index: 0, difficulty: "medium", points: 50, solution: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [selected, setSelected] = useState(new Set());

  // AI generation state
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [genError, setGenError] = useState(null);

  async function handleAiGenerate() {
    if (!aiTopic.trim()) return;
    setGenerating(true); setGenError(null); setGenerated(null);
    try {
      const res = await teacher.generate(aiTopic, aiDifficulty);
      setGenerated(res.data);
    } catch (err) {
      // Distinguish "backend sent an error reason" from "the request
      // never reached the server" (CORS, offline, timeout with no
      // response). Users were seeing a bare "AI generation failed"
      // when axios had no response object at all — now they see a
      // specific hint that points at the right place to look.
      const data = err?.response?.data;
      const status = err?.response?.status;
      let msg;
      if (data?.error || data?.message) {
        msg = data.error || data.message;
      } else if (!err?.response) {
        msg = `Network error — the request didn't reach the server (${err?.code || err?.message || "unknown"}). Check your connection and try again.`;
      } else {
        msg = `AI generation failed (HTTP ${status}). Try again or lower the difficulty.`;
      }
      setGenError(msg);
    }
    setGenerating(false);
  }

  async function handleAiSave() {
    if (!generated) return;
    setAiSaving(true);
    try {
      await teacher.saveQuestion(generated);
      showMsg("AI question saved to bank!");
      setGenerated(null); setAiTopic("");
      fetch();
    } catch (err) {
      setGenError(err.response?.data?.message || "Failed to save");
    }
    setAiSaving(false);
  }

  const fetch = () => {
    setLoading(true);
    challenges.all()
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const filtered = list.filter((c) => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDiff !== "all" && (c.difficulty || "").toLowerCase() !== filterDiff) return false;
    if (filterStatus === "active" && c.is_active === false) return false;
    if (filterStatus === "inactive" && c.is_active !== false) return false;
    return true;
  });

  const stats = {
    total: list.length,
    active: list.filter((c) => c.is_active !== false).length,
    inactive: list.filter((c) => c.is_active === false).length,
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await challenges.create(form);
      setShowCreate(false);
      setForm({ title: "", question: "", options: ["", "", "", ""], correct_index: 0, difficulty: "medium", points: 50, solution: "" });
      showMsg("Challenge created");
      fetch();
    } catch (err) { showMsg(err.response?.data?.error || "Failed"); }
    setSaving(false);
  };

  const handleToggle = async (id) => {
    try { await challenges.toggle(id); }
    catch (err) { showMsg(err.response?.data?.error || "Could not toggle challenge"); return; }
    fetch();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this challenge?")) return;
    try { await challenges.remove(id); showMsg("Deleted"); fetch(); }
    catch (err) { showMsg(err.response?.data?.error || "Delete failed"); }
  };

  const handleBulkToggle = async (activate) => {
    const ids = [...selected];
    if (!ids.length) return;
    let failed = 0;
    for (const id of ids) {
      const ch = list.find((c) => c.id === id);
      if (ch && (activate ? ch.is_active === false : ch.is_active !== false)) {
        try { await challenges.toggle(id); }
        catch { failed++; }
      }
    }
    setSelected(new Set());
    showMsg(failed ? `Updated ${ids.length - failed} / ${ids.length} — ${failed} failed` : `${ids.length} challenges updated`);
    fetch();
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const updateOption = (i, v) => { const o = [...form.options]; o[i] = v; setForm({ ...form, options: o }); };

  return (
    <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} />
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Challenge Management</h2>
          <div className="mt-1 flex gap-4 font-mono text-[11px] text-text-dim">
            <span>{stats.total} total</span>
            <span className="text-success">{stats.active} active</span>
            <span className="text-danger">{stats.inactive} inactive</span>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Challenge"}
        </Button>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{msg}</motion.div>
      )}

      {/* Create form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card variant="glow">
            <form onSubmit={handleCreate} className="space-y-4">
              <h3 className="font-display text-lg font-bold text-white">New Challenge</h3>
              <InputField label="Title" placeholder="Challenge title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-text-muted">Question</label>
                <LaTeXEditor
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="Type the question. Wrap math in $...$ (inline) or $$...$$ (display). Click toolbar buttons to insert common LaTeX."
                  required
                />
              </div>
              <div className="space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-text-muted">Options (click letter = correct)</p>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button type="button" onClick={() => setForm({ ...form, correct_index: i })}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${form.correct_index === i ? "border-success bg-success/20 text-success" : "border-line/20 text-text-dim"}`}>
                      {String.fromCharCode(65 + i)}
                    </button>
                    <input type="text" placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt} onChange={(e) => updateOption(i, e.target.value)}
                      className="flex-1 rounded-xl border border-line/15 bg-black/15 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/30" required />
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-text-muted">Difficulty</label>
                  <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full rounded-xl border border-line/15 bg-black/15 px-4 py-2.5 text-sm text-white outline-none">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="extreme">Extreme</option>
                  </select>
                </div>
                <InputField label="Points" type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-text-muted">Solution (optional)</label>
                <LaTeXEditor
                  value={form.solution}
                  onChange={(e) => setForm({ ...form, solution: e.target.value })}
                  placeholder="Explain the answer. Math goes between $...$ or $$...$$"
                  rows={3}
                />
              </div>
              <Button type="submit" loading={saving}>Save Challenge</Button>
            </form>
          </Card>
        </motion.div>
      )}

      {/* AI Question Generator */}
      <Card variant="glass">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">AI Powered</p>
        <h3 className="mt-2 font-display text-xl font-bold text-white">Question Generator</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Topic</label>
            <input type="text" placeholder="e.g. Quadratic equations, Probability..." value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
              className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white placeholder-text-dim outline-none focus:border-primary/30" />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Difficulty</label>
            <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}
              className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white outline-none">
              <option>Easy</option><option>Medium</option><option>Hard</option><option>Extreme</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleAiGenerate} loading={generating} disabled={!aiTopic.trim()} size="sm">
            {generating ? "Generating..." : "Generate Question"}
          </Button>
        </div>
        {genError && <div className="mt-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{genError}</div>}
        <AnimatePresence>
          {generated && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-5 overflow-hidden">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Generated Preview</p>
                <h4 className="mt-2 text-lg font-bold text-white">{generated.title}</h4>
                <MathRender source={generated.question || ""} className="mt-2 text-sm leading-relaxed text-text-muted [&_.katex]:text-white" />
                {generated.options && (
                  <div className="mt-3 space-y-2">
                    {generated.options.map((opt, i) => {
                      const isCorrect = i === generated.correct_index || i === generated.correctIndex;
                      return (
                        <div key={i} className={`rounded-lg border px-3 py-2 text-sm ${
                          isCorrect
                            ? "border-success/30 bg-success/10 text-success" : "border-line/10 bg-black/10 text-text-muted"
                        }`}>
                          <span className="mr-2 font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
                          <MathRender source={String(opt || "")} className={`inline ${isCorrect ? "[&_.katex]:text-success" : "[&_.katex]:text-white"}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
                {(generated.solution || generated.explanation) && (
                  <div className="mt-3 rounded-lg border border-line/10 bg-black/10 p-3">
                    <p className="font-mono text-[10px] uppercase text-text-dim">Explanation</p>
                    <p className="mt-1 text-sm text-text-muted">{generated.solution || generated.explanation}</p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={handleAiSave} loading={aiSaving} size="sm" variant="secondary">Save to Bank</Button>
                  <Button onClick={handleAiGenerate} loading={generating} size="sm" variant="primary">Regenerate</Button>
                  <Button onClick={() => setGenerated(null)} size="sm" variant="ghost">Discard</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/30 sm:w-60" />
        <select value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)}
          className="flex-1 rounded-xl border border-line/15 bg-surface/50 px-3 py-2.5 text-sm text-white outline-none sm:flex-none">
          <option value="all">All Difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="extreme">Extreme</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="flex-1 rounded-xl border border-line/15 bg-surface/50 px-3 py-2.5 text-sm text-white outline-none sm:flex-none">
          <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
            <span className="font-mono text-[11px] text-primary">{selected.size} selected</span>
            <button onClick={() => handleBulkToggle(true)} className="font-mono text-[10px] text-success hover:underline">Activate</button>
            <button onClick={() => handleBulkToggle(false)} className="font-mono text-[10px] text-danger hover:underline">Deactivate</button>
            <button onClick={() => setSelected(new Set())} className="font-mono text-[10px] text-text-dim hover:underline">Clear</button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader variant="orbit" size="lg" /></div>
      ) : (
        <Card variant="solid" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line/10 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="px-3 py-3"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="accent-primary" /></th>
                  <th className="px-3 py-3">Challenge</th>
                  <th className="px-3 py-3">Difficulty</th>
                  <th className="px-3 py-3">Points</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-text-dim">No challenges found</td></tr>}
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-line/5 transition hover:bg-white/[0.02] hover:border-l-2 hover:border-l-[rgba(255,107,53,0.3)]">
                    <td className="px-3 py-3"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="accent-primary" /></td>
                    <td className="px-3 py-3 font-medium text-white">{c.title}</td>
                    <td className={`px-3 py-3 font-mono text-xs ${difficultyColors[(c.difficulty || "").toLowerCase()] || "text-text-muted"}`}>{c.difficulty || "—"}</td>
                    <td className="px-3 py-3 font-mono text-primary">{c.points || 50}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => handleToggle(c.id)}
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase transition ${c.is_active !== false ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {c.is_active !== false ? "active" : "inactive"}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-[10px] text-text-dim">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => handleDelete(c.id)} className="font-mono text-[11px] text-danger hover:text-danger/70">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.div>
    </div>
  );
}
