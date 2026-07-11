# Cobalt Discovery Agent

React + Vite app, deployed on Netlify. The Anthropic API call is proxied
through a Netlify serverless function so the API key stays server-side.

test

## Setup
1. Push this repo to GitHub.
2. In Netlify: New site from Git → pick this repo. Build settings auto-detected from netlify.toml.
3. In Netlify → Site settings → Environment variables, add:
   ANTHROPIC_API_KEY = your key
4. Deploy. The live URL is stable; every push to GitHub redeploys automatically.

## Updating
Edit src/App.jsx (or any file), commit/push to GitHub, Netlify rebuilds in ~1 min.
