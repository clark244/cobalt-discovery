// Netlify serverless function: appends one discovery session as a row in a Google Sheet.
// Auth uses a Google service account (credentials live in server-side env vars, never in the browser).
//
// Required environment variables (set in Netlify → Project configuration → Environment variables):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL   — the service account's email (…@….iam.gserviceaccount.com)
//   GOOGLE_PRIVATE_KEY             — the service account's private key (paste the full key, including
//                                    the BEGIN/END lines; newlines may be stored as literal \n)
//   GOOGLE_SHEET_ID               — the spreadsheet ID (from its URL)
//
// The target sheet should have a header row:
//   timestamp | sessionId | reviewer | messageCount | transcript | model_json | clarity | capacity

import { google } from "googleapis";
import { bump, clientIp } from "./_ratelimit.js";
import { sendCompletionEmail } from "./_notify.js";

const SESSION_WRITES_PER_DAY = Number(process.env.SESSION_WRITES_PER_DAY || 5);

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // Robustly normalize the private key regardless of how it was pasted.
  // Handles: literal \n sequences, double-escaped \\n, surrounding quotes,
  // Windows \r\n, and a key pasted as one line with spaces between base64.
  const normalizePrivateKey = (raw) => {
    let k = raw || "";
    k = k.trim();
    // Strip a single pair of wrapping quotes if the whole value is quoted.
    if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
      k = k.slice(1, -1);
    }
    // Collapse double-escaped, then convert literal \n and \r to real newlines.
    k = k.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "");
    k = k.replace(/\r/g, "");
    // If there are no real newlines at all, rebuild the PEM structure:
    // put the BEGIN/END markers on their own lines and re-wrap the base64 body.
    if (!k.includes("\n")) {
      const m = k.match(/-----BEGIN PRIVATE KEY-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END PRIVATE KEY-----/);
      if (m) {
        const body = m[1].replace(/\s+/g, "");
        const wrapped = body.match(/.{1,64}/g).join("\n");
        k = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
      }
    }
    // Ensure a trailing newline (some parsers require it).
    if (!k.endsWith("\n")) k += "\n";
    return k;
  };

  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!email || !privateKey || !sheetId) {
    return new Response(
      JSON.stringify({ error: "Server missing Google Sheets credentials" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // Lightweight "signal" rows (traffic source, or a volunteered email) go to a
    // separate "Signals" tab so they never collide with the Sheet1 session columns.
    // Signals tab header: timestamp | sessionId | reviewer | kind | referrer | utm | email
    if (body.type === "signal") {
      const srow = [
        body.timestamp || new Date().toISOString(),
        body.sessionId || "",
        body.reviewer || "",
        body.kind || "",
        body.referrer || "",
        body.utm || "",
        body.email || "",
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "Signals!A:G",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [srow] },
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Defense against direct pollution of the sheet (this endpoint is publicly
    // callable on its own, not only via the app). Signals are exempt; only full
    // session rows are capped. See _ratelimit.js for the shared-IP caveat.
    const writeGate = await bump("write", clientIp(req), SESSION_WRITES_PER_DAY);
    if (!writeGate.ok) {
      return new Response(JSON.stringify({ error: "Daily session limit reached." }), {
        status: 429, headers: { "Content-Type": "application/json" },
      });
    }

    const m = body.model || {};
    const maturity = m.maturity || {};

    const row = [
      body.timestamp || new Date().toISOString(),
      body.sessionId || "",
      body.reviewer || "",
      body.messageCount ?? "",
      body.transcript || "",
      JSON.stringify(body.model || {}),
      maturity.clarity ?? "",
      maturity.capacity ?? "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:H",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    // Alert on every completed session (best-effort — never blocks the save).
    await sendCompletionEmail({
      sessionId: body.sessionId,
      reviewer: body.reviewer,
      ip: clientIp(req),
      messageCount: body.messageCount,
      model: body.model,
      transcript: body.transcript,
      timestamp: body.timestamp || new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Sheet append failed", detail: String(e) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
