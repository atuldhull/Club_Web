/**
 * Public certificate verification page.
 *
 * Lives at /verify?token=UUID and talks to /api/certificates/verify/:token.
 * Anyone (no login) can hit this — it's the target a QR code on a
 * Math Collective certificate points to. A potential employer or
 * admissions officer scans the QR, lands here, and immediately sees
 * whether the cert is legitimate + who it was issued to.
 *
 * Never displays the recipient's email — we don't want this page
 * to become a phishing aid.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";

export default function VerifyCertificatePage() {
  useMonument("desert");
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    if (!token) {
      setState({ loading: false, data: null, error: "No verification token supplied." });
      return;
    }
    axios
      .get(`/api/certificates/verify/${encodeURIComponent(token)}`)
      .then((res) => setState({ loading: false, data: res.data, error: null }))
      .catch((err) => {
        const reason = err?.response?.data?.reason || "Could not reach the verification service.";
        setState({ loading: false, data: null, error: reason });
      });
  }, [token]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <MonumentBackground monument="desert" intensity={0.18} />
      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-secondary">
          Certificate Verification
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Math Collective
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Anyone with this page can confirm a certificate is genuine. We never
          ask you to log in for verification.
        </p>

        <div className="mt-10 rounded-2xl border border-line/15 bg-surface/70 p-8 backdrop-blur-xl">
          {state.loading && (
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <p className="text-sm text-text-muted">Checking ledger…</p>
            </div>
          )}

          {!state.loading && state.data?.valid && (
            <VerifiedCard data={state.data} />
          )}

          {!state.loading && !state.data?.valid && (
            <InvalidCard reason={state.error || state.data?.reason || "Certificate not recognised."} />
          )}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-text-dim">
          Cross-reference ·{" "}
          <a href="https://math-collective.onrender.com" className="text-secondary hover:underline">
            math-collective.onrender.com
          </a>
        </p>
      </div>
    </div>
  );
}

function VerifiedCard({ data }) {
  const dateStr = data.eventDate
    ? new Date(data.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const issuedStr = data.issuedAt
    ? new Date(data.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/15 text-2xl">
          ✓
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-success">
            Verified certificate
          </p>
          <p className="font-display text-xl font-bold text-white">This certificate is genuine</p>
        </div>
      </div>

      <dl className="mt-6 space-y-3">
        <Row label="Recipient"      value={data.recipientName} strong />
        <Row label="Event"          value={data.eventName} />
        {dateStr  && <Row label="Event date"  value={dateStr} />}
        <Row label="Issued by"      value={data.issuedBy || "Math Collective"} />
        {issuedStr && <Row label="Issued on"   value={issuedStr} />}
        {data.signatory && <Row label="Signed by" value={`${data.signatory.name}${data.signatory.title ? ` · ${data.signatory.title}` : ""}`} />}
        <Row label="Certificate ID" value={data.certificateId} mono />
      </dl>

      <p className="mt-6 rounded-lg border border-success/20 bg-success/5 px-3 py-2 font-mono text-[10px] text-success">
        Verified against the Math Collective certificate ledger · {new Date().toLocaleString()}
      </p>
    </>
  );
}

function InvalidCard({ reason }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger/15 text-2xl">
          ✕
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-danger">
            Cannot verify
          </p>
          <p className="font-display text-xl font-bold text-white">Certificate not found</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-text-muted">
        This token does not correspond to a certificate we issued. Possible
        reasons:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-muted">
        <li>The link was mistyped or truncated.</li>
        <li>The certificate was revoked by its issuer.</li>
        <li>The certificate was never issued by Math Collective.</li>
      </ul>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-text-dim">
        Server response: {reason}
      </p>
    </>
  );
}

function Row({ label, value, strong, mono }) {
  // Stack label above value on mobile so long values (cert IDs, dates,
  // full names) don't get squeezed against a fixed 128px label column.
  // At sm+ we go back to the side-by-side layout that reads as a
  // proper definition list.
  return (
    <div className="flex flex-col gap-1 border-b border-line/5 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-text-dim sm:w-32 sm:shrink-0">
        {label}
      </dt>
      <dd className={`flex-1 ${mono ? "break-all font-mono" : "break-words"} ${strong ? "font-semibold text-white" : "text-text-muted"}`}>
        {value}
      </dd>
    </div>
  );
}
