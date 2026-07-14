import React, { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";

// ── Cobalt design system ──
const COBALT = "#3B82F6";
const INK = "#1F2937";
const AMBER = "#D97706";
// Where "Email Cobalt" outreach is sent. Change this to a shared inbox if desired.
const COBALT_EMAIL = "clark@cobaltcollective.org";

// ── Cobalt brand mark, baked in (blue hex "C"). Travels with the app; no upload, no network. ──
const LOGO = "data:image/png;base64,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";

const GREETING =
  "Hi — I'm Cobalt's discovery guide. In a short conversation I'll help you map how your product is meant to create impact, and where measuring it could actually move the needle for you.\n\nThere are no wrong answers, and you can be as rough as you like — I'll ask follow-ups where it helps. At the end, I'll share some ideas about how impact measurement could help your organization, your solution, and your users.\n\nTo start: in a sentence or two, what does your product do, and who uses it?";

const CONVO_SYSTEM = `You are Cobalt Collective's discovery guide, talking with a founder or product lead at an early-stage company in education, health, or workforce. Your job is to run Cobalt's discovery process conversationally and warmly, then hand off to a synthesis step.

CORE FRAMES you are working toward (do not lecture about these — use them to steer your questions):
- Purpose of evidence: understand WHO actually needs evidence about the product and WHAT decision it informs — the team improving the product, a buyer deciding whether to purchase, a funder deciding whether to renew. Surface this naturally through plain questions.
- The causal chain (implementation science): product → [implementation mechanism] → user behavior → [intervention mechanism] → outcome. The implementation mechanism is how the product gets users to actually behave a certain way; user behavior is what users do; the intervention mechanism is why that behavior produces the outcome. Probe where the chain is genuinely understood vs. merely asserted (the gap between behavior and outcome is the classic blind spot).
- Capacity has THREE distinct components, each worth understanding separately: (a) analytic skill — who would own measurement and do they have the research-design chops; (b) data infrastructure — does usable data exist and how organized is it; (c) budget — is there money/staffing for measurement, and is it external grant-dependent or internally committed. These are genuinely different things; get a read on each.

PROCESS (move through these adaptively — if an answer is rich, move on; if thin or vague, ask ONE sharp follow-up):
1. Orientation: what the product is, who the users are, the outcome it's meant to drive.
2. The question behind the question: who needs evidence about the product, and what decision that evidence informs.
3. The causal chain: walk product → user behavior → outcome, and name the two linking mechanisms. Find where it's solid vs. assumed.
4. Disconfirmation (ask this when the founder has articulated a reasonably coherent chain — it's how you tell a well-reasoned theory from a truly rigorous one; skip it only if the chain is still too vague to make the question meaningful): ask, in your own warm phrasing, something like "What would you expect to see if this mechanism ISN'T working the way you think — what data would tell you that?" A founder who can answer this crisply is operating at a higher level than one who can only describe the intended path.
5. Capacity: get a separate read on analytic skill, data infrastructure, and budget — people, data, and money/bandwidth. Don't just find the weakest; understand all three. The FIRST time you turn to this capacity area (people/data/budget), begin that message with the exact tag [[CAPACITY]] on its own, then your message. Output this tag only once per conversation, on the first capacity-focused turn.

STYLE:
- Warm, plain-spoken, curious. One question at a time. Keep turns short (2-4 sentences). No jargon dumps. Reflect back what you heard in their own words before moving on.
- Never use internal framework labels or jargon in the conversation. In particular, do NOT use the words "know" versus "prove" as a framing — ask plainly about who needs evidence and why instead.
- Don't grade them. Don't pad with praise.
- Adapt depth to their answers. A focused founder might need ~6 exchanges; a vaguer one more. Keep the whole thing brief — the disconfirmation question is encouraged where it fits, not a mandatory hoop for every conversation.

WHEN YOU HAVE ENOUGH (a working read on the causal chain, who needs evidence and for what decision, and all three capacity components): give a brief, friendly reflect-back of your understanding in 3-4 sentences, then on its own final line output exactly: [[READY]]
Do not output [[READY]] before you have a real read on all four areas.`;

const SYNTH_SYSTEM = `You are Cobalt Collective's analyst. Read the discovery conversation and produce a draft deliverable as STRICT JSON only — no markdown, no backticks, no preamble.

Use Cobalt's causal chain: product → [implementation mechanism] → user behavior → [intervention mechanism] → outcome. Mark each element "confirmed" if the conversation gave real evidence it's understood, or "assumed" if it's plausible but untested/vague (the honest amber flag).

Keep each label SHORT — a noun phrase of roughly 4-9 words, not a sentence. The mechanism phrases can be a touch longer but stay tight.

=== SCORING — use Cobalt's real 1-5 rubrics. Score the GAP, not the polish. Levels are CUMULATIVE: a company must satisfy every level below to qualify for a level. Anchor on the weakest/first broken link, not the most impressive stated ambition. ===

CLARITY (1-5), single score:
1 Unclear — no clearly identified outcome or mechanism.
2 Outcome only — names an intended outcome, but no user behavior or mechanism specified (outcome is often a restated mission).
3 Behavior named, mechanism vague — names the key user behavior, but the link from behavior to outcome is asserted, not reasoned (a black box).
4 Coherent chain, untested — can articulate product→behavior AND behavior→outcome mechanisms and name the active ingredient; untested, constructs not yet operationalized into measures.
5 Defined and operationalized — constructs concrete enough to measure; the founder can state what data would CONFIRM or DISCONFIRM their own theory. Only score 5 if the transcript shows the founder actually articulating what would disconfirm their theory or what data would tell them they're wrong. If they were never asked or never demonstrated this, cap clarity at 4.

CAPACITY (1-5) — score THREE components INDEPENDENTLY, then average them (arithmetic mean; do NOT take the minimum). Round the average to the nearest tenth.
Analytic skill:
 1 None. 2 Smart engineer, skillset adjacent but not core to impact measurement (IM); IM owner not yet clear. 3 Data-science skill sufficient to run many analyses, IM owner clear, but lacks specific research-design expertise to fully implement an IM plan. 4 Sufficient in-house research/analytic skill to fully implement an IM plan; IM owner clear. 5 Exceptional R&D skill, unusual for the company's stage.
Data infrastructure:
 1 None, or too messy to use. 2 Available but not yet organized. 3 Organized and usable with minimal additional work. 4 Collected and organized for routine IM analyses. 5 Rich, well-organized, transparently useful for internal and external decisions.
Budget (the axis is a STRATEGIC SHIFT from external/grant-dependent → internal ownership; internal commitment outranks secured external grant money, even when the internal commitment is only tentative):
 1 None. 2 Requesting an external, time-limited grant. 3 Obtained commitment for an external, time-limited grant. 4 Internal budget is plausible and an internal owner is identified, but not yet committed. 5 Committed internal budget AND staffing for ongoing IM, with an identified owner.

=== TOOLTIPS — for each score, state specifically what would need to be true to reach ONE level higher, using the rubric anchor language above, not generic encouragement. ===
- clarityNext: one sentence naming the concrete gap between the current clarity level and the next. If at level 5, say the theory is operationalized and name what to sustain.
- For capacity: identify the LOWEST-scoring component (if two tie for lowest, name both). capacityLimiter is that component's name ("analytic skill" | "data infrastructure" | "budget"). capacityNext: one sentence naming what moving that component up one level would look like, in the rubric's terms, and noting it would raise the overall average.

Give 3-5 prioritized measurement opportunities. Each: a plain-English question it answers, type "know" or "prove" (know = evidence that helps the team improve the product; prove = evidence for an external buyer or funder), impact "low"/"medium"/"high" (how much this evidence would matter for the team's most important decisions), and a one-sentence rationale. Order by usefulness.

For each opportunity, also give 1-2 concrete EXAMPLES of how the team could actually measure it, in the "examples" array. Rules for examples:
- SPECIFIC, not generic. Name the actual instrument, comparison, or data source and tie it to THIS product's construct and the data the founder described (e.g., "a 6-item self-report on constructive-disagreement confidence, given at signup and again after 8 weeks, compared against in-app debate-completion logs"). Never write a generic method like "run a pre/post survey" or "do a study" with no specifics.
- ILLUSTRATIVE, not prescriptive. Frame each as one possibility, beginning with phrasing like "One way could be…" or "For example, a team at your stage might…". It is an example of how this could be done, not THE answer.
- CALIBRATED to their measurement capacity score. Do not propose an RCT, a control group, or a data pipeline to a team whose analytic-skill or data-infrastructure score is low; propose the lightest credible design that would still answer the question. Reserve heavier designs for teams whose capacity supports them.
- A SECOND example only when it is a genuinely different tradeoff — e.g., a quick, lightweight read versus a more rigorous design. If a second example would just restate the first, give only one.
- If you cannot state a concrete, specific example for an opportunity, return an empty array for "examples" rather than inventing generic filler.

Keep all text tight. Output ONLY this JSON shape:
{
 "company":"short name or 'Your product'",
 "reflectBack":"2-4 sentence plain-language summary of the founder's solution and situation, in the warm reflect-back voice used at the end of the conversation — what the product does, who it's for, the outcome it drives, and the core evidence question. This is shown at the top of the report as an orientation.",
 "model":{
  "product":{"label":"...","status":"confirmed|assumed"},
  "implementationMechanism":{"label":"short phrase","status":"confirmed|assumed"},
  "userBehavior":{"label":"...","status":"confirmed|assumed"},
  "interventionMechanism":{"label":"short phrase","status":"confirmed|assumed"},
  "outcome":{"label":"...","status":"confirmed|assumed"}
 },
 "maturity":{
  "clarity":1,
  "clarityNote":"one sentence on the current clarity level",
  "clarityNext":"one sentence: what would move clarity up one level",
  "capacity":1.0,
  "capacityComponents":{"analyticSkill":1,"dataInfrastructure":1,"budget":1},
  "capacityNote":"one sentence on the current capacity picture across the three components",
  "capacityLimiter":"analytic skill|data infrastructure|budget",
  "capacityNext":"one sentence: what moving the limiting component up one level would look like"
 },
 "opportunities":[{"title":"...","question":"...","type":"know|prove","impact":"low|medium|high","rationale":"one sentence","examples":["specific, illustrative, capacity-matched way to measure this; 1-2 items, or [] if none can be stated concretely"]}],
 "emailSummary":"3-4 sentence plain-text summary the founder could paste into an email to Cobalt to start a conversation."
}`;

async function callClaude(system, messages, maxTokens) {
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system, messages }),
      });
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      if (text) return text;
    } catch (e) {
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

function MaturityBar({ value, max = 5 }) {
  const v = Number(value) || 0;
  return (
    <div className="flex gap-1 mt-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        // Fractional fill: a segment can be fully, partially, or not filled.
        const fill = Math.max(0, Math.min(1, v - (n - 1)));
        return (
          <div key={n} className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
            <div className="h-full rounded-full" style={{ width: `${fill * 100}%`, background: COBALT }} />
          </div>
        );
      })}
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

function Deliverable({ d }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState({}); // which opportunity cards are open (screen-only)
  const toggle = (i) => setExpanded((e) => ({ ...e, [i]: !e[i] }));
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

    // Maturity
    const mat = d.maturity || {};
    text("Maturity", margin, { size: 11, color: INK_RGB, style: "bold" });
    gap(6);
    // Clarity
    text(`Causal model clarity: ${mat.clarity ?? "-"} / 5`, margin, { size: 9.5, color: INK_RGB, style: "bold" });
    gap(2);
    text(mat.clarityNote || "", margin, { size: 9, color: GRAY_RGB });
    if (mat.clarityNext) {
      gap(1);
      text(`To reach the next level: ${mat.clarityNext}`, margin, { size: 8.5, color: COBALT_RGB, style: "italic" });
    }
    gap(8);
    // Capacity
    text(`Measurement capacity: ${mat.capacity ?? "-"} / 5`, margin, { size: 9.5, color: INK_RGB, style: "bold" });
    gap(2);
    text(mat.capacityNote || "", margin, { size: 9, color: GRAY_RGB });
    if (mat.capacityComponents) {
      const cc = mat.capacityComponents;
      const lim = (mat.capacityLimiter || "").toLowerCase();
      const rows = [
        ["Analytic skill", cc.analyticSkill, "analytic skill"],
        ["Data infrastructure", cc.dataInfrastructure, "data infrastructure"],
        ["Budget", cc.budget, "budget"],
      ];
      gap(2);
      rows.forEach(([label, val, key]) => {
        const isLim = lim === key;
        gap(1);
        text(`   ${label}: ${val ?? "-"} / 5${isLim ? "  (limiting)" : ""}`, margin, {
          size: 8.5,
          color: isLim ? AMBER_RGB : GRAY_RGB,
          style: isLim ? "bold" : "normal",
        });
      });
    }
    if (mat.capacityNext) {
      gap(1);
      text(`To reach the next level: ${mat.capacityNext}`, margin, { size: 8.5, color: COBALT_RGB, style: "italic" });
    }
    gap(14);

    // Opportunities
    text("Where measurement could help", margin, { size: 13, color: INK_RGB, style: "bold" });
    gap(8);
    (d.opportunities || []).forEach((o, i) => {
      ensureSpace(56);
      const badge = `[${(o.type || "").toUpperCase()} - ${(o.impact || o.lift || "")} impact]`;
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
      gap(8);
    });
    gap(6);

    // CTA summary
    ensureSpace(60);
    text("Start a conversation with Cobalt", margin, { size: 11, color: COBALT_RGB, style: "bold" });
    gap(6);
    text(d.emailSummary || "", margin, { size: 9.5, color: INK_RGB });
    gap(6);
    text(`Reach out: ${COBALT_EMAIL}`, margin, { size: 9.5, color: COBALT_RGB, style: "bold" });
    gap(14);
    text("This is a draft starting point, not a verdict. Cobalt builds these out with you.", margin, { size: 8, color: GRAY_RGB, style: "italic" });

    const safeName = (d.company && d.company !== "Your product" ? d.company : "impact-model")
      .replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "");
    doc.save(`cobalt-${safeName}.pdf`);
  };

  const m = d.model || {};
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold mb-1" style={{ color: INK }}>Draft Impact Process Model</h2>
          <button
            onClick={downloadPdf}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border"
            style={{ color: COBALT, borderColor: "#BFDBFE", background: "white" }}
            title="Download a PDF copy to keep"
          >
            ⬇ Download PDF
          </button>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: INK }}>Causal model clarity</div>
            <div className="text-xs font-bold" style={{ color: COBALT }}>
              {d.maturity?.clarity ?? "–"}<span style={{ color: "#9CA3AF" }}> / 5</span>
              <InfoTip text={d.maturity?.clarityNext} />
            </div>
          </div>
          <MaturityBar value={d.maturity?.clarity} />
          <p className="text-xs mt-2" style={{ color: "#4B5563" }}>{d.maturity?.clarityNote}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: INK }}>Measurement capacity</div>
            <div className="text-xs font-bold" style={{ color: COBALT }}>
              {d.maturity?.capacity ?? "–"}<span style={{ color: "#9CA3AF" }}> / 5</span>
              <InfoTip text={d.maturity?.capacityNext} />
            </div>
          </div>
          <MaturityBar value={d.maturity?.capacity} />
          <p className="text-xs mt-2" style={{ color: "#4B5563" }}>{d.maturity?.capacityNote}</p>
          {d.maturity?.capacityComponents && (
            <div className="mt-2 space-y-0.5">
              {[
                ["Analytic skill", d.maturity.capacityComponents.analyticSkill, "analytic skill"],
                ["Data infrastructure", d.maturity.capacityComponents.dataInfrastructure, "data infrastructure"],
                ["Budget", d.maturity.capacityComponents.budget, "budget"],
              ].map(([label, val, key]) => {
                const isLimiter = (d.maturity?.capacityLimiter || "").toLowerCase() === key;
                return (
                  <div key={key} className="flex items-center justify-between text-[11px]">
                    <span style={{ color: isLimiter ? AMBER : "#6B7280", fontWeight: isLimiter ? 600 : 400 }}>
                      {label}{isLimiter ? " · limiting" : ""}
                    </span>
                    <span style={{ color: isLimiter ? AMBER : "#6B7280", fontWeight: isLimiter ? 600 : 400 }}>{val ?? "–"}/5</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: INK }}>Where measurement could help</h2>
        <p className="text-xs mb-3" style={{ color: "#9CA3AF" }}>Tap a question to see why it matters and an example or two of how you could measure it.</p>
        <div className="space-y-2">
          {(d.opportunities || []).map((o, i) => {
            const isOpen = !!expanded[i];
            const isProve = o.type === "prove";
            const hasExamples = Array.isArray(o.examples) && o.examples.length > 0;
            return (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className="text-[11px] mt-0.5 shrink-0"
                      style={{ color: "#9CA3AF", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 120ms" }}
                    >▶</span>
                    <span className="font-semibold text-sm" style={{ color: INK }}>{i + 1}. {o.question}</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border"
                      style={{ color: isProve ? AMBER : COBALT, borderColor: isProve ? "#FDE1B8" : "#BFDBFE" }}>{o.type}</span>
                    <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border"
                      style={{ color: "#6B7280", borderColor: "#D1D5DB" }}>{o.impact || o.lift} impact</span>
                  </div>
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "#EFF4FF" }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COBALT }}>Start a conversation with Cobalt</div>
        <p className="text-[13px] leading-relaxed mb-3" style={{ color: INK }}>{d.emailSummary}</p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={emailHref()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white"
            style={{ background: COBALT }}
          >
            ✉️ Email this to Cobalt
          </a>
          <button
            onClick={copy}
            className="text-sm font-medium px-4 py-2 rounded-lg border"
            style={{ color: COBALT, borderColor: "#BFDBFE", background: "white" }}
          >
            {copied ? "Copied ✓" : "Copy text instead"}
          </button>
        </div>
        <p className="text-[12px] mt-3" style={{ color: "#4B5563" }}>
          <span style={{ fontWeight: 600 }}>What happens next:</span> Send the note above and a member of the Cobalt team will follow up with you directly to talk through what you'd like to explore. No cost, no obligation — just a conversation.
        </p>
      </div>

      <p className="text-[11px] text-center" style={{ color: "#9CA3AF" }}>This is a draft starting point, not a verdict. Cobalt builds these out with you.</p>
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
  const [error, setError] = useState("");
  const [reviewer, setReviewer] = useState("");      // reviewer name/initials
  const [started, setStarted] = useState(false);     // false until name entered
  const [nameInput, setNameInput] = useState("");
  const [phase, setPhase] = useState(0); // 0 getting started, 1 how it works, 2 making it happen, 3 your results
  const [sessionId] = useState(() => "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
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

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    // First founder answer moves us out of "Getting started" into "How it works".
    setPhase((p) => (p < 1 ? 1 : p));
    try {
      let reply = await callClaude(CONVO_SYSTEM, next, 900);
      if (reply.includes("[[CAPACITY]]")) {
        reply = reply.replace(/\[\[CAPACITY\]\]/g, "").trim();
        setPhase((p) => (p < 2 ? 2 : p));
      }
      if (reply.includes("[[READY]]")) {
        reply = reply.replace(/\[\[READY\]\]/g, "").trim();
        setReady(true);
        setPhase((p) => (p < 2 ? 2 : p)); // ensure at least capacity phase by the time we're ready
      }
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("Something hiccuped. Try sending that again.");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  // Silently persist the full session to the Google Sheet (fire-and-forget).
  const saveSession = async (model) => {
    try {
      await fetch("/.netlify/functions/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const transcript = messages.map((m) => `${m.role === "user" ? "FOUNDER" : "GUIDE"}: ${m.content}`).join("\n\n");
      const raw = await callClaude(SYNTH_SYSTEM, [{ role: "user", content: `Discovery conversation:\n\n${transcript}\n\nProduce the JSON deliverable.` }], 1500);
      const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
      setDeliverable(parsed);
      setPhase(3); // Your results
      saveSession(parsed); // observability: log the full session for reviewer feedback

    } catch (e) {
      setError("Couldn't assemble the model — try generating once more.");
    } finally {
      setGenerating(false);
    }
  };

  const restart = () => {
    setMessages([{ role: "assistant", content: GREETING }]);
    setReady(false);
    setDeliverable(null);
    setError("");
    setInput("");
    setStarted(false);
    setNameInput("");
    setPhase(0);
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
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <CobaltLogo size={48} />
            <h2 className="mt-4 text-lg font-bold" style={{ color: INK }}>Cobalt Impact Discovery</h2>
            <p className="mt-2 text-sm max-w-sm" style={{ color: "#6B7280" }}>
              A short conversation to map how your product creates impact — and where measuring it could help most. Takes about 5–10 minutes.
            </p>

            <p className="mt-4 text-[13px] max-w-sm" style={{ color: "#9CA3AF" }}>
              You're part of an invited review group. Your name just helps us follow up on your feedback.
            </p>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) { setReviewer(nameInput.trim()); setStarted(true); } }}
              placeholder="Your name or initials"
              className="mt-4 w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-center focus:outline-none focus:ring-2"
              style={{ color: INK }}
            />
            <button
              onClick={() => { if (nameInput.trim()) { setReviewer(nameInput.trim()); setStarted(true); } }}
              disabled={!nameInput.trim()}
              className="mt-3 px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
              style={{ background: COBALT }}
            >
              Start →
            </button>
          </div>
        ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          {!deliverable && messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end pl-10" : "justify-start pr-10"}`}>
              <div className="max-w-[78%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap"
                style={m.role === "user" ? { background: COBALT, color: "white", borderBottomRightRadius: 4 } : { background: "#F3F4F6", color: INK, borderBottomLeftRadius: 4 }}>
                {m.content}
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

          {ready && !deliverable && !generating && (
            <div className="flex justify-center pt-1">
              <button onClick={generate} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm" style={{ background: COBALT }}>
                Generate my Impact Process Model →
              </button>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <CobaltSpinner size={38} />
              <div className="text-sm" style={{ color: "#6B7280" }}>Mapping your causal chain and measurement opportunities…</div>
            </div>
          )}

          {deliverable && <div ref={deliverableRef}><ErrorBoundary onRetry={generate}><Deliverable d={deliverable} /></ErrorBoundary></div>}

          {error && <div className="text-center text-xs" style={{ color: AMBER }}>{error}</div>}
        </div>
        )}

        {started && !deliverable && !generating && (
          <div className="border-t border-slate-100 p-3">
            {ready && <p className="text-[11px] text-center mb-2" style={{ color: "#9CA3AF" }}>Want to add anything else before generating? Keep typing, or hit the button above.</p>}
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1} placeholder="Type your answer…"
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2" style={{ color: INK, maxHeight: 120 }} />
              <button onClick={send} disabled={loading || !input.trim()} className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold disabled:opacity-40" style={{ background: COBALT }}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
