/**
 * IdentityCeremonyModal — first-time identity-forging UX.
 *
 * Flow:
 *   1. User opens chat for the first time → status="missing" →
 *      this modal auto-opens.
 *   2. User clicks "Forge" → store runs startCeremony which
 *      generates a 12-word phrase + derives the keypair.
 *   3. Phrase displayed in a 12-cell grid. User has to toggle a
 *      "I have saved my phrase" checkbox before the confirm
 *      button enables. Friction is deliberate — the phrase is the
 *      one and only way to recover messages.
 *   4. On confirm → store.confirmCeremony uploads the public key
 *      + persists the private scalar to IndexedDB.
 *   5. User sees their freshly-derived sigil animate in.
 */

// @ts-check

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIdentityStore } from "@/store/identity-store";
import { useUiStore } from "@/store/ui-store";
import IdentityGlyph from "@/components/identity/IdentityGlyph";
import Button from "@/components/ui/Button";

/**
 * @param {{ onRestoreRequest?: () => void }} props
 */
export default function IdentityCeremonyModal({ onRestoreRequest }) {
  const status        = useIdentityStore((s) => s.status);
  const pendingPhrase = useIdentityStore((s) => s.pendingPhrase);
  const sigil         = useIdentityStore((s) => s.sigil);
  const error         = useIdentityStore((s) => s.error);
  const startCeremony   = useIdentityStore((s) => s.startCeremony);
  const confirmCeremony = useIdentityStore((s) => s.confirmCeremony);
  const cancelCeremony  = useIdentityStore((s) => s.cancelCeremony);
  const closeChat       = useUiStore((s) => s.closeChat);

  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  // "Not now" / ESC / click-outside all do the same thing:
  // reset ceremony state AND close the chat panel. Without closing
  // the panel, the IdentityModalsRoot gate keeps the modal open
  // because status=missing + chatPanelOpen=true still matches its
  // show condition — user would be stuck.
  const dismiss = () => {
    cancelCeremony();
    closeChat();
  };

  // ESC key dismissal.
  useEffect(() => {
    const onKey = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only render when the store is explicitly in a forge-worthy state.
  // `missing` shows the intro, `forging` shows the phrase, `ready`
  // with a fresh sigil shows the celebration frame briefly (we auto-
  // close after a moment).
  const open = status === "missing" || status === "forging";
  if (!open) return null;

  const words = pendingPhrase ? pendingPhrase.split(/\s+/) : [];

  const copy = async () => {
    if (!pendingPhrase) return;
    try {
      await navigator.clipboard.writeText(pendingPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-md px-4 py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // Click on the backdrop (anywhere outside the card) dismisses.
        // The card itself stops propagation below.
        onClick={dismiss}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line/20 bg-panel/95 p-6 shadow-2xl"
        >
          {/* Close X — belts-and-suspenders dismiss path. */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-text-dim transition hover:bg-white/5 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* ── Intro — status=missing ── */}
          {status === "missing" && !pendingPhrase && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                Identity Ceremony
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">
                Forge your mathematical self
              </h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Your chat is end-to-end encrypted. To do that, we need an
                identity key — a piece of math only you hold. We&apos;ll
                generate it from 12 words drawn from the Math Collective&apos;s
                vocabulary.
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                You&apos;ll see those 12 words. <strong className="text-white">Save them somewhere safe.</strong>{" "}
                They&apos;re the one and only way to restore your messages on a new
                device. We never see them, and we can&apos;t recover them for you.
              </p>
              {error && (
                <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}
              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="flex gap-3">
                  <Button variant="ghost" size="sm" onClick={dismiss}>
                    Not now
                  </Button>
                  {onRestoreRequest && (
                    <button
                      type="button"
                      onClick={onRestoreRequest}
                      className="font-mono text-[11px] text-secondary hover:underline"
                    >
                      I already have a phrase
                    </button>
                  )}
                </div>
                <Button size="sm" onClick={startCeremony}>
                  Forge my identity
                </Button>
              </div>
            </>
          )}

          {/* ── Forging in progress (PBKDF2 + key derivation ~1-2s) ── */}
          {status === "forging" && !pendingPhrase && (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              // Explicit hex colours so the spinner is visible even if
              // the theme tokens (--color-primary) haven't initialised
              // — earlier report was "forge click shows blank" on prod
              // where Tailwind theme vars might race with the mount.
              style={{ minHeight: "200px" }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  border: "3px solid rgba(124, 58, 237, 0.2)",
                  borderTopColor: "#7c3aed",
                  borderRadius: "50%",
                  animation: "spin 0.9s linear infinite",
                }}
              />
              <p
                className="mt-4 font-mono text-xs uppercase"
                style={{ color: "#a78bfa", letterSpacing: "0.3em" }}
              >
                Forging your identity
              </p>
              <p className="mt-2 text-sm" style={{ color: "#94a3b8" }}>
                This takes 1–2 seconds on modern hardware.
              </p>
              <p className="mt-1 text-[10px]" style={{ color: "#64748b" }}>
                Stretching entropy through 100,000 PBKDF2 iterations.
              </p>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* ── Phrase reveal — status=forging ── */}
          {status === "forging" && pendingPhrase && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                Your 12 words
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-white">
                Save these — they are your key
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {words.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-line/15 bg-black/25 px-2 py-2"
                  >
                    <span className="font-mono text-[9px] text-text-dim w-4 text-right">{i + 1}</span>
                    <span className="break-all font-mono text-sm text-white">{w}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={copy}
                  className="font-mono text-[11px] text-primary/80 hover:text-primary"
                >
                  {copied ? "✓ copied" : "Copy to clipboard"}
                </button>
                <p className="font-mono text-[10px] text-text-dim">
                  No digits. No spaces. 12 space-separated words.
                </p>
              </div>

              <label className="mt-6 flex items-start gap-3 cursor-pointer text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span>
                  I have saved my 12 words somewhere safe. I understand that
                  <strong className="text-white"> no one can recover them for me</strong>{" "}
                  — not even the Math Collective.
                </span>
              </label>

              {error && (
                <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" size="sm" onClick={dismiss}>
                  Cancel
                </Button>
                <Button size="sm" disabled={!acknowledged} onClick={confirmCeremony}>
                  Forge
                </Button>
              </div>
            </>
          )}

          {/* Optional brief celebration when sigil becomes ready from
              ceremony (handled outside this modal's normal open
              condition — UX lives in a separate short-lived toast). */}
          {status === "ready" && sigil && (
            <div className="text-center">
              <IdentityGlyph sigil={sigil} size={96} />
              <p className="mt-3 font-display text-xl text-white">This is you.</p>
            </div>
          )}

          {/* SAFETY NET — if state ever lands outside every branch
              above (previous bug: catch didn't clear pendingPhrase,
              so status=missing+pendingPhrase=truthy matched nothing),
              surface a clear fallback + error instead of an empty
              card. Covers unforeseen state combinations too. */}
          {!(status === "missing" && !pendingPhrase)
            && !(status === "forging" && !pendingPhrase)
            && !(status === "forging" && pendingPhrase)
            && !(status === "ready"   && sigil) && (
            <div className="py-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-warning">
                Ceremony needs to restart
              </p>
              <p className="mt-3 text-sm text-text-muted">
                Something went wrong mid-way. Close this window and try again.
              </p>
              {error && (
                <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}
              <Button size="sm" variant="ghost" className="mt-4" onClick={dismiss}>
                Close
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
