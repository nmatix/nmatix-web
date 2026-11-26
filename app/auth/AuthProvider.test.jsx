import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, SIGNED_IN_HINT, useAuth } from "./AuthProvider";

const mocks = vi.hoisted(() => ({ postJson: vi.fn(), getJson: vi.fn() }));
vi.mock("../signup/authApi", () => ({ postJson: mocks.postJson, getJson: mocks.getJson }));

const USER = { id: "usr_1", name: "Ravi", isAdmin: false, products: ["interior-quote-generator"] };
const SESSION = { idToken: "id-1", accessToken: "acc-1", expiresIn: 3600, user: USER };

// The context value of the last render, captured after render (not during it)
const captured = { current: null };
function Probe() {
  const value = useAuth();
  useEffect(() => {
    captured.current = value;
  });
  return (
    <div>
      <span data-testid="status">{value.status}</span>
      <span data-testid="name">{value.user?.name || ""}</span>
      <button onClick={() => value.signIn(SESSION)} type="button">
        sign in
      </button>
      <button onClick={() => value.signOut()} type="button">
        sign out
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

const status = () => screen.getByTestId("status").textContent;

describe("AuthProvider", () => {
  beforeEach(() => {
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("anonymous visitors are signed out without any network call", async () => {
    renderProvider();
    await waitFor(() => expect(status()).toBe("signedOut"));
    expect(mocks.postJson).not.toHaveBeenCalled();
    expect(mocks.getJson).not.toHaveBeenCalled();
  });

  it("restores a session after a page load using the session cookie", async () => {
    window.localStorage.setItem(SIGNED_IN_HINT, "1");
    mocks.postJson.mockResolvedValue({
      ok: true,
      status: 200,
      data: { idToken: "id-2", expiresIn: 3600 },
    });
    mocks.getJson.mockResolvedValue({ ok: true, status: 200, data: USER });

    renderProvider();

    await waitFor(() => expect(status()).toBe("signedIn"));
    expect(screen.getByTestId("name").textContent).toBe("Ravi");
    expect(mocks.postJson).toHaveBeenCalledWith("session/refresh", {});
    expect(mocks.getJson).toHaveBeenCalledWith("session", {
      headers: { "X-Session-Token": "id-2" },
    });
  });

  it("an expired or revoked session signs out and forgets the hint", async () => {
    window.localStorage.setItem(SIGNED_IN_HINT, "1");
    mocks.postJson.mockResolvedValue({
      ok: false,
      status: 401,
      data: { error: { code: "SESSION_EXPIRED" } },
    });

    renderProvider();

    await waitFor(() => expect(status()).toBe("signedOut"));
    expect(window.localStorage.getItem(SIGNED_IN_HINT)).toBeNull();
    expect(mocks.getJson).not.toHaveBeenCalled();
  });

  it("signing in keeps the token in memory only and remembers the browser", async () => {
    renderProvider();
    await waitFor(() => expect(status()).toBe("signedOut"));

    fireEvent.click(screen.getByText("sign in"));

    expect(status()).toBe("signedIn");
    expect(window.localStorage.getItem(SIGNED_IN_HINT)).toBe("1");
    const stored = JSON.stringify({ ...window.localStorage });
    expect(stored).not.toContain("id-1");
    expect(stored).not.toContain("acc-1");
  });

  it("refreshes the token a minute before it expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mocks.postJson.mockResolvedValue({
      ok: true,
      status: 200,
      data: { idToken: "id-new", expiresIn: 3600 },
    });
    renderProvider();
    await act(async () => {});
    fireEvent.click(screen.getByText("sign in"));

    await act(async () => vi.advanceTimersByTime(3539 * 1000));
    expect(mocks.postJson).not.toHaveBeenCalledWith("session/refresh", {});
    await act(async () => vi.advanceTimersByTime(2 * 1000));
    expect(mocks.postJson).toHaveBeenCalledWith("session/refresh", {});
  });

  it("authFetch sends the token, refreshes once on 401 and retries", async () => {
    renderProvider();
    await act(async () => {});
    fireEvent.click(screen.getByText("sign in"));
    mocks.getJson
      .mockResolvedValueOnce({ ok: false, status: 401, data: {} })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { hello: "world" } });
    mocks.postJson.mockResolvedValue({
      ok: true,
      status: 200,
      data: { idToken: "id-2", expiresIn: 3600 },
    });

    let result;
    await act(async () => {
      result = await captured.current.authFetch("session");
    });

    expect(result.data).toEqual({ hello: "world" });
    expect(mocks.getJson.mock.calls[0]).toEqual([
      "session",
      { headers: { "X-Session-Token": "id-1" } },
    ]);
    expect(mocks.getJson.mock.calls[1]).toEqual([
      "session",
      { headers: { "X-Session-Token": "id-2" } },
    ]);
  });

  it("authFetch signs out when the session cannot be refreshed", async () => {
    renderProvider();
    await act(async () => {});
    fireEvent.click(screen.getByText("sign in"));
    mocks.getJson.mockResolvedValue({ ok: false, status: 401, data: {} });
    mocks.postJson.mockResolvedValue({ ok: false, status: 401, data: {} });

    await act(async () => {
      await captured.current.authFetch("session");
    });

    expect(status()).toBe("signedOut");
  });

  it("signing out ends the session on the server and clears local state", async () => {
    renderProvider();
    await act(async () => {});
    fireEvent.click(screen.getByText("sign in"));
    mocks.postJson.mockResolvedValue({ ok: true, status: 200, data: {} });

    await act(async () => fireEvent.click(screen.getByText("sign out")));

    expect(status()).toBe("signedOut");
    expect(mocks.postJson).toHaveBeenCalledWith("session/logout", {});
    expect(window.localStorage.getItem(SIGNED_IN_HINT)).toBeNull();
  });

  it("a preview session needs no network and signs out locally", async () => {
    renderProvider();
    await act(async () => {});
    act(() => captured.current.signInPreview("p@example.com"));
    expect(status()).toBe("signedIn");
    expect(captured.current.user.preview).toBe(true);

    await act(async () => fireEvent.click(screen.getByText("sign out")));

    expect(status()).toBe("signedOut");
    expect(mocks.postJson).not.toHaveBeenCalled();
  });
});
