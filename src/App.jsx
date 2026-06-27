import React, { useState, useRef, useEffect } from "react";

// ── Cobalt design system ──
const COBALT = "#3B82F6";
const INK = "#1F2937";
const AMBER = "#D97706";

// ── Cobalt brand mark, baked in (blue hex "C"). Travels with the app; no upload, no network. ──
const LOGO = "data:image/png;base64,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";

const GREETING =
  "Hi — I'm Cobalt's discovery guide. In a short conversation I'll help you map how your product is meant to create impact, and where measuring it could actually move the needle for you.\n\nThere are no wrong answers, and you can be as rough as you like — I'll ask follow-ups where it helps. At the end, I'll share some ideas about how impact measurement could help your organization, your solution, and your users.\n\nTo start: in a sentence or two, what does your product do, and who uses it?";

const CONVO_SYSTEM = `You are Cobalt Collective's discovery guide, talking with a founder or product lead at an early-stage company in education, health, or workforce. Your job is to run Cobalt's discovery process conversationally and warmly, then hand off to a synthesis step.

CORE FRAMES you are working toward (do not lecture about these — use them to steer your questions):
- Purpose of evidence: understand WHO actually needs evidence about the product and WHAT decision it informs — the team improving the product, a buyer deciding whether to purchase, a funder deciding whether to renew. Surface this naturally through plain questions.
- The causal chain (implementation science): product → [implementation mechanism] → user behavior → [intervention mechanism] → outcome. The implementation mechanism is how the product gets users to actually behave a certain way; user behavior is what users do; the intervention mechanism is why that behavior produces the outcome. Probe where the chain is genuinely understood vs. merely asserted (the gap between behavior and outcome is the classic blind spot).
- Capacity: people + analytic skill + usable data + budget. The binding constraint matters more than the average.

PROCESS (move through these adaptively — if an answer is rich, move on; if thin or vague, ask ONE sharp follow-up):
1. Orientation: what the product is, who the users are, the outcome it's meant to drive.
2. The question behind the question: who needs evidence about the product, and what decision that evidence informs.
3. The causal chain: walk product → user behavior → outcome, and name the two linking mechanisms. Find where it's solid vs. assumed.
4. Capacity: people, skill, data, budget — find the binding constraint.

STYLE:
- Warm, plain-spoken, curious. One question at a time. Keep turns short (2-4 sentences). No jargon dumps. Reflect back what you heard in their own words before moving on.
- Never use internal framework labels or jargon in the conversation. In particular, do NOT use the words "know" versus "prove" as a framing — ask plainly about who needs evidence and why instead.
- Don't grade them. Don't pad with praise.
- Adapt depth to their answers. A focused founder might need ~6 exchanges; a vaguer one more.

WHEN YOU HAVE ENOUGH (a working read on the causal chain, who needs evidence and for what decision, and rough capacity): give a brief, friendly reflect-back of your understanding in 3-4 sentences, then on its own final line output exactly: [[READY]]
Do not output [[READY]] before you have a real read on all four areas.`;

const SYNTH_SYSTEM = `You are Cobalt Collective's analyst. Read the discovery conversation and produce a draft deliverable as STRICT JSON only — no markdown, no backticks, no preamble.

Use Cobalt's causal chain: product → [implementation mechanism] → user behavior → [intervention mechanism] → outcome. Mark each element "confirmed" if the conversation gave real evidence it's understood, or "assumed" if it's plausible but untested/vague (the honest amber flag).

Keep each label SHORT — a noun phrase of roughly 4-9 words, not a sentence. The mechanism phrases can be a touch longer but stay tight.

Maturity (1-4 each, be honest, score the gap not the polish):
- clarity: 1 outcome only / 2 behavior named, mechanism vague / 3 coherent chain but untested / 4 defined and operationalized.
- capacity: 1 cannot execute / 2 one binding gap / 3 can execute with support / 4 self-sufficient.

Give 3-5 prioritized measurement opportunities. Each: a plain-English question it answers, type "know" or "prove" (know = evidence that helps the team improve the product; prove = evidence for an external buyer or funder), lift "low"/"medium"/"high", and a one-sentence rationale. Order by usefulness.

Keep all text tight. Output ONLY this JSON shape:
{
 "company":"short name or 'Your product'",
 "model":{
  "product":{"label":"...","status":"confirmed|assumed"},
  "implementationMechanism":{"label":"short phrase","status":"confirmed|assumed"},
  "userBehavior":{"label":"...","status":"confirmed|assumed"},
  "interventionMechanism":{"label":"short phrase","status":"confirmed|assumed"},
  "outcome":{"label":"...","status":"confirmed|assumed"}
 },
 "maturity":{"clarity":1,"clarityNote":"one sentence","capacity":1,"capacityNote":"one sentence"},
 "opportunities":[{"title":"...","question":"...","type":"know|prove","lift":"low|medium|high","rationale":"one sentence"}],
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

function MaturityBar({ value }) {
  return (
    <div className="flex gap-1 mt-1">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= value ? COBALT : "#E5E7EB" }} />
      ))}
    </div>
  );
}

function Deliverable({ d }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(d.emailSummary || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const m = d.model || {};
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: INK }}>Draft Impact Process Model</h2>
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
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: INK }}>Causal model clarity</div>
          <MaturityBar value={d.maturity?.clarity} />
          <p className="text-xs mt-2" style={{ color: "#4B5563" }}>{d.maturity?.clarityNote}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: INK }}>Measurement capacity</div>
          <MaturityBar value={d.maturity?.capacity} />
          <p className="text-xs mt-2" style={{ color: "#4B5563" }}>{d.maturity?.capacityNote}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3" style={{ color: INK }}>Where measurement could help</h2>
        <div className="space-y-3">
          {(d.opportunities || []).map((o, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="font-semibold text-sm" style={{ color: INK }}>{i + 1}. {o.title}</div>
                <div className="flex gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white" style={{ background: o.type === "prove" ? AMBER : COBALT }}>{o.type}</span>
                  <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border" style={{ color: "#6B7280", borderColor: "#D1D5DB" }}>{o.lift} lift</span>
                </div>
              </div>
              <p className="text-[13px] mt-1.5 italic" style={{ color: "#374151" }}>“{o.question}”</p>
              <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>{o.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "#EFF4FF" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: COBALT }}>Start a conversation with Cobalt</div>
          <button onClick={copy} className="text-xs font-medium px-3 py-1 rounded-lg text-white" style={{ background: COBALT }}>{copied ? "Copied ✓" : "Copy"}</button>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: INK }}>{d.emailSummary}</p>
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
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, deliverable, generating]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      let reply = await callClaude(CONVO_SYSTEM, next, 900);
      if (reply.includes("[[READY]]")) {
        reply = reply.replace(/\[\[READY\]\]/g, "").trim();
        setReady(true);
      }
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("Something hiccuped. Try sending that again.");
      setMessages(messages);
    } finally {
      setLoading(false);
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

          {deliverable && <Deliverable d={deliverable} />}

          {error && <div className="text-center text-xs" style={{ color: AMBER }}>{error}</div>}
        </div>

        {!deliverable && !generating && (
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
