#!/usr/bin/env node
// Model comparison eval for the Discovery Agent's scoring call.
//
// Runs the production "model" prompt (from netlify/functions/_prompts.js, so it
// never drifts from what's deployed) over the hand-rescored transcripts, on
// several models, and compares each model's 1-5 scores to Clark's manual scores.
//
// USAGE
//   1. In the "Discovery app data" sheet, open Sheet1 → File → Download → CSV.
//   2. ANTHROPIC_API_KEY=sk-... node scripts/eval-models.mjs path/to/Sheet1.csv
//
// OPTIONS
//   --models a,b,c   Model IDs to compare (default: claude-sonnet-4-6,claude-sonnet-5,claude-opus-5-5)
//   --runs N         Runs per transcript per model, to measure consistency (default 3)
//   --opps           Also run the "opps" call once per transcript/model and write a
//                    BLINDED side-by-side file for qualitative review (key in opps-key.json)
//   --concurrency N  Parallel API calls (default 3)
//   --limit N        Only use the first N scored transcripts (for a cheap smoke test)
//
// OUTPUT (in eval-out/<timestamp>/)
//   summary.md    Per-model agreement with manual scores, consistency, failures, latency, cost
//   results.csv   One row per transcript × model × run
//   raw/          Raw model outputs
//   opps-blind.md + opps-key.json   (only with --opps)
//
// Rough cost: 11 transcripts × 3 models × 3 runs ≈ 100 calls ≈ $3–4.

import fs from "node:fs";
import path from "node:path";
import { PROMPTS, MAX_TOKENS, MODEL as PROD_MODEL } from "../netlify/functions/_prompts.js";

// ── Config ──────────────────────────────────────────────────────────────────
// $ per million tokens [input, output]. Check https://platform.claude.com/docs/en/about-claude/pricing
const PRICES = {
  "claude-sonnet-4-6": [3, 15],
  "claude-sonnet-5": [2, 10],
  "claude-opus-5-5": [4, 20],
  "claude-opus-4-6": [5, 25],
};
// Newer models (4.7+) use ~30% more tokens for the same text AND think before
// answering by default; the thinking counts against max_tokens. With production
// limits, Sonnet 5 / Opus 5.5 ran out of room before (or while) writing the JSON.
// Give them a generous ceiling — you're billed only for tokens actually used.
const OLD_TOKENIZER = new Set(["claude-sonnet-4-6", "claude-sonnet-4-5", "claude-opus-4-6", "claude-opus-4-5"]);
const NEW_MODEL_MAX_TOKENS = 8000;

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};
const csvPath = args.find((a) => a.toLowerCase().endsWith(".csv"));
const MODELS = String(flag("models", `${PROD_MODEL},claude-sonnet-5,claude-opus-5-5`)).split(",").map((s) => s.trim());
const RUNS = Number(flag("runs", 3));
const WITH_OPPS = flag("opps", false) === true;
const CONCURRENCY = Number(flag("concurrency", 3));
const LIMIT = flag("limit", null) ? Number(flag("limit")) : null;
const API_URL = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages";
const KEY = process.env.ANTHROPIC_API_KEY;

if (!csvPath) { console.error("Usage: node scripts/eval-models.mjs <Sheet1.csv> [--models a,b] [--runs N] [--opps]"); process.exit(1); }
if (!KEY) { console.error("Set ANTHROPIC_API_KEY."); process.exit(1); }

// ── CSV (RFC 4180, handles multi-line quoted transcripts) ───────────────────
function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const csvCell = (v) => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// The sheet has two header rows: row 1 names the app's columns (A–I), row 2 names
// the manual-rescore columns (J–P). Locate columns by name so reordering is safe.
function loadCases(file) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const find = (name) => {
    for (const r of rows.slice(0, 5)) { const j = r.findIndex((c) => c.trim().toLowerCase() === name); if (j !== -1) return j; }
    return -1;
  };
  const col = {
    reviewer: find("reviewer"),
    transcript: find("transcript"),
    clarity: find("rescore_clarity_manual"),
    analyticSkill: find("analyitic_skill") !== -1 ? find("analyitic_skill") : find("analytic_skill"),
    dataInfrastructure: find("data_infrastructure"),
    budget: find("budget"),
  };
  for (const [k, v] of Object.entries(col)) if (v === -1) throw new Error(`Couldn't find column for "${k}" in ${file}`);
  const num = (v) => (v == null || String(v).trim() === "" || isNaN(Number(v)) ? null : Number(v));
  const cases = [];
  rows.forEach((r, i) => {
    const t = (r[col.transcript] || "").trim();
    const m = { clarity: num(r[col.clarity]), analyticSkill: num(r[col.analyticSkill]), dataInfrastructure: num(r[col.dataInfrastructure]), budget: num(r[col.budget]) };
    if (!t.startsWith("GUIDE:") || Object.values(m).some((x) => x == null)) return;
    m.capacity = round1((m.analyticSkill + m.dataInfrastructure + m.budget) / 3);
    cases.push({ id: `row${i + 1}`, reviewer: r[col.reviewer] || "", transcript: t, manual: m });
  });
  return LIMIT ? cases.slice(0, LIMIT) : cases;
}

// ── API ─────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function callClaude(model, promptId, userContent) {
  const base = MAX_TOKENS[promptId];
  const max_tokens = OLD_TOKENIZER.has(model) ? base : Math.max(base, NEW_MODEL_MAX_TOKENS);
  const body = JSON.stringify({ model, max_tokens, system: PROMPTS[promptId], messages: [{ role: "user", content: userContent }] });
  for (let attempt = 0; ; attempt++) {
    const t0 = Date.now();
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body,
    });
    const ms = Date.now() - t0;
    if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(2000 * 2 ** attempt); continue; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${model} ${res.status}: ${data?.error?.message || JSON.stringify(data)}`);
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const blocks = (data.content || []).map((b) => b.type).join("+");
    return { text, ms, blocks, stop: data.stop_reason, inTok: data.usage?.input_tokens || 0, outTok: data.usage?.output_tokens || 0, max_tokens };
  }
}

// Mirrors the app's lenient parse: strip fences, take the outermost {...}.
function parseJson(text) {
  const s = text.replace(/```(?:json)?/g, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b <= a) throw new Error("no JSON object");
  return JSON.parse(s.slice(a, b + 1));
}

// Model output → the five numbers we compare. Tolerant of where "scores" sits.
function extractScores(j) {
  const s = j.maturity || j.scores || j;
  const cc = s.capacityComponents || {};
  const out = { clarity: s.clarity, analyticSkill: cc.analyticSkill, dataInfrastructure: cc.dataInfrastructure, budget: cc.budget };
  if (Object.values(out).some((v) => typeof v !== "number")) throw new Error("scores missing or non-numeric");
  out.capacity = round1((out.analyticSkill + out.dataInfrastructure + out.budget) / 3);
  return out;
}

async function pool(items, n, fn) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }));
  return results;
}

// ── Metrics ─────────────────────────────────────────────────────────────────
const round1 = (x) => Math.round(x * 10) / 10;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const DIMS = ["clarity", "analyticSkill", "dataInfrastructure", "budget", "capacity"];
const INTEGER_DIMS = new Set(["clarity", "analyticSkill", "dataInfrastructure", "budget"]);
// Score → band, per the rubric in _prompts.js.
const band = (dim, v) => dim === "clarity" ? (v <= 2 ? 0 : v === 3 ? 1 : 2) : (v <= 1 ? 0 : v <= 3 ? 1 : 2);

function summarize(model, rows, cases) {
  const ok = rows.filter((r) => r.scores);
  const lines = [];
  const stats = {};
  for (const d of DIMS) {
    const diffs = ok.map((r) => r.scores[d] - r.manual[d]);
    stats[d] = {
      mae: mean(diffs.map(Math.abs)),
      bias: mean(diffs),
      exact: INTEGER_DIMS.has(d) ? mean(diffs.map((x) => (x === 0 ? 1 : 0))) : NaN,
      within1: mean(diffs.map((x) => (Math.abs(x) <= 1 ? 1 : 0))),
      bandAgree: INTEGER_DIMS.has(d) ? mean(ok.map((r) => (band(d, r.scores[d]) === band(d, r.manual[d]) ? 1 : 0))) : NaN,
    };
  }
  // Consistency: share of transcripts where every run gave the same integer score.
  const consistency = {};
  for (const d of [...INTEGER_DIMS]) {
    const per = cases.map((c) => new Set(ok.filter((r) => r.caseId === c.id).map((r) => r.scores[d])));
    const judged = per.filter((s) => s.size > 0);
    consistency[d] = RUNS < 2 ? NaN : judged.length ? mean(judged.map((s) => (s.size === 1 ? 1 : 0))) : NaN;
  }
  const cost = rows.reduce((a, r) => a + ((r.inTok || 0) * PRICES[model]?.[0] + (r.outTok || 0) * PRICES[model]?.[1]) / 1e6, 0);
  return {
    model, stats, consistency,
    n: rows.length, parsed: ok.length,
    truncated: rows.filter((r) => r.stop === "max_tokens").length,
    errors: rows.filter((r) => r.error).length,
    latency: mean(rows.filter((r) => r.ms).map((r) => r.ms)) / 1000,
    errorMsgs: [...new Set(rows.filter((r) => r.error).map((r) => r.error))],
    costPerCall: PRICES[model] ? cost / rows.length : NaN,
  };
}

const pct = (x) => (isNaN(x) ? "—" : `${Math.round(x * 100)}%`);
const f2 = (x) => (isNaN(x) ? "—" : (x >= 0 ? " " : "") + x.toFixed(2));

function renderSummary(sums, cases) {
  const L = [];
  L.push(`# Model comparison — Discovery "model" call`, "");
  L.push(`${cases.length} hand-scored transcripts × ${RUNS} run(s) per model. Prompt: production \`_prompts.js\`. Manual scores = sheet columns L–P.`, "");
  L.push(`## Agreement with manual scores`, "");
  L.push(`MAE = mean absolute error (lower is better). Bias = model minus manual (positive = model scores higher). Band = same Not yet / Emerging / Established band.`, "");
  L.push(`| Dimension | Model | MAE | Bias | Exact | Within 1 | Band agree |`, `|---|---|---|---|---|---|---|`);
  for (const d of DIMS) for (const s of sums) {
    const x = s.stats[d];
    L.push(`| ${d} | ${s.model} | ${f2(x.mae)} | ${f2(x.bias)} | ${pct(x.exact)} | ${pct(x.within1)} | ${pct(x.bandAgree)} |`);
  }
  L.push("", `## Run-to-run consistency`, "", `Share of transcripts where all ${RUNS} runs gave the identical score${RUNS < 2 ? " (needs --runs 2 or more)" : ""}.`, "");
  L.push(`| Model | Clarity | Analytic | Data | Budget |`, `|---|---|---|---|---|`);
  for (const s of sums) L.push(`| ${s.model} | ${pct(s.consistency.clarity)} | ${pct(s.consistency.analyticSkill)} | ${pct(s.consistency.dataInfrastructure)} | ${pct(s.consistency.budget)} |`);
  L.push("", `## Reliability, speed, cost`, "");
  L.push(`| Model | Calls | Parsed | Truncated | Errors | Avg latency (s) | Cost / call |`, `|---|---|---|---|---|---|---|`);
  for (const s of sums) L.push(`| ${s.model} | ${s.n} | ${s.parsed} | ${s.truncated} | ${s.errors} | ${isNaN(s.latency) ? "—" : s.latency.toFixed(1)} | ${isNaN(s.costPerCall) ? "—" : "$" + s.costPerCall.toFixed(3)} |`);
  const errs = sums.flatMap((s) => s.errorMsgs.map((e) => `- ${s.model}: ${e}`));
  if (errs.length) L.push("", `**Errors:**`, "", ...errs);
  L.push("", `## Caveats`, "",
    `- ${cases.length} transcripts is small; a difference of one or two cases is noise.`,
    `- The manual rescores may have been made after seeing Sonnet 4.6's output, and the prompt was tuned on Sonnet 4.6 — both tilt toward the incumbent.`,
    `- Agreement with one rater measures fit to Clark's judgment, not ground truth.`);
  return L.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────
const cases = loadCases(csvPath);
if (!cases.length) { console.error("No rows with a transcript AND all four manual scores found."); process.exit(1); }
const outDir = path.join("eval-out", new Date().toISOString().replace(/[:.]/g, "-"));
fs.mkdirSync(path.join(outDir, "raw"), { recursive: true });
console.log(`${cases.length} scored transcripts · models: ${MODELS.join(", ")} · runs: ${RUNS}${WITH_OPPS ? " · +opps" : ""}`);

const jobs = [];
for (const c of cases) for (const model of MODELS) for (let run = 1; run <= RUNS; run++) jobs.push({ c, model, run });

let done = 0;
const results = await pool(jobs, CONCURRENCY, async ({ c, model, run }) => {
  const r = { caseId: c.id, reviewer: c.reviewer, model, run, manual: c.manual };
  try {
    const res = await callClaude(model, "model", `Discovery conversation:\n\n${c.transcript}\n\nProduce the model + maturity JSON.`);
    Object.assign(r, { ms: res.ms, blocks: res.blocks, stop: res.stop, inTok: res.inTok, outTok: res.outTok });
    fs.writeFileSync(path.join(outDir, "raw", `${c.id}__${model}__run${run}.txt`), res.text);
    try { r.json = parseJson(res.text); r.scores = extractScores(r.json); }
    catch (e) { r.error = `parse: ${e.message}${res.stop === "max_tokens" ? " (truncated)" : ""}`; }
  } catch (e) { r.error = e.message; }
  done++;
  process.stdout.write(`\r${done}/${jobs.length} calls${r.error ? `  [${c.id} ${model}: ${r.error.slice(0, 60)}]\n` : ""}`);
  return r;
});
console.log("");

// results.csv
const header = ["case", "reviewer", "model", "run", ...DIMS.flatMap((d) => [`manual_${d}`, `model_${d}`]), "latency_s", "in_tok", "out_tok", "stop_reason", "blocks", "error"];
const csvRows = results.map((r) => [r.caseId, r.reviewer, r.model, r.run, ...DIMS.flatMap((d) => [r.manual[d], r.scores?.[d] ?? ""]), r.ms ? (r.ms / 1000).toFixed(1) : "", r.inTok ?? "", r.outTok ?? "", r.stop ?? "", r.blocks ?? "", r.error ?? ""]);
fs.writeFileSync(path.join(outDir, "results.csv"), [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n"));

const sums = MODELS.map((m) => summarize(m, results.filter((r) => r.model === m), cases));
let summary = renderSummary(sums, cases);

// Optional: one opps call per transcript/model (using that model's own run-1 output), blinded for review.
if (WITH_OPPS) {
  console.log("Running opps calls…");
  const oppJobs = [];
  for (const c of cases) for (const model of MODELS) {
    const first = results.find((r) => r.caseId === c.id && r.model === model && r.json);
    if (first) oppJobs.push({ c, model, part: first.json });
  }
  const oppRes = await pool(oppJobs, CONCURRENCY, async ({ c, model, part }) => {
    const ctx = JSON.stringify({ model: part.model, assessment: part.assessment, existingEvidence: part.existingEvidence, dataFormNote: part.dataFormNote });
    try {
      const res = await callClaude(model, "opps", `Discovery conversation:\n\n${c.transcript}\n\nDerived causal model and qualitative assessment:\n\n${ctx}\n\nProduce the opportunities JSON.`);
      fs.writeFileSync(path.join(outDir, "raw", `${c.id}__${model}__opps.txt`), res.text);
      return { c, model, part, opps: parseJson(res.text) };
    } catch (e) { return { c, model, part, error: e.message }; }
  });
  const key = {}; const B = ["# Blinded side-by-side (model + opps output)", "", "Read each case, pick the best version, then check opps-key.json.", ""];
  for (const c of cases) {
    const entries = oppRes.filter((o) => o.c.id === c.id).sort(() => Math.random() - 0.5);
    key[c.id] = {};
    B.push(`---`, `## ${c.id} (${c.reviewer})`, "");
    entries.forEach((o, i) => {
      const label = String.fromCharCode(65 + i); key[c.id][label] = o.model;
      B.push(`### Version ${label}`, "");
      if (o.error) { B.push(`_error: ${o.error}_`, ""); return; }
      const m = o.part.model || {};
      B.push(`**Causal chain:** ${["product", "implementationMechanism", "userBehavior", "interventionMechanism", "outcome"].map((k) => m[k] ? `${m[k].label} (${m[k].status})` : "?").join(" → ")}`, "");
      const a = o.part.assessment || {};
      if (a.clarity) B.push(`**Clarity — ${a.clarity.band}.** ${a.clarity.strength} ${a.clarity.opportunity}`, "");
      (o.opps.opportunities || []).forEach((op, k) => B.push(`${k + 1}. **${op.title}** (${op.type}, ${op.impact}) — ${op.question} _Decision:_ ${op.decision}${op.examples?.[0] ? ` _e.g._ ${op.examples[0]}` : ""}`));
      B.push("");
    });
  }
  fs.writeFileSync(path.join(outDir, "opps-blind.md"), B.join("\n"));
  fs.writeFileSync(path.join(outDir, "opps-key.json"), JSON.stringify(key, null, 2));
  summary += `\n\nQualitative review: see opps-blind.md (answer key in opps-key.json).`;
}

fs.writeFileSync(path.join(outDir, "summary.md"), summary);
console.log(`\n${summary}\n\nWrote ${outDir}/`);
