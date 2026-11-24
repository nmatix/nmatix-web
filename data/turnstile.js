// Cloudflare Turnstile (bot check on the registration form, #145).
// The site key is public; the secret key lives only in AWS Secrets Manager.
// The widget's allowed hostnames are set in the Cloudflare dashboard.
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAGQst24AKWy0k0gQ";

export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
