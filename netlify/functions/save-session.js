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
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  // Netlify stores newlines as literal \n; turn them back into real newlines.
  privateKey = privateKey.replace(/\\n/g, "\n");

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
