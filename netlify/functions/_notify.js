// Sends a notification email on each completed discovery session.
// Uses Resend's HTTP API directly (no SDK / no new dependency). To switch
// providers (SendGrid, Mailgun, Postmark, SES), replace only the fetch() call
// below. This helper NEVER throws: a mail failure logs and returns, so it can
// never block saving a session.

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1GLk3I8cmprn6RylBuzAW3Dp4xUrNMFPJPfp_BJhyPgg/edit";

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function sendCompletionEmail({
  sessionId,
  reviewer,
  account,
  ip,
  messageCount,
  model,
  transcript,
  timestamp,
}) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_TO;
  const from = process.env.ALERT_FROM || "Cobalt Discovery <alerts@cobaltcollective.org>";
  if (!key || !to) {
    console.log("[notify] skipped — set RESEND_API_KEY and ALERT_TO to enable completion emails");
    return;
  }

  const m = model || {};
  const mat = m.maturity || {};
  const company = m.company || "Unknown company";
  const full = transcript || "";
  const preview = full.slice(0, 1500);
  const truncated = full.length > 1500 ? "\n…(truncated — full transcript in the sheet)" : "";

  const row = (label, val) =>
    `<tr><td style="padding:2px 12px 2px 0;color:#666">${label}</td><td>${val}</td></tr>`;

  const subject = `New discovery completion — ${company}${reviewer ? ` (${reviewer})` : ""}`;
  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:14px;color:#111">
    <h2 style="margin:0 0 10px">New completed discovery session</h2>
    <table style="border-collapse:collapse;font-size:13px">
      ${row("Company", esc(company))}
      ${row("Verified email", esc(account) || "<em>none</em>")}
      ${row("Name entered", esc(reviewer) || "<em>none</em>")}
      ${row("Clarity", esc(mat.clarity))}
      ${row("Capacity", esc(mat.capacity))}
      ${row("Messages", esc(messageCount))}
      ${row("Session ID", esc(sessionId))}
      ${row("IP", esc(ip))}
      ${row("Time", esc(timestamp))}
    </table>
    <p style="margin:14px 0 4px;color:#666">Transcript preview</p>
    <pre style="white-space:pre-wrap;background:#f6f6f6;padding:10px;border-radius:6px;font-size:12px;max-width:640px">${esc(preview)}${truncated}</pre>
    <p style="margin-top:12px"><a href="${SHEET_URL}">Open the results sheet →</a></p>
    <p style="color:#999;font-size:11px;margin-top:16px">Note: "Name entered" is a free-text field and can be spoofed. The verified email is now the primary identifier; IP is secondary. Several of these arriving in a short window is the burst signature to watch for.</p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        subject,
        html,
      }),
    });
    if (!res.ok) console.log("[notify] send failed", res.status, await res.text());
  } catch (e) {
    console.log("[notify] send error", String(e));
  }
}
