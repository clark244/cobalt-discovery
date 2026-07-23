import React, { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";

// ── Cobalt design system ──
const COBALT = "#3B82F6";
const INK = "#1F2937";
const AMBER = "#D97706";
// Impact chip color-coding: single-hue cobalt intensity ramp (high -> low).
// Values arrive from the model at runtime, so this is case-insensitive with a medium fallback.
const impactChipStyle = (level) => {
  switch (String(level || "").toLowerCase()) {
    case "high":
      return { color: "#1D4ED8", backgroundColor: "#DBEAFE", borderColor: "#60A5FA" };
    case "low":
      return { color: "#6B7280", borderColor: "#D1D5DB" };
    case "medium":
    default:
      return { color: "#3B82F6", backgroundColor: "#F4F8FE", borderColor: "#BFDBFE" };
  }
};
// Where "Email Cobalt" outreach is sent. Change this to a shared inbox if desired.
const COBALT_EMAIL = "clark@cobaltcollective.org";
// Booking link used only on the third-party causal-study priority card.
const COBALT_CALENDLY = "https://calendly.com/clark-cobaltcollective";
// Optional voice input — feature-detected (Chrome/Edge), mic-gated, off by default.
const SpeechRecognitionImpl = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
// Optional on-demand read-aloud (accessibility) — feature-detected browser speech synthesis.
const TTS_OK = typeof window !== "undefined" && "speechSynthesis" in window;

// ── Cobalt brand mark, baked in (blue hex "C"). Travels with the app; no upload, no network. ──
const LOGO = "data:image/png;base64,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";

const GREETING =
  "Hi — I'm Cobalt's discovery guide. In a short conversation I'll help you map how your solution is meant to create impact, and where measuring it could actually move the needle for you.\n\nThere are no wrong answers, and you can be as rough as you like — I'll ask follow-ups where it helps. At the end, I'll share some ideas about how impact measurement could help your organization, your solution, and your users.\n\nTo start, what's your role at the organization?";

// Dev-only: a complete sample conversation so the Generate step can be tested
// without typing a full discovery each time. Surfaced only when the URL has ?dev=1.
const DEV_TRANSCRIPT = [
  { role: "assistant", content: GREETING },
  { role: "user", content: "It's an online, text-based platform for constructive disagreement between two students, with an AI facilitating the conversation." },
  { role: "assistant", content: "Interesting — structured disagreement as the learning mechanism. Who are the students, and is this teacher-assigned or something they come to on their own?" },
  { role: "user", content: "Higher ed now, extending to K-12. It's best for civics, social studies, ELA, and SEL. Teachers assign it, tied to what they're covering in class." },
  { role: "assistant", content: "So the teacher is the real adopter and the students are the ones in the conversation. What's the core outcome you're trying to drive?" },
  { role: "user", content: "Durable skills for constructive disagreement — students who are more comfortable engaging people they disagree with and who reason more carefully." },
  { role: "assistant", content: "What are students actually doing on the platform that's supposed to build that skill?" },
  { role: "user", content: "They debate a real peer while an AI guide gives charitable rephrasing, feedback, and challenges — deliberate practice with a scaffold right there in the exchange." },
  { role: "assistant", content: "That's clear for what happens in-platform. The harder link is transfer — what makes them better at disagreement outside the tool?" },
  { role: "user", content: "It's like sports practice — it builds skills that should show up in real face-to-face and text conversations. Honestly that transfer is still largely unproven for us." },
  { role: "assistant", content: "Honest answer. Who actually needs evidence that this works, and for what decision?" },
  { role: "user", content: "Educators deciding whether to assign it, and funders deciding whether to back the K-12 expansion." },
  { role: "assistant", content: "Got it. On capacity — do you have people who could design and run a study, data coming off the platform, and budget for the work?" },
  { role: "user", content: "We have researchers on the team and rich platform data — behavior traces, process data, end-of-chat comprehension quizzes. We also have some internal budget we could commit. Funding scale is still the main constraint, but we have partner schools." },
  { role: "assistant", content: "Strong position — people, data, partners, and some committed budget, with funding scale as the binding constraint. Here's my read: your platform builds constructive-disagreement skill through practice plus real-time AI coaching; educators and funders are the evidence audience; and the transfer from platform to real-world conversation is the hardest link to demonstrate. Does that land?" },
];

// Set once the email gate is passed (see verify-code). Sent as a Bearer token
// on every function call so the server — not the UI — enforces the gate.
let AUTH_TOKEN = "";
const authHeaders = () => (AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {});

async function callClaude(promptId, messages) {
  // The API only accepts { role, content } per message. Our UI attaches extra
  // fields (e.g. `options` for quick-pick chips), so strip everything else
  // before sending — otherwise the API rejects the unexpected key.
  const clean = (messages || []).map(({ role, content }) => ({ role, content }));
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ promptId, messages: clean }),
      });
      if (res.status === 429) {
        const info = await res.json().catch(() => ({}));
        const err = new Error(info.error || "Daily limit reached.");
        err.code = 429;
        throw err;
      }
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      if (text) return text;
    } catch (e) {
      if (e.code === 429) throw e; // do not retry a rate-limit
      if (attempt === 1) throw e;
    }
  }
  throw new Error("empty");
}

function CobaltLogo({ size = 34 }) {
  return <img src={LOGO} alt="Cobalt Collective" width={size} height={size} style={{ objectFit: "contain", display: "block" }} />;
}

function CobaltSpinner({ size = 24 }) {
  return <img src={LOGO} alt="" width={size} height={size} className="animate-spin" style={{ objectFit: "contain", display: "block" }} />;
}

function StatusDot({ status }) {
  const ok = status === "confirmed";
  return <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: ok ? COBALT : AMBER }} />;
}

function Node({ data, label }) {
  const assumed = data?.status === "assumed";
  const color = assumed ? AMBER : COBALT;
  return (
    <div className="rounded-lg px-4 py-3 bg-white w-full" style={{ border: `2px solid ${color}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color }}>{label}</div>
      <div className="text-[14px] leading-snug" style={{ color: INK }}>{data?.label || "—"}</div>
    </div>
  );
}

function Connector({ data }) {
  const assumed = data?.status === "assumed";
  const color = assumed ? AMBER : COBALT;
  return (
    <div className="flex items-center gap-2.5 py-1.5 pl-2">
      <svg width="22" height="26" viewBox="0 0 22 26" className="shrink-0">
        <line x1="11" y1="1" x2="11" y2="18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M5.5 14 L11 20.5 L16.5 14" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="text-[11px] leading-tight" style={{ color }}>{data?.label || ""}</div>
    </div>
  );
}

// Qualitative bands replaced the old 1-5 scores: a numeric x/5 felt arbitrary
// after a short conversation. Three ordered bands, low → high.
const BAND_ORDER = ["Not yet in place", "Emerging", "Established"];
function bandColor(band) {
  if (band === "Established") return COBALT;
  if (band === "Emerging") return AMBER;
  return "#9CA3AF"; // "Not yet in place" / unknown
}
function BandChip({ band }) {
  const c = bandColor(band);
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0"
      style={{ color: c, borderColor: c + "55", background: c + "12" }}
    >
      {band || "—"}
    </span>
  );
}
// A dimension's position on the three-band ladder, current band highlighted.
function BandLadder({ bands, current }) {
  return (
    <ol className="mt-1.5 space-y-1">
      {bands.map(([band, desc]) => {
        const isCurrent = band === current;
        const c = bandColor(band);
        return (
          <li
            key={band}
            className="text-[11px] leading-snug flex gap-1.5 rounded px-1.5 py-1"
            style={{ background: isCurrent ? c + "12" : "transparent" }}
          >
            <span className="font-bold shrink-0" style={{ color: isCurrent ? c : "#9CA3AF" }}>{band}</span>
            <span style={{ color: isCurrent ? INK : "#6B7280", fontWeight: isCurrent ? 600 : 400 }}>— {desc}</span>
          </li>
        );
      })}
    </ol>
  );
}
// Strength / Opportunity pair shown under a dimension (replaces the numeric note + next-level tooltip).
function StrengthOpp({ strength, opportunity }) {
  return (
    <div className="mt-2 space-y-1">
      {strength && (
        <p className="text-xs leading-snug">
          <span className="font-semibold" style={{ color: "#15803D" }}>Strength: </span>
          <span style={{ color: "#4B5563" }}>{strength}</span>
        </p>
      )}
      {opportunity && (
        <p className="text-xs leading-snug">
          <span className="font-semibold" style={{ color: COBALT }}>Opportunity: </span>
          <span style={{ color: "#4B5563" }}>{opportunity}</span>
        </p>
      )}
    </div>
  );
}

// Small "(i)" affordance that reveals next-level guidance. Click to toggle;
// clicking anywhere else closes it. (Hover was unreliable — a gap between the
// button and the popover caused it to flicker shut.)
function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);
  if (!text) return null;
  return (
    <span className="relative inline-block align-middle ml-1" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
        style={{ background: open ? COBALT : "#DBEAFE", color: open ? "white" : COBALT }}
        aria-label="What would move this up a level"
        aria-expanded={open}
        type="button"
      >
        i
      </button>
      {open && (
        <span
          className="absolute z-20 right-0 mt-1 w-60 p-2.5 rounded-lg text-[11px] leading-snug shadow-lg text-left font-normal normal-case tracking-normal border"
          style={{ background: "white", color: INK, borderColor: "#E5E7EB" }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

// Catches render errors so a bad payload shows a friendly message, never a blank page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, msg: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, msg: String(error && error.message ? error.message : error) };
  }
  componentDidCatch(error, info) {
    try { console.error("Deliverable render error:", error, info); } catch (e) {}
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: "#FBD5B5", background: "#FFF7ED" }}>
          <p className="text-sm font-semibold" style={{ color: AMBER }}>Something went wrong displaying your results.</p>
          <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Your session was still saved. Try regenerating, or reach out to Cobalt and we'll follow up.</p>
          {this.props.onRetry && (
            <button onClick={this.props.onRetry} className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg text-white" style={{ background: COBALT }}>Try again</button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Persistent 4-phase progress strip shown under the header during a session.
function PhaseTracker({ phase }) {
  const PHASES = [
    { label: "Getting started" },
    { label: "How it works" },
    { label: "Making it happen" },
    { label: "Your results" },
  ];
  return (
    <div className="flex items-center px-4 sm:px-5 py-2.5 border-b border-slate-100">
      {PHASES.map((p, i) => {
        const state = i < phase ? "done" : i === phase ? "current" : "todo";
        const circleBg = state === "current" ? COBALT : state === "done" ? "#EAF3FB" : "#F3F4F6";
        const circleBd = state === "current" ? COBALT : state === "done" ? "#85B7EB" : "#E5E7EB";
        const labelColor = state === "current" ? INK : state === "done" ? "#6B7280" : "#B4B7BD";
        const labelWeight = state === "current" ? 600 : 400;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 72 }}>
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 22, height: 22, background: circleBg, border: `1.5px solid ${circleBd}` }}
              >
                {state === "done" ? (
                  <span style={{ color: "#2F6FB0", fontSize: 12, lineHeight: 1 }}>✓</span>
                ) : (
                  <span style={{ color: state === "current" ? "white" : "#B4B7BD", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{i + 1}</span>
                )}
              </div>
              <div style={{ fontSize: 10, lineHeight: 1.15, textAlign: "center", color: labelColor, fontWeight: labelWeight }}>{p.label}</div>
            </div>
            {i < PHASES.length - 1 && (
              <div className="flex-1" style={{ height: 1.5, background: i < phase ? "#85B7EB" : "#E5E7EB", margin: "0 2px", position: "relative", top: -9 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Static band ladders shown when a user expands "What the bands mean". These are Cobalt's
// fixed three-band scales (not model-generated), so they're free to render and always consistent.
const CLARITY_BANDS = [
  ["Not yet in place", "No clearly identified outcome or mechanism yet."],
  ["Emerging", "Behavior and outcome are named, but the link between them is asserted, not yet reasoned and evidenced."],
  ["Established", "Both mechanisms are articulated and the behavior→outcome link is reasoned and evidenced; at its strongest, you can say what would confirm or disconfirm the theory."],
];
const CAPACITY_BANDS = {
  "Analytic skill": {
    key: "analyticSkill",
    bands: [
      ["Not yet in place", "No owner for measurement, or the skills present are unrelated."],
      ["Emerging", "Adjacent data skill exists, but not core research-design expertise or a clear owner."],
      ["Established", "In-house research skill to fully run a measurement plan, with a clear owner."],
    ],
  },
  "Data infrastructure": {
    key: "dataInfrastructure",
    bands: [
      ["Not yet in place", "None, or too messy to use."],
      ["Emerging", "Data exists but isn't yet organized for analysis."],
      ["Established", "Organized and usable for routine measurement."],
    ],
  },
  "Budget": {
    key: "budget",
    bands: [
      ["Not yet in place", "No budget, or only the intent to seek an external grant."],
      ["Emerging", "Seeking or holding an external, time-limited grant, with no internal commitment yet."],
      ["Established", "Internal budget and staffing for ongoing measurement, with an owner."],
    ],
  },
};

function Deliverable({ d, onEmailSubmit, messages = [] }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState({ 0: true }); // which opportunity cards are open (screen-only); top card open by default
  const toggle = (i) => setExpanded((e) => ({ ...e, [i]: !e[i] }));
  const [rubric, setRubric] = useState({}); // which score card's rubric is expanded
  const toggleRubric = (k) => setRubric((r) => ({ ...r, [k]: !r[k] }));
  const [emailInput, setEmailInput] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const submitEmail = () => {
    const v = emailInput.trim();
    if (!v) return;
    onEmailSubmit?.(v);   // App persists it (fire-and-forget)
    setEmailSaved(true);
  };
  const copy = () => {
    navigator.clipboard?.writeText(d.emailSummary || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  // Build a pre-filled email: recipient, subject, and the summary as the body.
  const emailHref = () => {
    const company = (d.company && d.company !== "Your product") ? d.company : "";
    const subject = `Impact discovery follow-up${company ? " — " + company : ""}`;
    const body =
      (d.emailSummary || "") +
      "\n\n---\nSent from Cobalt's Impact Discovery tool.";
    return `mailto:${COBALT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Generate a clean, laid-out PDF of the deliverable (client-side, no server).
  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 54;
    const contentW = pageW - margin * 2;
    let y = margin;

    const COBALT_RGB = [59, 130, 246];
    const AMBER_RGB = [217, 119, 6];
    const INK_RGB = [31, 41, 55];
    const GRAY_RGB = [107, 114, 128];
    const GREEN_RGB = [21, 128, 61];

    const ensureSpace = (needed) => {
      if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
    };
    // jsPDF's Helvetica can't render many Unicode glyphs (arrows, en/em dashes,
    // smart quotes, bullets) and mangles line spacing when it hits them. Convert
    // any such characters to safe ASCII before drawing. Applied to EVERY string.
    const asciiSafe = (s) =>
      String(s == null ? "" : s)
        .replace(/[\u2192\u2794\u27A1\u2B95]/g, "->")   // arrows
        .replace(/[\u2190]/g, "<-")
        .replace(/[\u2013\u2014]/g, "-")                 // en/em dash
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")     // smart single quotes
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')     // smart double quotes
        .replace(/[\u2022\u25CF\u25AA\u00B7]/g, "-")     // bullets / middots
        .replace(/[\u2026]/g, "...")                      // ellipsis
        .replace(/[^\x00-\x7F]/g, "");                    // drop anything else non-ASCII

    const text = (str, x, opts = {}) => {
      const { size = 10, color = INK_RGB, style = "normal", maxW = contentW, lh = 1.35 } = opts;
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(asciiSafe(str), maxW);
      lines.forEach((ln) => {
        ensureSpace(size * lh);
        doc.text(ln, x, y);
        y += size * lh;
      });
      return lines.length;
    };
    const gap = (h) => { y += h; };

    // Header
    text("Cobalt Impact Discovery", margin, { size: 9, color: COBALT_RGB, style: "bold" });
    gap(4);
    text(d.company && d.company !== "Your product" ? d.company : "Your product", margin, { size: 18, color: INK_RGB, style: "bold" });
    gap(2);
    text(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), margin, { size: 9, color: GRAY_RGB });
    gap(6);
    doc.setDrawColor(COBALT_RGB[0], COBALT_RGB[1], COBALT_RGB[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);
    gap(14);
    // Reflected summary of the founder's solution (orientation at the top of the report).
    if (d.reflectBack) {
      text(d.reflectBack, margin, { size: 10, color: INK_RGB, style: "italic", lh: 1.4 });
      gap(14);
    }
    // Highest-priority call: an independent third-party causal study (offset above everything else).
    if (d.causalStudy?.isTopPriority) {
      text("HIGHEST PRIORITY", margin, { size: 8, color: COBALT_RGB, style: "bold" });
      gap(3);
      text("Commission an independent, third-party causal impact study", margin, { size: 13, color: INK_RGB, style: "bold" });
      gap(3);
      if (d.causalStudy.rationale) {
        text(d.causalStudy.rationale, margin, { size: 10, color: INK_RGB, lh: 1.4 });
        gap(3);
      }
      text("Next step: book a 30-minute study scoping call with Cobalt (calendly.com/clark-cobaltcollective). Cobalt will help you scope the study and choose an evaluator. This is different work from the internal measurement below.", margin, { size: 9, color: GRAY_RGB });
      gap(14);
    }
    if (d.problemStatement) {
      text(`Problem it aims to solve: ${d.problemStatement}`, margin, { size: 9, color: GRAY_RGB, style: "italic" });
      gap(10);
    }

    // Impact Process Model
    text("Draft Impact Process Model", margin, { size: 13, color: INK_RGB, style: "bold" });
    gap(4);
    // Legend with drawn circles (Helvetica can't render ● reliably).
    const legendBaseY = y;
    doc.setFillColor(COBALT_RGB[0], COBALT_RGB[1], COBALT_RGB[2]);
    doc.circle(margin + 3, legendBaseY - 3, 2.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GRAY_RGB[0], GRAY_RGB[1], GRAY_RGB[2]);
    doc.text("Understood", margin + 10, legendBaseY);
    doc.setFillColor(AMBER_RGB[0], AMBER_RGB[1], AMBER_RGB[2]);
    doc.circle(margin + 95, legendBaseY - 3, 2.5, "F");
    doc.text("Assumed / untested", margin + 102, legendBaseY);
    y += 8 * 1.35;
    gap(8);
    const chainNodes = [
      ["PRODUCT", m.product],
      [m.implementationMechanism?.label || "", null],
      ["USER BEHAVIOR", m.userBehavior],
      [m.interventionMechanism?.label || "", null],
      ["OUTCOME", m.outcome],
    ];
    chainNodes.forEach(([label, node]) => {
      if (node === null) {
        // Mechanism connector: small drawn triangle + wrapped italic text within margins.
        ensureSpace(14);
        doc.setFillColor(GRAY_RGB[0], GRAY_RGB[1], GRAY_RGB[2]);
        const ty = y - 3;
        doc.triangle(margin + 8, ty - 2.5, margin + 8, ty + 2.5, margin + 12, ty, "F");
        text(label, margin + 18, { size: 9, color: GRAY_RGB, style: "italic", maxW: contentW - 18 });
        gap(3);
      } else {
        const c = node?.status === "confirmed" ? COBALT_RGB : AMBER_RGB;
        ensureSpace(40);
        doc.setDrawColor(c[0], c[1], c[2]);
        doc.setLineWidth(1.2);
        const boxTop = y;          // top border sits here
        gap(11);                    // interior top padding: push label down clear of the border
        text(label, margin + 8, { size: 7.5, color: c, style: "bold", maxW: contentW - 16 });
        gap(2);
        text(node?.label || "-", margin + 8, { size: 10.5, color: INK_RGB, maxW: contentW - 16 });
        gap(7);                     // interior bottom padding
        const boxBottom = y;
        doc.rect(margin, boxTop, contentW, boxBottom - boxTop);
        gap(9);                     // spacing to next element
      }
    });
    gap(8);

    // Assessment (qualitative bands + strengths/opportunities; no numeric scores)
    const asmt = d.assessment || {};
    const clr = asmt.clarity || {};
    const cap = asmt.capacity || {};
    text("Assessment", margin, { size: 11, color: INK_RGB, style: "bold" });
    gap(6);
    // Clarity
    text(`Causal model clarity — ${clr.band || "—"}`, margin, { size: 9.5, color: INK_RGB, style: "bold" });
    if (clr.strength) { gap(2); text(`Strength: ${clr.strength}`, margin, { size: 9, color: GREEN_RGB }); }
    if (clr.opportunity) { gap(1); text(`Opportunity: ${clr.opportunity}`, margin, { size: 9, color: COBALT_RGB, style: "italic" }); }
    gap(8);
    // Capacity — three components read independently
    text("Measurement capacity", margin, { size: 9.5, color: INK_RGB, style: "bold" });
    const focus = (cap.focusArea || "").toLowerCase();
    const capRows = [
      ["Analytic skill", cap.analyticSkill, "analytic skill"],
      ["Data infrastructure", cap.dataInfrastructure, "data infrastructure"],
      ["Budget", cap.budget, "budget"],
    ];
    capRows.forEach(([label, comp, key]) => {
      const c = comp || {};
      const isFocus = focus === key;
      gap(3);
      text(`${label} — ${c.band || "—"}${isFocus ? "  (where to focus)" : ""}`, margin + 8, {
        size: 9, color: isFocus ? AMBER_RGB : INK_RGB, style: "bold", maxW: contentW - 8,
      });
      if (c.strength) { gap(1); text(`Strength: ${c.strength}`, margin + 8, { size: 8.5, color: GRAY_RGB, maxW: contentW - 8 }); }
      if (c.opportunity) { gap(1); text(`Opportunity: ${c.opportunity}`, margin + 8, { size: 8.5, color: COBALT_RGB, style: "italic", maxW: contentW - 8 }); }
    });
    gap(14);

    // Evidence-demand fit
    if (d.evidence?.demandFit) {
      ensureSpace(64);
      text("How well your evidence matches what others expect", margin, { size: 11, color: INK_RGB, style: "bold" });
      gap(4);
      if (d.evidence?.audience || d.evidence?.standard) {
        const bits = [];
        if (d.evidence.audience) bits.push(`Who needs it: ${d.evidence.audience}`);
        if (d.evidence.standard) bits.push(`Bar of proof: ${d.evidence.standard}`);
        text(bits.join("   ·   "), margin, { size: 8.5, color: GRAY_RGB });
        gap(3);
      }
      text(d.evidence.demandFit, margin, { size: 9.5, color: INK_RGB, lh: 1.4 });
      gap(14);
    }

    // Opportunities (subordinated when a causal study is the headline recommendation)
    text(d.causalStudy?.isTopPriority ? "Supporting measurement, secondary to the study" : "Where measurement could help", margin, { size: 13, color: INK_RGB, style: "bold" });
    gap(8);
    if (d.causalStudy?.isTopPriority && (!d.opportunities || d.opportunities.length === 0)) {
      text("No separate internal measurement opportunities surfaced — which is what we'd expect here. Your theory of change is clear and the decisive question is causal. The study is the work; everything else can wait for its findings.", margin, { size: 9.5, color: INK_RGB, lh: 1.4 });
      gap(8);
    }
    (d.opportunities || []).forEach((o, i) => {
      ensureSpace(56);
      const badge = `[${(o.impact || o.lift || "")} impact]`;
      text(`${i + 1}. ${o.title}   ${badge}`, margin, { size: 10.5, color: INK_RGB, style: "bold" });
      gap(2);
      text(`"${o.question}"`, margin + 12, { size: 9.5, color: [55, 65, 81], style: "italic", maxW: contentW - 12 });
      gap(1);
      text(o.rationale || "", margin + 12, { size: 9, color: GRAY_RGB, maxW: contentW - 12 });
      if (Array.isArray(o.examples) && o.examples.length > 0) {
        gap(3);
        text("How you could measure it:", margin + 12, { size: 8.5, color: COBALT_RGB, style: "bold", maxW: contentW - 12 });
        o.examples.forEach((ex) => {
          gap(1);
          text(`-  ${ex}`, margin + 18, { size: 8.5, color: [55, 65, 81], maxW: contentW - 18 });
        });
      }
      if (o.decision) {
        gap(3);
        text(`If you learned this: ${o.decision}`, margin + 12, { size: 8.5, color: GREEN_RGB, style: "italic", maxW: contentW - 12 });
      }
      gap(8);
    });
    gap(6);

    // CTA summary — a causal-study report routes to a scoping call, not the email draft.
    ensureSpace(72);
    if (d.causalStudy?.isTopPriority) {
      text("Your next step", margin, { size: 11, color: COBALT_RGB, style: "bold" });
      gap(4);
      text("Book a 30-minute study scoping call with Cobalt at calendly.com/clark-cobaltcollective. Cobalt will help you scope an independent causal study and choose an evaluator.", margin, { size: 9.5, color: INK_RGB, lh: 1.4 });
      gap(14);
    } else {
      text("Get help turning this plan into reality", margin, { size: 11, color: COBALT_RGB, style: "bold" });
      gap(4);
      text("Cobalt Collective helps early-stage education, health, and workforce teams build impact measurement into operations to make effective solutions that serve their users well.", margin, { size: 8.5, color: GRAY_RGB });
      gap(6);
      text("Book a meeting with Cobalt at calendly.com/clark-cobaltcollective — a member of the team will help you turn this into a plan. No cost, no obligation.", margin, { size: 9.5, color: COBALT_RGB, style: "bold" });
      gap(14);
    }
    text("This is a draft starting point, not a verdict. Cobalt builds these out with you.", margin, { size: 8, color: GRAY_RGB, style: "italic" });

    const safeName = (d.company && d.company !== "Your product" ? d.company : "impact-model")
      .replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "");
    doc.save(`cobalt-${safeName}.pdf`);
  };

  // Download the full conversation transcript (reasoning trail, including the
  // user's own answers) as a PDF.
  const downloadTranscript = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 54;
    const contentW = pageW - margin * 2;
    let y = margin;

    const COBALT_RGB = [59, 130, 246];
    const INK_RGB = [31, 41, 55];
    const GRAY_RGB = [107, 114, 128];

    // jsPDF's Helvetica mangles many Unicode characters; convert to ASCII first.
    const asciiSafe = (str) =>
      String(str == null ? "" : str)
        .replace(/[→➔➡⮕]/g, "->")
        .replace(/[←]/g, "<-")
        .replace(/[–—]/g, "-")
        .replace(/[‘’‚‛]/g, "'")
        .replace(/[“”„‟]/g, '"')
        .replace(/[•●▪·]/g, "-")
        .replace(/[…]/g, "...");

    const ensureSpace = (needed) => {
      if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
    };
    const draw = (str, { size = 10, color = INK_RGB, style = "normal", indent = 0 } = {}) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      const wrapped = doc.splitTextToSize(asciiSafe(str), contentW - indent);
      wrapped.forEach((ln) => {
        ensureSpace(size * 1.35);
        doc.text(ln, margin + indent, y);
        y += size * 1.35;
      });
    };

    draw("Cobalt Impact Discovery - conversation transcript", { size: 14, color: INK_RGB, style: "bold" });
    y += 4;
    draw(new Date().toLocaleString(), { size: 9, color: GRAY_RGB });
    y += 12;

    (messages || []).forEach((mm) => {
      const isUser = mm.role === "user";
      y += 6;
      draw(isUser ? "You" : "Guide", { size: 9.5, color: isUser ? INK_RGB : COBALT_RGB, style: "bold" });
      y += 1;
      draw(mm.content || "", { size: 10, color: INK_RGB });
    });

    const safeName = (d.company && d.company !== "Your product" ? d.company : "impact-model")
      .replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "");
    doc.save(`cobalt-${safeName}-conversation.pdf`);
  };

  const m = d.model || {};
  const assessment = d.assessment || {};
  const clarity = assessment.clarity || {};
  const capacity = assessment.capacity || {};
  return (
    <div className="space-y-6">
      {d.causalStudy?.isTopPriority && (
        <div className="rounded-xl p-4" style={{ border: `2px solid ${COBALT}`, background: "#F4F8FE" }}>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ color: "#1D4ED8", background: "#DBEAFE" }}>
            ⚑ Highest priority
          </span>
          <h2 className="text-lg font-bold mt-2 mb-1" style={{ color: INK }}>Commission an independent, third-party causal impact study</h2>
          {d.causalStudy.rationale && (
            <p className="text-sm leading-relaxed mb-3" style={{ color: "#374151" }}>{d.causalStudy.rationale}</p>
          )}
          <a
            href={COBALT_CALENDLY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white"
            style={{ background: COBALT }}
          >
            📅 Book a 30-minute study scoping call
          </a>
          <p className="text-[12px] mt-2" style={{ color: "#4B5563" }}>Cobalt will help you scope the study and choose an evaluator. This is different work from the internal measurement below.</p>
        </div>
      )}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold mb-1" style={{ color: INK }}>Draft Impact Process Model</h2>
          <div className="shrink-0 flex items-center gap-1.5">
            {messages && messages.length > 0 && (
              <button
                onClick={downloadTranscript}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border"
                style={{ color: COBALT, borderColor: "#BFDBFE", background: "white" }}
                title="Download the full conversation transcript as a PDF"
              >
                ⬇ Download conversation
              </button>
            )}
            <button
              onClick={downloadPdf}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border"
              style={{ color: COBALT, borderColor: "#BFDBFE", background: "white" }}
              title="Download a PDF copy to keep"
            >
              ⬇ Download PDF
            </button>
          </div>
        </div>
        <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
          <StatusDot status="confirmed" />Understood · <StatusDot status="assumed" />Assumed / untested
        </p>
        <div className="flex flex-col bg-slate-50 rounded-xl p-4">
          <Node data={m.product} label="Product" />
          <Connector data={m.implementationMechanism} />
          <Node data={m.userBehavior} label="User Behavior" />
          <Connector data={m.interventionMechanism} />
          <Node data={m.outcome} label="Outcome" />
        </div>
        {d.problemStatement && (
          <p className="text-[11px] mt-2" style={{ color: "#9CA3AF" }}>
            <span className="font-semibold" style={{ color: "#6B7280" }}>Problem it aims to solve:</span> {d.problemStatement}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: INK }}>Causal model clarity</div>
            <BandChip band={clarity.band} />
          </div>
          <StrengthOpp strength={clarity.strength} opportunity={clarity.opportunity} />
          <button onClick={() => toggleRubric("clarity")} className="mt-2 text-[11px] font-semibold" style={{ color: COBALT }}>
            {rubric.clarity ? "Hide bands ▴" : "What the bands mean ▾"}
          </button>
          {rubric.clarity && <BandLadder bands={CLARITY_BANDS} current={clarity.band} />}
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: INK }}>Measurement capacity</div>
          <div className="space-y-2.5">
            {Object.entries(CAPACITY_BANDS).map(([name, { key }]) => {
              const comp = capacity[key] || {};
              const isFocus = (assessment.capacity?.focusArea || "").toLowerCase() === name.toLowerCase();
              return (
                <div key={key}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold" style={{ color: isFocus ? AMBER : INK }}>
                      {name}{isFocus ? " · where to focus" : ""}
                    </span>
                    <BandChip band={comp.band} />
                  </div>
                  <StrengthOpp strength={comp.strength} opportunity={comp.opportunity} />
                </div>
              );
            })}
          </div>
          <button onClick={() => toggleRubric("capacity")} className="mt-2 text-[11px] font-semibold" style={{ color: COBALT }}>
            {rubric.capacity ? "Hide bands ▴" : "What the bands mean ▾"}
          </button>
          {rubric.capacity && (
            <div className="mt-1.5 space-y-2">
              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>Each component is read on its own — there's no single capacity number.</p>
              {Object.entries(CAPACITY_BANDS).map(([name, { key, bands }]) => {
                const cur = capacity[key]?.band;
                return (
                  <div key={key}>
                    <div className="text-[11px] font-semibold" style={{ color: INK }}>{name}</div>
                    <BandLadder bands={bands} current={cur} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {(d.evidence?.demandFit || d.evidence?.standard) && (
        <div className="rounded-xl border p-4" style={{ borderColor: "#BFDBFE", background: "#F8FAFF" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: INK }}>How well your evidence matches what others expect</div>
          {(d.evidence?.audience || d.evidence?.standard) && (
            <p className="text-[11px] mb-1.5" style={{ color: "#6B7280" }}>
              {d.evidence?.audience && <>Who needs it: <span style={{ color: "#4B5563" }}>{d.evidence.audience}</span></>}
              {d.evidence?.audience && d.evidence?.standard && " · "}
              {d.evidence?.standard && <>Bar of proof: <span style={{ color: "#4B5563" }}>{d.evidence.standard}</span></>}
            </p>
          )}
          {d.evidence?.demandFit && <p className="text-sm" style={{ color: "#374151" }}>{d.evidence.demandFit}</p>}
          <p className="text-[11px] mt-2 italic" style={{ color: "#9CA3AF" }}>
            Whether the evidence you can realistically produce matches what your buyer or funder expects — a read, not a score.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: INK }}>
          {d.causalStudy?.isTopPriority ? "Supporting measurement, secondary to the study" : "Where measurement could help"}
        </h2>
        <p className="text-xs mb-3" style={{ color: "#9CA3AF" }}>
          {d.causalStudy?.isTopPriority
            ? "These strengthen your practice and can inform the study, but they don't replace it — and shouldn't delay it."
            : "Tap a question to see why it matters and an example of how you could measure it."}
        </p>
        {d.causalStudy?.isTopPriority && (!d.opportunities || d.opportunities.length === 0) && (
          <p className="text-sm leading-relaxed" style={{ color: "#4B5563" }}>
            No separate internal measurement opportunities surfaced — which is what we'd expect here. Your theory of change is clear and the decisive question is causal. The study is the work; everything else can wait for its findings.
          </p>
        )}
        <div className="space-y-2">
          {(d.opportunities || []).map((o, i) => {
            const isOpen = !!expanded[i];
            const hasExamples = Array.isArray(o.examples) && o.examples.length > 0;
            return (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden transition-colors hover:border-blue-300">
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-3 flex flex-col gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="text-xs mt-0.5 shrink-0"
                        style={{ color: COBALT, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
                        aria-hidden="true"
                      >▾</span>
                      <span className="font-semibold text-sm" style={{ color: INK }}>{i + 1}. {o.question}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border"
                        style={impactChipStyle(o.impact || o.lift)}>{o.impact || o.lift} impact</span>
                    </div>
                  </div>
                  {!isOpen && (
                    <div className="pl-6 flex items-center gap-1 text-[11px] font-semibold" style={{ color: COBALT }}>
                      <span>How to measure it</span>
                      <span aria-hidden="true">▾</span>
                    </div>
                  )}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pl-9 space-y-2">
                    <p className="text-xs" style={{ color: "#6B7280" }}>{o.rationale}</p>
                    {hasExamples && (
                      <div className="rounded-lg p-2.5" style={{ background: "#F8FAFC" }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: COBALT }}>How you could measure it</div>
                        <ul className="space-y-1">
                          {o.examples.map((ex, j) => (
                            <li key={j} className="text-xs flex gap-1.5" style={{ color: "#374151" }}>
                              <span style={{ color: "#9CA3AF" }}>•</span>
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {o.decision && (
                      <div className="rounded-lg p-2.5" style={{ background: "#F0FDF4" }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#15803D" }}>If you learned this</div>
                        <p className="text-xs" style={{ color: "#374151" }}>{o.decision}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!d.causalStudy?.isTopPriority && (
      <div className="rounded-xl p-4" style={{ background: "#EFF4FF" }}>
        <div className="text-[15px] font-bold" style={{ color: INK }}>Get help turning this plan into reality</div>
        <p className="text-[12px] leading-relaxed mt-1 mb-3" style={{ color: "#4B5563" }}>
          Cobalt Collective helps early-stage education, health, and workforce teams build impact measurement into operations to make effective solutions that serve their users well.
        </p>
        <a
          href={COBALT_CALENDLY}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white"
          style={{ background: COBALT }}
        >
          📅 Book a meeting with Cobalt
        </a>
        <p className="text-[12px] mt-3" style={{ color: "#4B5563" }}>
          Book a short call — a member of the Cobalt team will help you turn this into a plan. No cost, no obligation.
        </p>
      </div>
      )}

      <p className="text-[11px] text-center" style={{ color: "#9CA3AF" }}>This is a draft starting point, not a verdict. Cobalt builds these out with you.</p>
    </div>
  );
}

// Shown when the guide determines an org is outside Cobalt's education/health/
// workforce focus. A warm dead-end — no assessment, no CTA — plus a safety
// valve that resumes the chat if the guide misjudged the fit.
function Offramp({ onResume }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#EFF4FF" }}>
      <div className="text-[15px] font-bold" style={{ color: INK }}>
        This tool is built for a different focus
      </div>
      <p className="text-[12px] leading-relaxed mt-1 mb-3" style={{ color: "#4B5563" }}>
        Cobalt Collective works with early-stage education, health, and workforce
        teams, so this discovery isn't the right fit for your work. Thanks for
        stopping by.
      </p>
      <button onClick={onResume} className="text-[12px] font-semibold" style={{ color: COBALT }}>
        Actually, my work is in education, health, or workforce — keep going
      </button>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deliverable, setDeliverable] = useState(null);
  const [outOfScope, setOutOfScope] = useState(false); // guide bounced an out-of-scope org
  const [listening, setListening] = useState(false);   // voice input: mic actively capturing
  const recognitionRef = useRef(null);
  const [speakingIdx, setSpeakingIdx] = useState(null); // which guide turn is being read aloud

  // Read one guide turn aloud on demand (accessibility). Click the same one again to stop.
  const speakMessage = (idx, textToSpeak) => {
    if (!TTS_OK || !textToSpeak) return;
    window.speechSynthesis.cancel();
    if (speakingIdx === idx) { setSpeakingIdx(null); return; }
    const u = new SpeechSynthesisUtterance(textToSpeak);
    u.onend = () => setSpeakingIdx((cur) => (cur === idx ? null : cur));
    u.onerror = () => setSpeakingIdx((cur) => (cur === idx ? null : cur));
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(u);
  };

  // Dictate an answer into the composer (Chrome/Edge; silently absent where unsupported).
  const toggleMic = () => {
    if (!SpeechRecognitionImpl) return;
    if (listening) { try { recognitionRef.current?.stop(); } catch (e) {} return; }
    const rec = new SpeechRecognitionImpl();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setInput(txt);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try { rec.start(); } catch (e) { setListening(false); }
  };
  const [error, setError] = useState("");
  const [reviewer, setReviewer] = useState("");      // reviewer name/initials
  const [started, setStarted] = useState(false);     // false until name entered
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");   // email gate
  const [tosAccepted, setTosAccepted] = useState(false);
  const [gateStep, setGateStep] = useState("form");   // "form" -> "code"
  const [codeInput, setCodeInput] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState("");
  const [devCode, setDevCode] = useState("");         // shown only in local dev (no mail provider)
  const [phase, setPhase] = useState(0); // 0 getting started, 1 how it works, 2 making it happen, 3 your results
  const [sessionId] = useState(() => "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
  // Capture where the visitor came from, once, on load — passive, no user action.
  const [meta] = useState(() => {
    if (typeof window === "undefined") return { referrer: "", utm: "" };
    const p = new URLSearchParams(window.location.search);
    const utm = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
      .map((k) => (p.get(k) ? `${k}=${p.get(k)}` : null))
      .filter(Boolean)
      .join("&");
    return { referrer: document.referrer || "", utm };
  });
  const scrollRef = useRef(null);
  const deliverableRef = useRef(null);

  useEffect(() => {
    // When the deliverable appears, scroll to its TOP so the user sees the
    // model first (not auto-scrolled past it). Otherwise keep the chat pinned
    // to the newest message.
    if (deliverable) {
      deliverableRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    } else {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading, deliverable, generating]);

  // Core send. Accepts the text directly so quick-pick option buttons and the
  // free-text box share one path. Passing a string (from an option chip) is
  // treated the same as a typed answer.
  const submit = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    setError("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    // First founder answer moves us out of "Getting started" into "How it works".
    setPhase((p) => (p < 1 ? 1 : p));
    try {
      let reply = await callClaude("convo", next);
      if (reply.includes("[[CAPACITY]]")) {
        reply = reply.replace(/\[\[CAPACITY\]\]/g, "").trim();
        setPhase((p) => (p < 2 ? 2 : p));
      }
      if (reply.includes("[[READY]]")) {
        reply = reply.replace(/\[\[READY\]\]/g, "").trim();
        setReady(true);
        setPhase((p) => (p < 2 ? 2 : p)); // ensure at least capacity phase by the time we're ready
      }
      if (reply.includes("[[OUTOFSCOPE]]")) {
        reply = reply.replace(/\[\[OUTOFSCOPE\]\]/g, "").trim();
        setOutOfScope(true);
        saveSignal("out_of_scope"); // count the bounce (no transcript logged)
      }
      // Quick-pick options: the guide may append a final line "[[OPTIONS]] a | b | c".
      // Pull them off the visible text and attach them to the message so we can
      // render clickable chips. Free-text answering always remains available.
      let options = [];
      const optMatch = reply.match(/\[\[OPTIONS\]\]([^\n]*)/);
      if (optMatch) {
        options = optMatch[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 4);
        reply = reply.replace(/\[\[OPTIONS\]\][^\n]*/g, "").trim();
      }
      setMessages([...next, { role: "assistant", content: reply, options }]);
    } catch (e) {
      setError(e.code === 429 ? (e.message || "You've reached today's limit — please come back tomorrow.") : "Something hiccuped. Try sending that again.");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };
  const send = () => submit();

  // Silently persist the full session to the Google Sheet (fire-and-forget).
  const saveSession = async (model) => {
    try {
      await fetch("/.netlify/functions/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          sessionId,
          reviewer,
          timestamp: new Date().toISOString(),
          messageCount: messages.length,
          transcript: messages.map((m) => `${m.role === "user" ? "FOUNDER" : "GUIDE"}: ${m.content}`).join("\n\n"),
          model,
        }),
      });
    } catch (e) {
      /* never block the user on a logging failure */
    }
  };

  // Log a lightweight signal (traffic source, or a volunteered email) to a separate
  // "Signals" tab so it never collides with the Sheet1 session columns. Fire-and-forget.
  const saveSignal = async (kind, extra = {}) => {
    try {
      await fetch("/.netlify/functions/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          type: "signal",
          kind,
          sessionId,
          reviewer,
          timestamp: new Date().toISOString(),
          referrer: meta.referrer,
          utm: meta.utm,
          email: extra.email || "",
        }),
      });
    } catch (e) {
      /* never block the user */
    }
  };
  const saveEmail = (email) => saveSignal("email", { email });

  // --- Email gate: request a 6-digit code, then verify it for a token. ---
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const gateReady = EMAIL_RE.test(emailInput.trim()) && nameInput.trim() && tosAccepted;

  const requestCode = async () => {
    if (!gateReady || gateBusy) return;
    setGateBusy(true); setGateError("");
    try {
      const res = await fetch("/.netlify/functions/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send the code.");
      if (data.devCode) setDevCode(data.devCode);
      setGateStep("code");
    } catch (e) {
      setGateError(e.message || "Couldn't send the code. Try again.");
    } finally {
      setGateBusy(false);
    }
  };

  const submitCode = async () => {
    if (!/^\d{6}$/.test(codeInput.trim()) || gateBusy) return;
    setGateBusy(true); setGateError("");
    try {
      const res = await fetch("/.netlify/functions/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim(), code: codeInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      AUTH_TOKEN = data.token;              // gate passed — token now sent on every call
      setReviewer(nameInput.trim());
      setStarted(true);
    } catch (e) {
      setGateError(e.message || "Verification failed. Try again.");
    } finally {
      setGateBusy(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const transcript = messages.map((m) => `${m.role === "user" ? "FOUNDER" : "GUIDE"}: ${m.content}`).join("\n\n");
      const parseJson = (raw, label) => {
        try {
          const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
          return JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
        } catch (err) {
          console.error(`[generate] JSON parse failed for "${label}". Raw response was:`, raw);
          throw err;
        }
      };
      // Split into two calls so neither one runs long enough to hit Netlify's request timeout.
      // Call 1: causal model + maturity scores.
      const modelRaw = await callClaude(
        "model",
        [{ role: "user", content: `Discovery conversation:\n\n${transcript}\n\nProduce the model + maturity JSON.` }],
      );
      const modelPart = parseJson(modelRaw, "model");
      // Call 2: opportunities, grounded in the model + capacity scores from call 1 (keeps examples calibrated).
      const oppsRaw = await callClaude(
        "opps",
        [{ role: "user", content: `Discovery conversation:\n\n${transcript}\n\nDerived causal model and qualitative assessment:\n\n${JSON.stringify({ model: modelPart.model, assessment: modelPart.assessment })}\n\nProduce the opportunities JSON.` }],
      );
      const oppsPart = parseJson(oppsRaw, "opportunities");
      const parsed = { ...modelPart, ...oppsPart };
      setDeliverable(parsed);
      setPhase(3); // Your results
      saveSession(parsed); // observability: log the full session for reviewer feedback
      saveSignal("source"); // capture where this visitor came from (referrer/UTM)

    } catch (e) {
      console.error("[generate] failed:", e);
      setError(e.code === 429 ? (e.message || "You've reached today's completion limit — please come back tomorrow.") : "Couldn't assemble the model — try generating once more.");
    } finally {
      setGenerating(false);
    }
  };

  const restart = () => {
    try { recognitionRef.current?.stop(); } catch (e) {}
    if (TTS_OK) window.speechSynthesis.cancel();
    setListening(false);
    setSpeakingIdx(null);
    setMessages([{ role: "assistant", content: GREETING }]);
    setReady(false);
    setDeliverable(null);
    setOutOfScope(false);
    setError("");
    setInput("");
    setStarted(false);
    setNameInput("");
    setPhase(0);
  };

  // Dev-only shortcut (URL ?dev=1): skip the manual chat and jump straight to Generate
  // with a full sample conversation preloaded. Never shown to real users.
  const devMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dev") === "1";
  const loadDevConversation = () => {
    setReviewer("DEV");
    setStarted(true);
    setMessages(DEV_TRANSCRIPT);
    setReady(true);
    setPhase(2);
    setDeliverable(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center p-3 sm:p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: "88vh" }}>
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <CobaltLogo size={34} />
            <div>
              <div className="font-bold text-sm" style={{ color: INK }}>Cobalt Collective</div>
              <div className="text-[11px]" style={{ color: "#9CA3AF" }}>Impact Discovery</div>
            </div>
          </div>
          {(deliverable || messages.length > 1) && (
            <button onClick={restart} className="text-[11px] font-medium" style={{ color: COBALT }}>Start over</button>
          )}
        </div>

        {started && <PhaseTracker phase={phase} />}

        {!started ? (
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-8 py-8 text-center">
            <CobaltLogo size={48} />
            <h2 className="mt-4 text-xl font-bold leading-tight max-w-md" style={{ color: INK }}>Want to measure your solution's impact but not sure where to start?</h2>
            <p className="mt-3 text-sm max-w-md" style={{ color: "#4B5563" }}>
              Complete a free, 10-minute guided conversation designed for early-stage education, health, and workforce teams. Talk through how your solution works, and walk away with a plan you can keep -- no obligations.
            </p>
            <div className="mt-4 w-full max-w-sm text-left rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: COBALT }}>What you'll walk away with</div>
              <ul className="space-y-1.5 text-[12px] leading-snug" style={{ color: "#4B5563" }}>
                <li>&bull; <span style={{ color: INK, fontWeight: 600 }}>A draft impact model</span> — how your solution is designed to make good things happen.</li>
                <li>&bull; <span style={{ color: INK, fontWeight: 600 }}>A prioritized measurement plan</span> — concrete steps to measure your impact and how each can help.</li>
                <li>&bull; <span style={{ color: INK, fontWeight: 600 }}>A shareable summary</span> — a brief report to keep or send to your team, a funder, or a buyer.</li>
                <li>&bull; <span style={{ color: INK, fontWeight: 600 }}>The option to go deeper</span> — an invitation to speak with the Cobalt team to discuss how we can help.</li>

              </ul>
            </div>
            {gateStep === "form" ? (
              <div className="mt-4 w-full max-w-xs flex flex-col items-stretch gap-2.5">
                <p className="text-[11px]" style={{ color: "#9CA3AF" }}>Enter your details to begin — we'll email a 6-digit code to verify your address.</p>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name or initials"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-center focus:outline-none focus:ring-2"
                  style={{ color: INK }}
                />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") requestCode(); }}
                  placeholder="you@organization.org"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-center focus:outline-none focus:ring-2"
                  style={{ color: INK }}
                />
                <label className="flex items-start gap-2 text-left text-[11px] leading-snug px-1" style={{ color: "#6B7280" }}>
                  <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} className="mt-0.5" />
                  <span>
                    I agree to the <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: COBALT }}>Terms of Service</a> and <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: COBALT }}>Privacy Policy</a>, and confirm I am a human and not using automated tools.
                  </span>
                </label>
                <button
                  onClick={requestCode}
                  disabled={!gateReady || gateBusy}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: COBALT }}
                >
                  {gateBusy ? "Sending…" : "Email me a code →"}
                </button>
              </div>
            ) : (
              <div className="mt-4 w-full max-w-xs flex flex-col items-stretch gap-2.5">
                <p className="text-[12px]" style={{ color: "#6B7280" }}>
                  We emailed a 6-digit code to <span style={{ color: INK, fontWeight: 600 }}>{emailInput.trim()}</span>.
                </p>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === "Enter") submitCode(); }}
                  placeholder="------"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-[18px] tracking-[0.4em] focus:outline-none focus:ring-2"
                  style={{ color: INK }}
                />
                {devCode && (
                  <p className="text-[11px]" style={{ color: "#9CA3AF" }}>dev: code is {devCode}</p>
                )}
                <button
                  onClick={submitCode}
                  disabled={!/^\d{6}$/.test(codeInput) || gateBusy}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: COBALT }}
                >
                  {gateBusy ? "Verifying…" : "Verify & start →"}
                </button>
                <button
                  onClick={() => { setGateStep("form"); setCodeInput(""); setDevCode(""); setGateError(""); }}
                  className="text-[11px] underline"
                  style={{ color: "#9CA3AF" }}
                >
                  ← Use a different email / resend
                </button>
              </div>
            )}
            {gateError && <p className="mt-3 text-[12px]" style={{ color: AMBER }}>{gateError}</p>}
            {devMode && (
              <button
                onClick={loadDevConversation}
                className="mt-4 text-[11px] underline"
                style={{ color: "#9CA3AF" }}
              >
                Load sample conversation (dev) →
              </button>
            )}
          </div>
        ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          {!deliverable && messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end pl-10" : "justify-start pr-10"}`}>
              <div className="max-w-[78%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap"
                style={m.role === "user" ? { background: COBALT, color: "white", borderBottomRightRadius: 4 } : { background: "#F3F4F6", color: INK, borderBottomLeftRadius: 4 }}>
                {m.content}
                {m.role !== "user" && TTS_OK && (
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={() => speakMessage(i, m.content)}
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: speakingIdx === i ? COBALT : "#9CA3AF", lineHeight: 0 }}
                      title={speakingIdx === i ? "Stop reading" : "Read aloud"}
                      aria-label={speakingIdx === i ? "Stop reading this response" : "Read this response aloud"}
                    >
                      {speakingIdx === i ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start pr-10">
              <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100 flex items-center gap-2" style={{ borderBottomLeftRadius: 4 }}>
                <CobaltSpinner size={18} />
                <span className="text-[12px]" style={{ color: "#6B7280" }}>thinking…</span>
              </div>
            </div>
          )}

          {/* Quick-pick option chips for the latest guide question. Optional shortcuts —
              the free-text box below always stays available for a fuller answer. */}
          {(() => {
            const last = messages[messages.length - 1];
            const opts = !deliverable && !loading && !outOfScope && last && last.role === "assistant" && Array.isArray(last.options) ? last.options : [];
            if (opts.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2 pr-10">
                {opts.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => submit(opt)}
                    className="text-[13px] px-3 py-1.5 rounded-full border transition-colors hover:bg-blue-50"
                    style={{ color: COBALT, borderColor: "#BFDBFE", background: "white" }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            );
          })()}

          {ready && !deliverable && !generating && (
            <div className="flex justify-center pt-1">
              <button onClick={generate} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm" style={{ background: COBALT }}>
                Generate my Impact Process Model →
              </button>
            </div>
          )}

          {outOfScope && !deliverable && (
            <div className="pt-1"><Offramp onResume={() => setOutOfScope(false)} /></div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <CobaltSpinner size={38} />
              <div className="text-sm" style={{ color: "#6B7280" }}>Mapping your causal chain and measurement opportunities…</div>
            </div>
          )}

          {deliverable && <div ref={deliverableRef}><ErrorBoundary onRetry={generate}><Deliverable d={deliverable} onEmailSubmit={saveEmail} messages={messages} /></ErrorBoundary></div>}

          {error && <div className="text-center text-xs" style={{ color: AMBER }}>{error}</div>}
        </div>
        )}

        {started && !deliverable && !generating && !outOfScope && (
          <div className="border-t border-slate-100 p-3">
            {ready && <p className="text-[11px] text-center mb-2" style={{ color: "#9CA3AF" }}>Want to add anything else before generating? Keep typing, or hit the button above.</p>}
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1} placeholder={listening ? "Listening…" : "Type your answer…"}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2" style={{ color: INK, maxHeight: 120 }} />
              {SpeechRecognitionImpl && (
                <button
                  onClick={toggleMic}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold border shrink-0"
                  style={listening ? { background: "#FEE2E2", color: "#B91C1C", borderColor: "#FCA5A5" } : { background: "white", color: COBALT, borderColor: "#BFDBFE" }}
                  title={listening ? "Stop dictation" : "Dictate your answer"}
                  aria-pressed={listening}
                >
                  {listening ? "● Rec" : "🎤"}
                </button>
              )}
              <button onClick={send} disabled={loading || !input.trim()} className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold disabled:opacity-40" style={{ background: COBALT }}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
