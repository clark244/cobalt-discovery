// One-time email verification codes, backed by Netlify Blobs.
//
// A code is stored hashed (never plaintext at rest), with an expiry and an
// attempt counter so it can't be brute-forced. Codes are single-use: verify
// deletes on success, and burns them after too many wrong tries.
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const CODE_TTL_MIN = Number(process.env.CODE_TTL_MIN || 10);
const CODE_MAX_ATTEMPTS = Number(process.env.CODE_MAX_ATTEMPTS || 5);

const store = () => getStore("email-codes");
const keyFor = (email) => `code:${email}`;
const hashCode = (email, code) =>
  crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");

// 6-digit numeric, zero-padded, from a CSPRNG (not Math.random).
export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function putCode(email, code) {
  await store().setJSON(keyFor(email), {
    hash: hashCode(email, code),
    exp: Date.now() + CODE_TTL_MIN * 60 * 1000,
    attempts: 0,
  });
}

// Returns one of: "ok" | "expired" | "invalid" | "locked".
export async function checkCode(email, code) {
  const s = store();
  const rec = await s.get(keyFor(email), { type: "json" });
  if (!rec) return "expired"; // absent or already consumed — treat the same
  if (Date.now() > rec.exp) {
    await s.delete(keyFor(email));
    return "expired";
  }
  if (rec.attempts >= CODE_MAX_ATTEMPTS) {
    await s.delete(keyFor(email));
    return "locked";
  }
  if (hashCode(email, code) === rec.hash) {
    await s.delete(keyFor(email)); // single use
    return "ok";
  }
  rec.attempts += 1;
  if (rec.attempts >= CODE_MAX_ATTEMPTS) {
    await s.delete(keyFor(email)); // burn after too many tries
    return "locked";
  }
  await s.setJSON(keyFor(email), rec);
  return "invalid";
}
