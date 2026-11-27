// Shared helpers for page tests that need a signed-in session and product API answers.
export const STEP_IDS = [
  "business_profile",
  "rate_card",
  "packages",
  "room_templates",
  "adjustments",
];

export function setupData({ steps = {}, startHere = "business_profile", complete = false } = {}) {
  return {
    steps: STEP_IDS.map((id) => ({
      id,
      status: "not_started",
      available: id === "business_profile",
      ...(steps[id] || {}),
    })),
    complete,
    startHere,
  };
}

export const CONTRACTOR = {
  id: "usr_1",
  name: "Ravi Kumar",
  email: "ravi@example.com",
  isAdmin: false,
  products: ["interior-quote-generator"],
};
export const ADMIN = {
  id: "usr_2",
  name: "Kiran",
  email: "kiran@nmatix.com",
  isAdmin: true,
  products: [],
};

/** Signed in as `user`; /app/<path> answers come from `routes` (value or function). */
export function signIn(mocks, user, routes) {
  window.localStorage.setItem("nmx.signedIn", "1");
  mocks.postJson.mockResolvedValue({
    ok: true,
    status: 200,
    data: { idToken: "id-1", expiresIn: 3600 },
  });
  mocks.getJson.mockResolvedValue({ ok: true, status: 200, data: user });
  mocks.appRequest.mockImplementation(async (path) => {
    const answer = routes[path];
    const value = typeof answer === "function" ? answer() : answer;
    if (value instanceof Error) throw value;
    return value && "ok" in value ? value : { ok: true, status: 200, data: value };
  });
}
