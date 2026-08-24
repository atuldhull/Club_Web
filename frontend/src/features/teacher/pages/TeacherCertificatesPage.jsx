import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { certificates } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const PALETTE_OPTIONS = [
  { name: "Royal Purple", value: "purple", colors: ["#8352ff", "#23c1ff"] },
  { name: "Ocean Blue", value: "blue", colors: ["#2563eb", "#06b6d4"] },
  { name: "Emerald", value: "green", colors: ["#059669", "#2dd4bf"] },
  { name: "Sunset Gold", value: "gold", colors: ["#d97706", "#fbbf24"] },
  { name: "Crimson", value: "red", colors: ["#dc2626", "#f87171"] },
];

const CERT_TYPES = [
  { label: "Participation", value: "participation" },
  { label: "Achievement", value: "achievement" },
  { label: "Winner", value: "winner" },
  { label: "Merit", value: "merit" },
];

export default function TeacherCertificatesPage() {
  useMonument("magma");
  // Asset upload state
  const [logoFile, setLogoFile] = useState(null);
  const [sigFile, setSigFile] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [sigUrl, setSigUrl] = useState(null);
  // Optional full-bleed background (A4 landscape PNG/JPG). When set,
  // the PDF renderer skips its preset border + fill and uses this
  // image as the whole page — teacher-provided branding passes through.
  const [templateUrl, setTemplateUrl] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Form state
  const [eventName, setEventName] = useState("");
  const [certType, setCertType] = useState("participation");
  const [palette, setPalette] = useState("purple");
  const [recipients, setRecipients] = useState("");
  // Optional free-form achievement paragraph rendered onto the cert.
  // When blank, the PDF renderer falls back to its built-in default verb.
  const [bodyText, setBodyText] = useState("");

  // Match state
  const [matchedStudents, setMatchedStudents] = useState([]);
  const [matching, setMatching] = useState(false);

  // Batch state
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const logoRef = useRef(null);
  const sigRef = useRef(null);
  const templateRef = useRef(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  async function fetchBatches() {
    try {
      setBatchesLoading(true);
      const res = await certificates.batches();
      setBatches(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load batches");
    } finally {
      setBatchesLoading(false);
    }
  }

  async function handleUploadLogo() {
    if (!logoFile) return;
    try {
      setUploadingLogo(true);
      setError(null);
      const res = await certificates.uploadAsset(logoFile, "logo");
      setLogoUrl(res.data?.url || res.data);
      setSuccess("Logo uploaded successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleUploadSig() {
    if (!sigFile) return;
    try {
      setUploadingSig(true);
      setError(null);
      const res = await certificates.uploadAsset(sigFile, "signature");
      setSigUrl(res.data?.url || res.data);
      setSuccess("Signature uploaded successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Signature upload failed");
    } finally {
      setUploadingSig(false);
    }
  }

  async function handleUploadTemplate() {
    if (!templateFile) return;
    try {
      setUploadingTemplate(true);
      setError(null);
      const res = await certificates.uploadAsset(templateFile, "template");
      setTemplateUrl(res.data?.url || res.data);
      setSuccess("Certificate template uploaded successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Template upload failed");
    } finally {
      setUploadingTemplate(false);
    }
  }

  function handleClearTemplate() {
    setTemplateFile(null);
    setTemplateUrl(null);
    if (templateRef.current) templateRef.current.value = "";
  }

  async function handleMatchStudents() {
    if (!recipients.trim()) return;
    try {
      setMatching(true);
      setError(null);
      const res = await certificates.matchStudents(recipients);
      setMatchedStudents(res.data);
      if (res.data.length === 0) {
        setError("No students matched the provided names/emails");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to match students");
    } finally {
      setMatching(false);
    }
  }

  async function handlePreview() {
    try {
      setPreviewing(true);
      setError(null);
      const res = await certificates.preview({
        eventName,
        certType,
        palette,
        recipients,
        logoUrl,
        sigUrl,
        templateUrl,
        bodyText,
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setError(err.response?.data?.message || "Preview generation failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCreate() {
    if (!eventName.trim()) {
      setError("Event name is required");
      return;
    }
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);
      await certificates.create({
        eventName,
        certType,
        palette,
        recipients,
        logoUrl,
        sigUrl,
        templateUrl,
        bodyText,
      });
      setSuccess("Certificate batch created successfully!");
      setEventName("");
      setRecipients("");
      setBodyText("");
      setMatchedStudents([]);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      fetchBatches();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create certificate batch");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteBatch(id) {
    try {
      setDeletingId(id);
      await certificates.deleteBatch(id);
      setBatches((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete batch");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownloadZip(batchId) {
    try {
      setDownloadingId(batchId);
      const res = await certificates.downloadZip(batchId);
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificates-${batchId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div style={{ position: "relative" }}>
    <MonumentBackground monument="magma" intensity={0.1} />
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Certificate Generator</h2>
        <p className="text-sm text-text-muted">Create and manage certificate batches</p>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            <div className="flex items-center justify-between">
              {error}
              <button onClick={() => setError(null)} aria-label="Dismiss error" className="ml-4 text-danger/60 hover:text-danger">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
          >
            <div className="flex items-center justify-between">
              {success}
              <button onClick={() => setSuccess(null)} aria-label="Dismiss notification" className="ml-4 text-success/60 hover:text-success">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Upload assets */}
        <motion.div custom={0} variants={fadeUp}>
          <Card variant="glass">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">
              Assets
            </p>
            <h3 className="mt-2 font-display text-xl font-bold text-white">
              Upload Logo & Signature
            </h3>

            <div className="mt-5 space-y-4">
              {/* Logo upload */}
              <div className="rounded-xl border border-line/10 bg-black/10 p-4">
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Organization Logo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files[0])}
                    className="min-w-0 flex-1 text-sm text-text-muted file:mr-3 file:rounded-lg file:border file:border-line/15 file:bg-surface/50 file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:uppercase file:text-text-muted file:transition hover:file:border-primary/30 hover:file:text-white"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleUploadLogo}
                    loading={uploadingLogo}
                    disabled={!logoFile}
                  >
                    Upload
                  </Button>
                </div>
                {logoUrl && (
                  <p className="mt-2 font-mono text-[10px] text-success">Logo uploaded</p>
                )}
              </div>

              {/* Signature upload */}
              <div className="rounded-xl border border-line/10 bg-black/10 p-4">
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Signature Image
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={sigRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSigFile(e.target.files[0])}
                    className="min-w-0 flex-1 text-sm text-text-muted file:mr-3 file:rounded-lg file:border file:border-line/15 file:bg-surface/50 file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:uppercase file:text-text-muted file:transition hover:file:border-primary/30 hover:file:text-white"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleUploadSig}
                    loading={uploadingSig}
                    disabled={!sigFile}
                  >
                    Upload
                  </Button>
                </div>
                {sigUrl && (
                  <p className="mt-2 font-mono text-[10px] text-success">Signature uploaded</p>
                )}
              </div>

              {/* Custom template background (optional) */}
              <div className="rounded-xl border border-line/10 bg-black/10 p-4">
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Certificate Template (optional)
                </label>
                <p className="mb-3 text-xs text-text-dim">
                  Upload your own A4 landscape PNG or JPG to use as the full background.
                  The recipient name, body, signatories, and QR still render on top — leave the
                  centre of your design clear. When set, the preset border and colours are skipped.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    ref={templateRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setTemplateFile(e.target.files[0])}
                    className="min-w-0 flex-1 text-sm text-text-muted file:mr-3 file:rounded-lg file:border file:border-line/15 file:bg-surface/50 file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:uppercase file:text-text-muted file:transition hover:file:border-primary/30 hover:file:text-white"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleUploadTemplate}
                    loading={uploadingTemplate}
                    disabled={!templateFile}
                  >
                    Upload
                  </Button>
                </div>
                {templateUrl && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-success/20 bg-success/5 px-3 py-2">
                    <p className="font-mono text-[10px] text-success">
                      Template active — will be used as the cert background.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearTemplate}
                      className="font-mono text-[10px] uppercase tracking-wider text-text-muted transition hover:text-danger"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Certificate form */}
        <motion.div custom={1} variants={fadeUp}>
          <Card variant="glass">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
              Details
            </p>
            <h3 className="mt-2 font-display text-xl font-bold text-white">
              Certificate Configuration
            </h3>

            <div className="mt-5 space-y-4">
              {/* Event name */}
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Event Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Math Olympiad 2026"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white placeholder-text-dim backdrop-blur outline-none transition focus:border-primary/30"
                />
              </div>

              {/* Cert type */}
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Certificate Type
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CERT_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setCertType(ct.value)}
                      className={`rounded-xl border px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition ${
                        certType === ct.value
                          ? "border-primary/30 bg-primary/12 text-white"
                          : "border-line/10 bg-black/10 text-text-dim hover:border-line/20 hover:text-text-muted"
                      }`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Palette selector */}
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Color Palette
                </label>
                <div className="flex flex-wrap gap-2">
                  {PALETTE_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPalette(p.value)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                        palette === p.value
                          ? "border-primary/30 bg-primary/12"
                          : "border-line/10 bg-black/10 hover:border-line/20"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})`,
                        }}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Recipients (names or emails, one per line)
                </label>
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder={"John Doe\njane@example.com\nAlex Smith"}
                  rows={5}
                  className="w-full resize-y rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white placeholder-text-dim backdrop-blur outline-none transition focus:border-primary/30"
                />
              </div>

              {/* Achievement body (optional) */}
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Achievement description (optional)
                </label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value.slice(0, 4000))}
                  placeholder="e.g. For winning the Coding Era hackathon by designing and deploying a real-time collaborative whiteboard."
                  rows={3}
                  maxLength={4000}
                  className="w-full resize-y rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white placeholder-text-dim backdrop-blur outline-none transition focus:border-primary/30"
                />
                <p className="mt-1 font-mono text-[10px] text-text-dim">
                  Appears in the body of the certificate. Leave blank for the default phrasing.
                </p>
              </div>

              {/* Match students */}
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMatchStudents}
                  loading={matching}
                  disabled={!recipients.trim()}
                >
                  Match Students
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handlePreview}
                  loading={previewing}
                  disabled={!eventName.trim()}
                >
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  loading={creating}
                  disabled={!eventName.trim()}
                >
                  Create Batch
                </Button>
              </div>

              {/* Matched students display */}
              {matchedStudents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-success/15 bg-success/5 p-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-success">
                    {matchedStudents.length} students matched
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {matchedStudents.map((s, i) => (
                      <span
                        key={s._id || i}
                        className="rounded-full border border-success/20 bg-success/10 px-3 py-1 font-mono text-[10px] text-success"
                      >
                        {s.name || s.email}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Preview display */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card variant="glow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                    Preview
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">
                    Certificate Preview
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }}
                >
                  Close
                </Button>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-line/15">
                <iframe
                  src={previewUrl}
                  title="Certificate Preview"
                  className="h-[500px] w-full bg-white"
                />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing batches */}
      <motion.div custom={2} variants={fadeUp}>
        <Card variant="solid">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-warning">
            History
          </p>
          <h3 className="mt-2 font-display text-xl font-bold text-white">
            Existing Batches
          </h3>

          {batchesLoading ? (
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl border border-line/10 bg-surface/30"
                />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
              <svg className="h-8 w-8 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-text-dim">No batches created yet</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {batches.map((batch) => (
                <div
                  key={batch.id || batch._id}
                  className="flex flex-col gap-3 rounded-xl border border-line/10 bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {batch.event_name || batch.eventName || batch.title || "Unnamed Batch"}
                    </p>
                    <p className="font-mono text-[10px] text-text-dim">
                      {batch.cert_type || batch.certType || "certificate"} &middot;{" "}
                      {batch.count ?? batch.recipientCount ?? 0} certificates &middot;{" "}
                      {(batch.created_at || batch.createdAt)
                        ? new Date(batch.created_at || batch.createdAt).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownloadZip(batch.id || batch._id)}
                      loading={downloadingId === (batch.id || batch._id)}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteBatch(batch.id || batch._id)}
                      loading={deletingId === (batch.id || batch._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
    </div>
  );
}
