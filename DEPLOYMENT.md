# Cobalt Discovery Agent — Deployment Guide

Current, reflecting how the project is actually set up and updated.

---

## Where things stand

- **App:** live on Netlify, connected to your GitHub repo. Works end to end.
- **Favicon:** blue hex logo, embedded directly in `index.html` (no `public/` folder).
- **Persistence:** code is built and in the repo, but **not yet active** — it's
  waiting on the Google service-account credentials that IT is unblocking.
  Until those environment variables are set, the app works normally and the
  end-of-session save simply does nothing (it fails silently by design).

---

## How to deploy an update (the normal loop)

Your repo is linked to Netlify, so **every push to GitHub auto-rebuilds the
live site** in about a minute. Same URL, no reconfiguration. The only question
is how you get the changed file(s) into GitHub.

### Preferred: GitHub Desktop (reliable for any change)

Use this for anything involving `src/App.jsx`, folders, or multiple files.
It mirrors your local folder exactly, so nested folders never get dropped.

1. Unzip the latest `cobalt-discovery-deploy.zip`.
2. Copy the changed file(s) into your **cloned local repo folder**, replacing
   the old versions when prompted. (For a single-file change, you can instead
   copy just that one file — e.g. the standalone `App.jsx` — over the existing one.)
3. Open **GitHub Desktop**. The **Changes** panel lists what changed. Confirm
   the files you expect are there.
4. Type a short summary (e.g. `Remove know/prove disc`), click **Commit to main**.
5. Click **Push origin** at the top.
6. Netlify rebuilds automatically. Wait ~1 minute.

### Quick alternative: web editor (single small file only)

Fine for a one-line text tweak to a file that isn't huge. Avoid for `App.jsx`
(it's large due to the embedded logo) and never use it for folders.

1. On github.com, open the file → click the pencil icon.
2. Select all, delete, paste the new contents.
3. Commit. Netlify rebuilds automatically.

---

## After any deploy: two gotchas

- **Post-processing looks stuck.** Harmless — the build already succeeded.
  Check the live URL; if it's current, ignore the spinner.
- **Change not showing (esp. favicon/visuals).** Browser cache. Hard-refresh
  (Cmd/Ctrl+Shift+R) or open in a private window. If it shows there, it deployed
  fine and your normal browser was just holding the old version.

To force a fully clean rebuild: Netlify → **Deploys → Trigger deploy →
Clear cache and deploy site**.

---

## Rolling back

- **Just get the live site back to a good version:** Netlify → **Deploys** →
  click a previous good deploy → **Publish deploy**. Instant, no rebuild,
  non-destructive.
- **Undo a committed code change:** GitHub Desktop → **History** tab →
  right-click the commit → **Revert changes in commit** → **Push origin**.
  (Use Revert, not reset/force-push — it's the safe, non-destructive option.)

---

## Still to do: activate persistence (blocked on IT)

Once IT provides the Google service-account access, finish these:

1. **Create the Google Sheet** with row-1 headers across columns A–H:
   `timestamp | sessionId | reviewer | messageCount | transcript | model_json | clarity | capacity`
   Copy its Sheet ID from the URL (the string between `/d/` and `/edit`).
2. **Share that Sheet** (Editor) with the service account's email
   (`…iam.gserviceaccount.com`). *Most-forgotten step — without it, writes fail.*
3. In **Netlify → Project configuration → Environment variables**, add:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the service account email
   - `GOOGLE_PRIVATE_KEY` — the full private key, incl. BEGIN/END lines
   - `GOOGLE_SHEET_ID` — from step 1
   (`ANTHROPIC_API_KEY` is already set from initial setup.)
4. **Trigger a deploy** so the function picks up the new variables.
5. **Test:** open the live site, run a session as `TEST`, generate the model,
   and confirm a row lands in the Sheet. Delete the TEST row, then invite reviewers.

> If IT offers **workload identity federation** (keyless auth) instead of a JSON
> key, that's more secure but needs a different setup in the `save-session`
> function — bring their response back and the function gets reworked to match.

If the test row doesn't appear: check that the Sheet was shared with the service
account, that `GOOGLE_SHEET_ID` is just the ID (not the whole URL), that the
private key pasted cleanly, and that you deployed after adding the variables.
The exact error shows in Netlify → **Logs → Functions → save-session**.
