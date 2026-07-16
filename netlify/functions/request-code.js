// Netlify function: start the email gate. Accepts { email }, emails a 6-digit
// code, and stores it (hashed, short-lived) for verify-code.js to check.
//
// This endpoint is pre-auth and public, so it is itself an attack surface:
// abuse = email-bombing a victim and burning Resend quota. Two caps defend it —
// per-IP (blunt anti-hammer) and per-email (stops targeting one victim). Neither
// reveals whether an address "exists"; there are no accounts to enumerate.
import { bump, clientIp } from "./_ratelimit.js";
import { normalizeEmail } from "./_auth.js";
import { generateCode, putCode } from "./_codes.js";

const CODE_REQ_PER_IP_DAY    = Number(process.env.CODE_REQ_PER_IP_DAY    || 20);
const CODE_REQ_PER_EMAIL_DAY = Number(process.env.CODE_REQ_PER_EMAIL_DAY || 5);
const VERIFY_FROM = process.env.VERIFY_FROM || "Cobalt Discovery <noreply@cobaltcollective.org>";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (obj, status) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

async function sendCode(to, code) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Dev fallback: no mail provider configured. Log it and let the caller
    // surface it locally so the flow is testable without email.
    console.log(`[request-code] DEV — code for ${to} is ${code}`);
    return { sent: false, devCode: code };
  }
  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;color:#111">
    <p>Your Cobalt Impact Discovery verification code is:</p>
    <p style="font-size:30px;font-weight:700;letter-spacing:4px;margin:10px 0">${code}</p>
    <p style="color:#666;font-size:13px">It expires in a few minutes. If you didn't request this, you can ignore this email.</p>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: VERIFY_FROM, to: [to], subject: `Your verification code: ${code}`, html }),
  });
  if (!res.ok) {
    console.log("[request-code] send failed", res.status, await res.text());
    return { sent: false };
  }
  return { sent: true };
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const email = normalizeEmail(body?.email);
  if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address." }, 400);

  const ip = clientIp(req);
  const ipGate = await bump("codeip", ip, CODE_REQ_PER_IP_DAY);
  if (!ipGate.ok) return json({ error: "Too many code requests. Try again tomorrow." }, 429);
  const emailGate = await bump("codeemail", email, CODE_REQ_PER_EMAIL_DAY);
  if (!emailGate.ok) return json({ error: "Too many codes requested for this address. Try again tomorrow." }, 429);

  const code = generateCode();
  await putCode(email, code);
  const result = await sendCode(email, code);

  // devCode is included ONLY when no mail provider is configured (local dev).
  // It is never present in production, where RESEND_API_KEY is set.
  const payload = { ok: true };
  if (result.devCode) payload.devCode = result.devCode;
  return json(payload, 200);
};
