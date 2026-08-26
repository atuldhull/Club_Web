import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InputField from "@/components/ui/InputField";
import Loader from "@/components/ui/Loader";
import { admin } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";

function downloadCsv(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// "New" badge window for the Joined column.
const NEW_MEMBER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const isNewMember = (createdAt) => !!createdAt && Date.now() - new Date(createdAt).getTime() < NEW_MEMBER_WINDOW_MS;
const joinedLabel = (createdAt) =>
  createdAt ? new Date(createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminUsersPage() {
  useMonument("magma");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchUsers = (p = 1) => {
    setLoading(true);
    admin.users(p, 20)
      .then((res) => {
        setUsers(res.data?.users || (Array.isArray(res.data) ? res.data : []));
        setTotal(res.data?.total || 0);
        setPage(p);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await admin.createUser(createForm);
      setCreateForm({ name: "", email: "", password: "", role: "student" });
      setShowCreate(false);
      showMsg("User created successfully");
      fetchUsers(page);
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to create user");
    }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this user permanently?")) return;
    try {
      await admin.deleteUser(id);
      showMsg("User deleted");
      fetchUsers(page);
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to delete");
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await admin.updateRole(id, role);
      showMsg("Role updated");
      fetchUsers(page);
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to update role");
    }
  };

  const handleResetPassword = async (id) => {
    const pw = prompt("Enter new password for this user:");
    if (!pw) return;
    try {
      await admin.resetPassword(id, pw);
      showMsg("Password reset successfully");
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to reset password");
    }
  };

  const handleExportCSV = useCallback(async () => {
    try {
      setExporting(true);
      // The server builds the file from the FULL roster — the list endpoint
      // is capped at 100 per page, which used to truncate this export.
      const res = await admin.exportUsers();
      downloadCsv(res.data, `users_export_${new Date().toISOString().slice(0, 10)}.csv`);
      showMsg("CSV exported — full member list");
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }, []);

  const roleColors = {
    student: "bg-primary/10 text-primary",
    teacher: "bg-success/10 text-success",
    admin: "bg-warning/10 text-warning",
    super_admin: "bg-danger/10 text-danger",
  };

  return (
    <div style={{ position: "relative" }}><MonumentBackground monument="magma" intensity={0.1} />
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">User Management</h2>
          <p className="text-sm text-text-muted">{total} total users</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" loading={exporting} onClick={handleExportCSV}>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </span>
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "Create User"}
          </Button>
        </div>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {msg}
        </motion.div>
      )}

      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card variant="glow">
            <form onSubmit={handleCreate} className="space-y-4">
              <h3 className="font-display text-lg font-bold text-white">Create New User</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Name" placeholder="Full name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                <InputField label="Email" type="email" placeholder="user@university.edu" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Password" type="password" placeholder="Set a password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required />
                <div>
                  <label className="mb-3 block font-mono text-[11px] uppercase tracking-[0.28em] text-text-muted">Role</label>
                  <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full rounded-[1.5rem] border border-line/18 bg-panel/70 px-4 py-3 text-sm text-white outline-none">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <Button type="submit" loading={creating} size="sm">Create User</Button>
            </form>
          </Card>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader variant="orbit" size="lg" /></div>
      ) : (
        <Card variant="solid" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line/10 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">XP</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-text-dim">No users found</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line/5 transition hover:bg-white/[0.02] hover:border-l-2 hover:border-l-[rgba(255,107,53,0.3)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{u.name || "—"}</p>
                      <p className="font-mono text-[10px] text-text-dim">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role || "student"}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`rounded-full border-0 px-2.5 py-0.5 font-mono text-[10px] uppercase outline-none ${roleColors[u.role] || roleColors.student}`}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 font-mono text-primary">{u.xp || 0}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${u.is_active !== false ? "bg-success" : "bg-text-dim"}`} />
                        <span className="font-mono text-[10px] text-text-dim">{u.is_active !== false ? "active" : "inactive"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="whitespace-nowrap font-mono text-[10px] text-text-dim">{joinedLabel(u.created_at)}</span>
                        {isNewMember(u.created_at) && (
                          <span className="rounded-full border border-success/30 bg-success/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-success">New</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => handleResetPassword(u.id)}>
                          Reset PW
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(u.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-3 border-t border-line/10 px-4 py-3">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => fetchUsers(page - 1)}>Prev</Button>
              <span className="font-mono text-xs text-text-dim">Page {page}</span>
              <Button variant="ghost" size="sm" disabled={users.length < 20} onClick={() => fetchUsers(page + 1)}>Next</Button>
            </div>
          )}
        </Card>
      )}
    </motion.div>
    </div>
  );
}
