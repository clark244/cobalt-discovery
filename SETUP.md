# Cobalt Discovery Agent — Setup & Test Checklist

This is the persistence version: reviewers enter a name, run the discovery
conversation, and each completed session is silently saved as a row in a
Google Sheet for you to review.

Work top to bottom. Check each box as you go. The whole thing is about
20–30 minutes the first time, most of it the Google service-account setup.

---

## Part 1 — Get the code onto GitHub

- [ ] Unzip the project (`cobalt-discovery`).
- [ ] Create a new GitHub repository (e.g. `cobalt-discovery`).
- [ ] Upload the unzipped contents to the repo. If GitHub's drag-and-drop
      drops the `src/` or `netlify/` folders, use the GitHub Desktop app
      instead — it preserves folder structure reliably.

---

## Part 2 — Connect Netlify

- [ ] At app.netlify.com → **Add new project** → **Import an existing project** → **GitHub**.
- [ ] Authorize Netlify to access the repo, then select it.
- [ ] Build settings auto-fill from `netlify.toml` (build command `npm run build`,
      publish dir `dist`, functions `netlify/functions`). Don't change them.
- [ ] Deploy. Note: this build installs `googleapis` and will take a bit
      longer than a plain front-end build. That's normal, not an error.

> Tip: if your project list ever looks empty later, it's the team selector
> at the top-left showing a different team. Switch teams, or scroll to the
> bottom of the team dashboard where all projects are listed.

---

## Part 3 — Anthropic API key (makes the chat work)

- [ ] At console.anthropic.com → **Settings → Billing** → add a payment method.
      (Skipping billing is the #1 cause of a valid key still returning errors.)
- [ ] **API Keys** → **Create Key** → name it `cobalt-netlify` → copy it immediately
      (shown only once; starts with `sk-ant-`).
- [ ] In Netlify → **Project configuration → Environment variables** → add:
      `ANTHROPIC_API_KEY` = your key.
- [ ] Optional but recommended: set a **monthly spend limit** in the Anthropic
      console as a backstop, since the key now serves live traffic.

> The key lives ONLY in Netlify's environment — never paste it into any file
> you commit to GitHub. The proxy function keeps it off the browser.

---

## Part 4 — Google Sheet (where sessions land)

- [ ] Create a Google Sheet in your Drive.
- [ ] In **row 1**, enter these eight headers across columns **A–H**, in order:

      timestamp | sessionId | reviewer | messageCount | transcript | model_json | clarity | capacity

- [ ] Copy the **Sheet ID** from the URL — the long string between `/d/` and `/edit`.

---

## Part 5 — Google service account (lets the app write to the sheet)

This is the fiddliest part. Take it slowly; each step matters.

- [ ] Go to console.cloud.google.com. Create a project (or pick an existing one).
- [ ] **APIs & Services → Library** → search **Google Sheets API** → **Enable**.
- [ ] **APIs & Services → Credentials → Create credentials → Service account.**
      Give it any name (e.g. `cobalt-sheets-writer`). Create it.
- [ ] Open the new service account → **Keys → Add key → Create new key → JSON.**
      A `.json` file downloads. It contains `client_email` and `private_key` —
      you'll need both. Keep this file safe; treat it like a password.
- [ ] **Share the sheet with the service account.** Open your Google Sheet →
      **Share** → paste the service account's email (the `client_email` value,
      ending in `iam.gserviceaccount.com`) → give it **Editor** → send.
      *(This step is the one most people forget — without it, writes fail
      silently even when everything else is correct.)*

---

## Part 6 — Three more environment variables in Netlify

From the downloaded JSON key file, add these in
**Netlify → Project configuration → Environment variables**:

- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` = the `client_email` value.
- [ ] `GOOGLE_PRIVATE_KEY` = the `private_key` value. Paste the **entire** thing,
      including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
      lines. (The function converts literal `\n` to real newlines, so pasting
      it as-is from the JSON file is fine.)
- [ ] `GOOGLE_SHEET_ID` = the Sheet ID from Part 4.
- [ ] **Trigger a deploy** (Deploys tab → Trigger deploy) so the function
      picks up the new variables.

---

## Part 7 — End-to-end test (do this BEFORE inviting reviewers)

- [ ] Open the live site (the `…netlify.app` URL, or your custom domain).
- [ ] On the welcome screen, enter the name **`TEST`** and click Start.
- [ ] Run a short discovery conversation — a few exchanges is enough to
      trigger the "Generate" button. (You can give brief, rough answers.)
- [ ] Click **Generate my Impact Process Model**. Confirm the model renders.
- [ ] Open your Google Sheet. Within a few seconds, a new row should appear
      with reviewer = `TEST`, a timestamp, the transcript, and the model JSON.
- [ ] If the row appears: ✅ you're live. Delete the TEST row and send the
      link to your reviewers.

### If the test row does NOT appear
Check these in order — they cover almost every failure:

- [ ] **Did you share the sheet with the service account email?** (Part 5,
      last step.) This is the most common miss.
- [ ] **Is `GOOGLE_SHEET_ID` correct?** It's only the middle part of the URL,
      not the whole URL.
- [ ] **Did the private key paste cleanly?** Re-copy the `private_key` value
      from the JSON file, including the BEGIN/END lines.
- [ ] **Did you trigger a deploy after adding the variables?** Env-var changes
      don't apply until the next deploy.
- [ ] To see the actual error: Netlify → your project → **Logs → Functions** →
      `save-session`. The error message there names the exact problem.

---

## Updating the app later

Edit `src/App.jsx` (or whichever file), commit/push to GitHub, and Netlify
rebuilds automatically in about a minute. Same URL, no reconfiguration.
If an update breaks something, the **Deploys** tab lets you republish any
previous deploy to roll back instantly.

---

## What each saved row contains

| Column | Meaning |
|---|---|
| timestamp | When the session was completed (ISO format) |
| sessionId | Unique per session, for telling runs apart |
| reviewer | The name/initials the reviewer entered |
| messageCount | Number of messages — a rough proxy for session length |
| transcript | The full conversation (GUIDE / FOUNDER turns) |
| model_json | The generated Impact Process Model, as JSON |
| clarity | Causal-model clarity score (1–4), broken out for sorting |
| capacity | Measurement-capacity score (1–4), broken out for sorting |
