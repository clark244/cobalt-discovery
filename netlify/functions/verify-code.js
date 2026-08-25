// Netlify function: finish the email gate. Accepts { email, code }, checks the
// one-time code, and on success returns a signed token the browser then sends on
// every claude / save-session call. The token — not the UI — is what the other
// functions trust.
import { normalizeEmail, signToken } from "./_auth.js";
import { checkCode } from "./_codes.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (obj, status) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const email = normalizeEmail(body?.email);
  const code = String(body?.code || "").trim();
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return json({ error: "Enter the 6-digit code we emailed you." }, 400);
  }

  const result = await checkCode(email, code);
  if (result === "ok") {
    const token = signToken(email);
    if (!token) return json({ error: "Server auth not configured." }, 500); // AUTH_SECRET missing
    return json({ ok: true, token, email }, 200);
  }
  if (result === "locked") {
    return json({ error: "Too many attempts. Request a new code." }, 429);
  }
  if (result === "expired") {
    return json({ error: "That code expired or was already used. Request a new one." }, 400);
  }
  return json({ error: "Incorrect code. Try again." }, 400); // "invalid"
};
