// Auth API endpoints. CloudFront routes /auth/* to the auth API; local Next.js
// development talks to the dev CloudFront distribution directly.
const DEVELOPMENT_AUTH_BASE = "https://d2ihao468hpdsu.cloudfront.net/auth";

export function getAuthBase() {
  // Backwards compatible with the old full register URL override
  const override = process.env.NEXT_PUBLIC_REGISTRATION_API_URL;
  if (override) return override.replace(/\/register\/?$/, "");
  return process.env.NODE_ENV === "development" ? DEVELOPMENT_AUTH_BASE : "/auth";
}

export function getAuthEndpoint(path) {
  return `${getAuthBase()}/${path}`;
}

// POST JSON and return { status, ok, data }; data is {} when the body is not JSON.
// Network failures throw, so callers can show a connection message.
export async function postJson(path, body) {
  const response = await fetch(getAuthEndpoint(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON error bodies fall back to generic messages
  }
  return { status: response.status, ok: response.ok, data: data || {} };
}
