// Fake Cloudflare Turnstile for tests: jsdom never loads the real script.
// By default the check passes at once with "test-token"; tests can replace
// window.turnstile (see installTurnstile) to simulate other outcomes.
import { afterEach, beforeEach, vi } from "vitest";

export function installTurnstile({ token = "test-token", fail = false, auto = true } = {}) {
  const widgets = new Map();
  let nextId = 1;
  const fake = {
    tokensIssued: 0,
    render: vi.fn((element, options) => {
      const id = `w${nextId++}`;
      widgets.set(id, options);
      if (fail) options["error-callback"]?.();
      else if (auto) {
        fake.tokensIssued += 1;
        options.callback(`${token}-${fake.tokensIssued}`);
      }
      return id;
    }),
    reset: vi.fn((id) => {
      const options = widgets.get(id);
      if (options && !fail && auto) {
        fake.tokensIssued += 1;
        options.callback(`${token}-${fake.tokensIssued}`);
      }
    }),
    remove: vi.fn((id) => widgets.delete(id)),
    // Complete a pending check by hand (when auto is false)
    solve(id = [...widgets.keys()].at(-1)) {
      fake.tokensIssued += 1;
      widgets.get(id).callback(`${token}-${fake.tokensIssued}`);
    },
  };
  window.turnstile = fake;
  return fake;
}

beforeEach(() => {
  installTurnstile();
});

afterEach(() => {
  delete window.turnstile;
});
