// Versions of the legal documents users accept when registering.
// Bump a version whenever its document changes, together with the matching
// TERMS_VERSION / PRIVACY_VERSION in nmatix-infra (cdk/config.py); the backend
// rejects registrations that accepted an older version.
export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";

export const TERMS_PATH = "/terms";
export const PRIVACY_PATH = "/privacy";
