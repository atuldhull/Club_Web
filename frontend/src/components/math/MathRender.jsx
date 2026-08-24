/**
 * MathRender — render a string with inline $x$ and block $$x$$ math
 * via KaTeX, preserving the surrounding plain text.
 *
 * Usage:
 *   <MathRender source="The integral of x is $$\\int x\\,dx = \\tfrac{x^2}{2}$$" />
 *
 * Why a custom renderer (vs react-katex):
 *   - Keeps the dependency surface small (already pulling katex itself).
 *   - Lets us escape ALL non-math text via the renderer's HTML escape
 *     so a teacher can't paste `<script>` and have it execute when a
 *     student opens the question.
 *   - Inline + display segments parse in one pass — react-katex needs
 *     two separate components, which makes mixed content awkward.
 *
 * Delimiters supported:
 *   $$ ... $$    -> display math (centered, full width)
 *   $ ... $      -> inline math
 * Other LaTeX styles (\(\), \[\]) are NOT supported on purpose — one
 * delimiter style keeps the editor's rules predictable for students.
 */

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Render a single LaTeX segment. KaTeX's strict:false + throwOnError:false
// means a typo doesn't blow up the whole question — it renders the bad
// segment as red verbatim so the teacher can see and fix it.
function renderMath(latex, displayMode) {
  try {
    return katex.renderToString(latex, {
      displayMode,
      strict: "ignore",
      throwOnError: false,
      output: "html",
    });
  } catch {
    // Fall through — return escaped raw so it's visible but inert.
    return `<span style="color:#ef4444">${escapeHtml(latex)}</span>`;
  }
}

// Single-pass tokenise on $$...$$ and $...$ pairs. Anything outside is
// HTML-escaped plain text. \n becomes <br> so multi-line questions
// preserve their breaks.
function compile(source) {
  if (!source) return "";
  // Split on $$ first (greedy non-greedy) so display math wins over
  // overlapping inline matches. The regex captures the full delimited
  // block including the $$ markers so we can tell math from text.
  const parts = [];
  let i = 0;
  while (i < source.length) {
    // Block math
    if (source.startsWith("$$", i)) {
      const end = source.indexOf("$$", i + 2);
      if (end !== -1) {
        parts.push({ type: "block", content: source.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // Inline math (single $ but not $$ — already handled above)
    if (source[i] === "$") {
      const end = source.indexOf("$", i + 1);
      if (end !== -1) {
        // Skip if this looks like a currency value: $5, $10.50 etc.
        // (the next char after the closing $ is whitespace/end and
        //  the inner content is just digits + . — unlikely to be math).
        const inner = source.slice(i + 1, end);
        if (!/^\d+(\.\d+)?$/.test(inner)) {
          parts.push({ type: "inline", content: inner });
          i = end + 1;
          continue;
        }
      }
    }
    // Plain text — scan until next $ marker.
    let j = i;
    while (j < source.length && source[j] !== "$") j++;
    parts.push({ type: "text", content: source.slice(i, j) });
    i = j;
  }
  return parts
    .map((p) => {
      // KaTeX's .katex-display output never line-wraps, so the wrapper
      // scrolls wide equations inside its own box instead of letting
      // them drag the whole page into horizontal scroll on phones.
      if (p.type === "block")  return `<div style="margin:0.5em 0;overflow-x:auto;max-width:100%">${renderMath(p.content, true)}</div>`;
      if (p.type === "inline") return renderMath(p.content, false);
      return escapeHtml(p.content).replace(/\n/g, "<br/>");
    })
    .join("");
}

export default function MathRender({ source = "", className = "" }) {
  const html = useMemo(() => compile(source), [source]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
