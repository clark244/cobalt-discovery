// Netlify serverless function: proxies browser requests to the Anthropic API.
// The API key lives ONLY here, in a server-side environment variable — never in the browser.
// The browser calls /.netlify/functions/claude; this forwards to Anthropic with the key attached.

export default async (req) => {
  // Only allow POST.
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({ error: "Server missing ANTHROPIC_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Upstream request failed", detail: String(e) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
