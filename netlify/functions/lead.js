// Netlify function: landing-page lead capture (no chat required).
// Accepts { type: "subscribe" | "message", firstName, lastName, email,
// organization, message?, website? } and writes a row to the Airtable
// "Sign Ups" table (Cobalt Collective base). Messages also trigger an email
// alert to ALERT_TO via Resend so they don't sit unseen in Airtable.
//
// Pre-auth and public, so: per-IP daily cap, a honeypot field, and length caps.
// The Airtable token lives only in Netlify env vars — never in the browser.
import { bump, clientIp } from "./_ratelimit.js";
import { normalizeEmail } from "./_auth.js";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID  = process.env.AIRTABLE_BASE_ID  || "appvDwkHvPo9UOKub"; // Cobalt Collective
const TABLE_ID = process.env.AIRTABLE_TABLE_ID || "tblTPO89z5ohcIUXB"; // Sign Ups
const LEADS_PER_IP_DAY = Number(process.env.LEADS_PER_IP_DAY || 10);

const SOURCE = { subscribe: "discovery app subscribe", message: "discovery app message" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (obj, status) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function airtable(path, init = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

async function findByEmail(email) {
  const formula = `LOWER({Email})='${email.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  const data = await airtable(`?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`);
  return (data.records || [])[0] || null;
}

async function sendMessageAlert(lead) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_TO;
  const from = process.env.ALERT_FROM || "Cobalt Discovery <alerts@cobaltcollective.org>";
  if (!key || !to) { console.log("[lead] alert skipped — RESEND_API_KEY/ALERT_TO not set"); return; }
  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:14px;color:#111">
    <p><b>${esc(name)}</b> (${esc(lead.email)}) from <b>${esc(lead.organization)}</b> sent a message from the Discovery landing page:</p>
    <blockquote style="border-left:3px solid #3B82F6;margin:12px 0;padding:4px 12px;white-space:pre-wrap">${esc(lead.message)}</blockquote>
    <p style="color:#666;font-size:12px">Reply to this email to respond directly. Saved to Airtable → Sign Ups.</p>
  </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: lead.email, subject: `New message from ${name} (${lead.organization})`, html }),
    });
    if (!res.ok) console.log("[lead] alert failed", res.status, await res.text());
  } catch (e) {
    console.log("[lead] alert error", e.message);
  }
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  // Honeypot: real visitors never see or fill this. Pretend success so bots move on.
  if (clip(body?.website, 200)) return json({ ok: true }, 200);

  const type = body?.type === "message" ? "message" : body?.type === "subscribe" ? "subscribe" : null;
  if (!type) return json({ error: "Unknown form type." }, 400);

  const lead = {
    firstName: clip(body.firstName, 80),
    lastName: clip(body.lastName, 80),
    email: normalizeEmail(body.email),
    organization: clip(body.organization, 160),
    message: clip(body.message, 5000),
  };
  if (!lead.firstName || !lead.lastName) return json({ error: "Please enter your first and last name." }, 400);
  if (!EMAIL_RE.test(lead.email)) return json({ error: "Enter a valid email address." }, 400);
  if (!lead.organization) return json({ error: "Please enter your organization." }, 400);
  if (type === "message" && !lead.message) return json({ error: "Please enter a message." }, 400);

  const gate = await bump("lead", clientIp(req), LEADS_PER_IP_DAY);
  if (!gate.ok) return json({ error: "Too many submissions today. Please try again tomorrow." }, 429);

  if (!AIRTABLE_TOKEN) {
    console.log(`[lead] DEV — AIRTABLE_TOKEN not set; would save ${type}:`, lead);
    return json({ ok: true, dev: true }, 200);
  }

  const fields = {
    Email: lead.email,
    "First Name": lead.firstName,
    "Last Name": lead.lastName,
    Organization: lead.organization,
    Source: SOURCE[type],
  };

  try {
    if (type === "subscribe") {
      // Already on the list (e.g. from the teaser site)? Fill in their details, keep original Source.
      const existing = await findByEmail(lead.email);
      if (existing) {
        const { Source, ...details } = fields;
        await airtable(`/${existing.id}`, { method: "PATCH", body: JSON.stringify({ fields: details, typecast: true }) });
        return json({ ok: true }, 200);
      }
    } else {
      fields.Message = lead.message;
    }
    // typecast lets Airtable create the new Source option the first time it's used.
    await airtable("", { method: "POST", body: JSON.stringify({ fields, typecast: true }) });
  } catch (e) {
    console.log("[lead] save failed", e.message);
    return json({ error: "Something went wrong saving your details. Please try again." }, 502);
  }

  if (type === "message") await sendMessageAlert(lead);
  return json({ ok: true }, 200);
};

