// Self-issued, stateless auth token for the email gate.
//
// Design: a verified email is proved once (see request-code.js / verify-code.js),
// then represented by a short signed token the browser sends on every subsequent
// call. The token is an HMAC-SHA256 over {email, exp}, so functions can validate
// it WITHOUT a round-trip to any store — the signature alone proves we issued it.
//
// This is the "self-issued HMAC" path from the auth spec (not Auth0). It exists to
// (a) gate the LLM proxy/methodology behind a verified identity and (b) let the
// rate limiter key on that email instead of a rotatable IP.
//
// SECURITY: everything hinges on AUTH_SECRET. It must be a long random value set
// in Netlify env (never committed, never shipped to the browser). Rotating it
// invalidates all outstanding tokens (users just re-verify) — the kill switch if
// an abuse token ever leaks.
import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET || "";
const TOKEN_TTL_HOURS = Number(process.env.TOKEN_TTL_HOURS || 24);

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = (obj) => b64url(JSON.stringify(obj));
const fromB64url = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function hmac(data) {
  return b64url(crypto.createHmac("sha256", SECRET).update(data).digest());
}

// Normalize once so the token subject and the rate-limit key are always identical.
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Returns a signed token string for a verified email, or "" if unusable.
export function signToken(email, ttlHours = TOKEN_TTL_HOURS) {
  if (!SECRET) return "";
  const e = normalizeEmail(email);
  if (!e) return "";
  const payload = b64urlJson({ e, exp: Date.now() + ttlHours * 3600 * 1000 });
  return `${payload}.${hmac(payload)}`;
}

// Returns { email } for a valid, unexpired token, or null otherwise.
// Never throws — malformed input just yields null.
export function verifyToken(token) {
  if (!SECRET || !token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = hmac(payload);
  const a = fromB64url(sig);
  const b = fromB64url(expected);
  // Constant-time compare; bail if lengths differ (timingSafeEqual throws otherwise).
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let data;
  try {
    data = JSON.parse(fromB64url(payload).toString("utf8"));
  } catch {
    return null;
  }
  if (!data || typeof data.e !== "string" || typeof data.exp !== "number") return null;
  if (Date.now() > data.exp) return null;
  return { email: data.e };
}

// Convenience: pull the bearer token off a request and validate it.
// Accepts "Authorization: Bearer <token>". Returns { email } or null.
export function verifiedEmail(req) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifyToken(m[1].trim());
}
