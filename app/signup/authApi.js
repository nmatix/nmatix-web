// API endpoints. CloudFront routes /auth/* to the auth API and /app/* to the product API
// (#157); local Next.js development talks to the dev CloudFront distribution directly.
const DEVELOPMENT_AUTH_BASE = "https://d2ihao468hpdsu.cloudfront.net/auth";
const DEVELOPMENT_APP_BASE = "https://d2ihao468hpdsu.cloudfront.net/app";

export function getAppBase() {
  return process.env.NODE_ENV === "development" ? DEVELOPMENT_APP_BASE : "/app";
}

export function getAuthBase() {
  // Backwards compatible with the old full register URL override
  const override = process.env.NEXT_PUBLIC_REGISTRATION_API_URL;
  if (override) return override.replace(/\/register\/?$/, "");
  return process.env.NODE_ENV === "development" ? DEVELOPMENT_AUTH_BASE : "/auth";
}

export function getAuthEndpoint(path) {
  return `${getAuthBase()}/${path}`;
}

async function requestJson(path, { method = "GET", body, headers = {}, base } = {}) {
  const response = await fetch(base ? `${base}/${path}` : getAuthEndpoint(path), {
    method,
    // Same origin (CloudFront /auth/*): the HttpOnly session cookie travels with
    // /auth/session requests automatically; page code never reads it.
    credentials: "same-origin",
    headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON error bodies fall back to generic messages
  }
  return { status: response.status, ok: response.ok, data: data || {} };
}

// POST JSON and return { status, ok, data }; data is {} when the body is not JSON.
// Network failures throw, so callers can show a connection message.
export function postJson(path, body, { headers } = {}) {
  return requestJson(path, { method: "POST", body, headers });
}

export function getJson(path, { headers } = {}) {
  return requestJson(path, { method: "GET", headers });
}

// Product API (/app/*) request; callers go through AuthProvider's appFetch, which adds
// the session token and refreshes it once on 401.
export function appRequest(path, { method = "GET", body, headers } = {}) {
  return requestJson(path, { method, body, headers, base: getAppBase() });
}
