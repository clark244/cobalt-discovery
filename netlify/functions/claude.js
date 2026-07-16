// Netlify serverless function: proxies browser requests to the Anthropic API.
//
// Hardening (2026-07): the browser no longer sends the model, token budget, or
// system prompt. It sends only { promptId, messages }. This function owns the
// prompts (see _prompts.js), pins the model and max_tokens, and enforces daily
// limits — so it can ONLY ever run Cobalt's discovery task and can never be used
// as an open Anthropic proxy on our API key.
//
// Email gate (2026-07): every call must carry a valid Bearer token proving a
// verified email (see _auth.js / verify-code.js). No token, no LLM. Rate limits
// now key on that verified email instead of a rotatable IP — closing the
// IP-rotation gap — while a coarse per-IP raw cap stays as a cost backstop.
import { PROMPTS, MAX_TOKENS, MODEL } from "./_prompts.js";
import { bump, clientIp } from "./_ratelimit.js";
import { verifiedEmail } from "./_auth.js";

// Env-tunable limits (see _ratelimit.js for the shared-key caveat).
const RAW_CALLS_PER_DAY   = Number(process.env.RAW_CALLS_PER_DAY   || 100); // anti-hammer / cost ceiling
const COMPLETIONS_PER_DAY = Number(process.env.COMPLETIONS_PER_DAY || 2);   // times a person can finish the app/day

const json = (obj, status) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "Server missing ANTHROPIC_API_KEY" }, 500);

  // Gate: require a verified-email token. This is the real check — a UI-only gate
  // is bypassable by calling this URL directly.
  const auth = verifiedEmail(req);
  if (!auth) return json({ error: "Verify your email to begin." }, 401);
  const acct = auth.email;

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const { promptId, messages } = body || {};
  const system = PROMPTS[promptId];
  if (!system || !Array.isArray(messages)) {
    return json({ error: "Unknown promptId or missing messages" }, 400);
  }

  // Cost / anti-hammer ceiling on every LLM call, keyed on the verified email.
  const raw = await bump("raw", acct, RAW_CALLS_PER_DAY);
  if (!raw.ok) return json({ error: "Daily request limit reached. Please try again tomorrow." }, 429);

  // Belt-and-suspenders: a blunt per-IP raw ceiling so a single host can't burn
  // cost by cycling through many verified emails.
  const rawIp = await bump("rawip", clientIp(req), RAW_CALLS_PER_DAY);
  if (!rawIp.ok) return json({ error: "Daily request limit reached. Please try again tomorrow." }, 429);

  // Completion cap: the "model" call is the first of the two synthesis calls that
  // produce a deliverable, so metering it caps how many times a person can finish
  // the app per day. Conversation turns don't count as completions.
  if (promptId === "model") {
    const done = await bump("done", acct, COMPLETIONS_PER_DAY);
    if (!done.ok) {
      return json({ error: `You've reached today's limit of ${COMPLETIONS_PER_DAY} completed sessions. Please come back tomorrow.` }, 429);
    }
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS[promptId],
        system,
        messages,
      }),
    });
    const text = await upstream.text();
    return new Response(text, { status: upstream.status, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return json({ error: "Upstream request failed", detail: String(e) }, 502);
  }
};
