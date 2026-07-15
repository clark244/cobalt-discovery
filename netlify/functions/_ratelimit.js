// Best-effort per-IP daily rate limiting backed by Netlify Blobs.
//
// NOTE (throttle, not a guarantee): the read-modify-write below is not atomic,
// so under heavy concurrency a couple of extra calls can slip through. That's
// fine for cost/abuse control at this scale.
//
// NOTE (shared-IP caveat): this keys on client IP, so users behind one
// institutional NAT — e.g. a whole school district or office — share a bucket.
// Set the limits (env vars in the callers) with that in mind, and move the key
// to a verified account id once real auth exists.
import { getStore } from "@netlify/blobs";

export function clientIp(req) {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

const today = () => new Date().toISOString().slice(0, 10); // UTC day

// Increment the counter for `bucket`+ip+day and return { ok, count, limit }.
// ok=false means the caller is already at/over the limit — do not proceed.
export async function bump(bucket, ip, limit) {
  const store = getStore("rate-limits");
  const key = `${bucket}:${ip}:${today()}`;
  const current = Number((await store.get(key)) || 0);
  if (current >= limit) return { ok: false, count: current, limit };
  await store.set(key, String(current + 1));
  return { ok: true, count: current + 1, limit };
}
