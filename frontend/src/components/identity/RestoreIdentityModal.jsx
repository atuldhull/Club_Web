/**
 * RestoreIdentityModal — paste-your-phrase flow for users who
 * cleared their browser / switched devices.
 *
 * Opens from the ceremony modal's "I already have a phrase" link
 * (or from a future "Settings → Restore" button).
 */

// @ts-check

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIdentityStore } from "@/store/identity-store";
import { isWordInWordlist } from "@/lib/identity/mnemonic";
import Button from "@/components/ui/Button";

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function RestoreIdentityModal({ open, onClose }) {
  const restoreFromPhrase = useIdentityStore((s) => s.restoreFromPhrase);
  const status = useIdentityStore((s) => s.status);
  const error = useIdentityStore((s) => s.error);
  const clearError = useIdentityStore((s) => s.clearError);

  const [text, setText] = useState("");

  if (!open) return null;

  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const unknownWord = words.find((w) => !isWordInWordlist(w));
  const wrongCount = words.length !== 12 && words.length > 0;

  const busy = status === "restoring";

  const handleRestore = async () => {
    clearError();
    await restoreFromPhrase(text);
    // If successful the store flips to "ready" and parent can close
    // on next render; if there was an error, status flipped back to
    // "missing" and the error prop renders in the modal.
    if (useIdentityStore.getState().status === "ready") {
      setText("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-md px-4 py-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line/20 bg-panel/95 p-6 shadow-2xl"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">
            Restore identity
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-white">
            Paste your 12 words
          </h2>
          <p className="mt-2 text-xs text-text-dim">
            Separated by single spaces. Capitalisation doesn&apos;t matter.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
            rows={3}
            className="mt-4 w-full resize-none rounded-xl border border-line/15 bg-black/25 px-4 py-3 font-mono text-sm text-white outline-none focus:border-primary/40"
            disabled={busy}
            autoFocus
          />

          {/* Live validation hints */}
          <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
            <span className={wrongCount ? "text-warning" : "text-text-dim"}>
              {words.length} / 12 words
            </span>
            {unknownWord && (
              <span className="text-danger">
                &ldquo;{unknownWord}&rdquo; is not in the wordlist
              </span>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRestore}
              loading={busy}
              disabled={words.length !== 12 || !!unknownWord}
            >
              Restore
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
