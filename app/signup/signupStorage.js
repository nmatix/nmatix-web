// Keeps the verification step across a page refresh (sessionStorage: this tab only,
// cleared when the tab closes). Holds the registration ID, the masked email and when
// a new code may be requested; never the code or any unmasked personal data.
const KEY = "nmatix.signup.pending";

export function loadPendingVerification() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(KEY) || "null");
    if (value && typeof value.id === "string" && typeof value.email === "string") {
      return value;
    }
  } catch {
    // Storage unavailable or corrupt: start from the form
  }
  return null;
}

export function savePendingVerification(pending) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Storage unavailable (private mode, blocked): the flow still works without it
  }
}

export function clearPendingVerification() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear
  }
}
