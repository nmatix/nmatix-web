import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SignupFlow from "./SignupFlow";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const STORAGE_KEY = "nmatix.signup.pending";
const REGISTERED = {
  id: "usr_ABCDEFGHJKMNPQRSTUVWXYZ2",
  status: "unverified",
  email: "p***@example.com",
  codeSent: true,
  resendAfterSeconds: 60,
};

// Queue responses per endpoint; each call takes the next one (the last one repeats).
let responses;
function mockApi(routes) {
  responses = routes;
  fetch.mockImplementation(async (url, options) => {
    const path = Object.keys(responses).find((p) => url.endsWith(p));
    const queue = responses[path];
    const [status, body] = queue.length > 1 ? queue.shift() : queue[0];
    mockApi.calls.push({ path, body: JSON.parse(options.body) });
    return { ok: status < 400, status, json: async () => body };
  });
}
mockApi.calls = [];

function callsTo(path) {
  return mockApi.calls.filter((c) => c.path === path);
}

async function registerAndReachVerifyStep(registerResponse = REGISTERED) {
  responses.register = [[201, registerResponse]];
  render(<SignupFlow />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Example Person" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "98765 43210" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form"));
  await screen.findByRole("heading", { name: "Check your email" });
  // The step changed inside an async fetch callback; flush its effects (focus, countdown timer)
  await act(async () => {});
}

function enterCode(code) {
  fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: code } });
  fireEvent.submit(screen.getByRole("button", { name: "Verify email" }).closest("form"));
}

describe("SignupFlow", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("fetch", vi.fn());
    mockApi.calls = [];
    mockApi({ register: [[201, REGISTERED]] });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("moves to the email code step after registering", async () => {
    await registerAndReachVerifyStep();

    expect(screen.getByText("p***@example.com")).toBeTruthy();
    const input = screen.getByLabelText("Verification code");
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(document.activeElement).toBe(input);
  });

  it("shows a resend countdown and enables resend when it ends", async () => {
    await registerAndReachVerifyStep();
    const resend = () => screen.getByRole("button", { name: /Send a new code/ });

    expect(resend().textContent).toBe("Send a new code in 1:00");
    expect(resend().disabled).toBe(true);

    act(() => vi.advanceTimersByTime(30_000));
    expect(resend().textContent).toBe("Send a new code in 0:30");

    act(() => vi.advanceTimersByTime(31_000));
    expect(resend().textContent).toBe("Send a new code");
    expect(resend().disabled).toBe(false);
  });

  it("activates the account with the right code and shows the login screen", async () => {
    responses["otp/verify"] = [[200, { id: REGISTERED.id, status: "active" }]];
    await registerAndReachVerifyStep();

    enterCode("123456");

    expect(await screen.findByRole("heading", { name: "Your account is ready" })).toBeTruthy();
    expect(screen.getByText("You can now log in.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Login" }).getAttribute("href")).toBe("/login");
    expect(callsTo("otp/verify")[0].body).toEqual({
      registrationId: REGISTERED.id,
      code: "123456",
    });
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("checks the code format before sending", async () => {
    await registerAndReachVerifyStep();

    enterCode("12a4");

    expect(screen.getByText("Enter the 6-digit code from the email.")).toBeTruthy();
    expect(callsTo("otp/verify")).toHaveLength(0);
  });

  it("keeps only digits and at most six of them", async () => {
    await registerAndReachVerifyStep();
    const input = screen.getByLabelText("Verification code");

    fireEvent.change(input, { target: { value: "12 34-5678" } });

    expect(input.value).toBe("123456");
  });

  it("shows how many attempts are left after a wrong code", async () => {
    responses["otp/verify"] = [[400, { error: { code: "INVALID_CODE" }, attemptsRemaining: 4 }]];
    await registerAndReachVerifyStep();

    enterCode("000000");

    expect(await screen.findByText("That code is not correct. 4 attempts left.")).toBeTruthy();
    expect(screen.getByLabelText("Verification code").value).toBe("");
  });

  it.each([
    ["CODE_LOCKED", 429, "Too many incorrect attempts. Request a new code to try again."],
    ["CODE_EXPIRED", 410, "This code has expired. Request a new code."],
    ["CODE_NOT_FOUND", 404, "This code is no longer valid. Request a new code."],
  ])("explains %s", async (code, status, message) => {
    responses["otp/verify"] = [[status, { error: { code } }]];
    await registerAndReachVerifyStep();

    enterCode("123456");

    expect(await screen.findByText(message)).toBeTruthy();
  });

  it("sends a new code and restarts the countdown", async () => {
    responses["otp/resend"] = [
      [
        200,
        { id: REGISTERED.id, email: "p***@example.com", codeSent: true, resendAfterSeconds: 60 },
      ],
    ];
    await registerAndReachVerifyStep();
    act(() => vi.advanceTimersByTime(61_000));

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    expect(await screen.findByText("We sent a new code to p***@example.com.")).toBeTruthy();
    expect(callsTo("otp/resend")[0].body).toEqual({ registrationId: REGISTERED.id });
    expect(screen.getByRole("button", { name: /Send a new code in 1:00/ }).disabled).toBe(true);
  });

  it("follows the server's wait time when resending too soon", async () => {
    responses["otp/resend"] = [
      [429, { error: { code: "RESEND_TOO_SOON" }, retryAfterSeconds: 15 }],
    ];
    await registerAndReachVerifyStep();
    act(() => vi.advanceTimersByTime(61_000));

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    expect(await screen.findByRole("button", { name: "Send a new code in 0:15" })).toBeTruthy();
  });

  it("stops offering new codes at the limit", async () => {
    responses["otp/resend"] = [[429, { error: { code: "RESEND_LIMIT_REACHED" } }]];
    await registerAndReachVerifyStep();
    act(() => vi.advanceTimersByTime(61_000));

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    expect(
      await screen.findByText("You've requested the maximum number of codes for this registration.")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send a new code" }).disabled).toBe(true);
  });

  it("tells the user when the code email could not be sent", async () => {
    await registerAndReachVerifyStep({ ...REGISTERED, codeSent: false });

    expect(
      screen.getByText(
        "We couldn't send your code. Request a new code when the timer reaches zero."
      )
    ).toBeTruthy();
  });

  it("explains a lost race and offers login or registering again", async () => {
    responses["otp/verify"] = [
      [
        409,
        {
          error: {
            code: "ALREADY_REGISTERED",
            fields: { email: "This email is already registered." },
          },
        },
      ],
    ];
    await registerAndReachVerifyStep();

    enterCode("123456");

    expect(
      await screen.findByText(
        "This email is now registered to another account. Log in, or register again with different details."
      )
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Login" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Register again" }));
    expect(screen.getByRole("button", { name: "Create account" })).toBeTruthy();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("sends an expired registration back to the form", async () => {
    responses["otp/verify"] = [[410, { error: { code: "REGISTRATION_EXPIRED" } }]];
    await registerAndReachVerifyStep();

    enterCode("123456");

    expect(
      await screen.findByText("This registration has expired. Please register again.")
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
  });

  it("lets the user go back and use different details", async () => {
    await registerAndReachVerifyStep();

    fireEvent.click(screen.getByRole("button", { name: "Use different details" }));

    expect(screen.getByRole("button", { name: "Create account" })).toBeTruthy();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps the verification step after a page refresh", async () => {
    await registerAndReachVerifyStep();
    act(() => vi.advanceTimersByTime(20_000));
    cleanup(); // simulate leaving the page

    render(<SignupFlow />);

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeTruthy();
    expect(screen.getByText("p***@example.com")).toBeTruthy();
    // The countdown continues where it was, not from the start
    expect(screen.getByRole("button", { name: /Send a new code in 0:40/ })).toBeTruthy();
  });

  it("stores only the registration ID, masked email and resend time", async () => {
    await registerAndReachVerifyStep();

    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));

    expect(Object.keys(saved).sort()).toEqual(["codeSent", "email", "id", "resendAt"]);
    expect(saved.email).toBe("p***@example.com");
  });

  it("never asks for a password", async () => {
    responses["otp/verify"] = [[200, { status: "active" }]];
    const { container } = render(<SignupFlow />);
    expect(container.querySelector('input[type="password"]')).toBeNull();
    cleanup();

    await registerAndReachVerifyStep();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    enterCode("123456");
    await screen.findByRole("heading", { name: "Your account is ready" });
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it("works with the keyboard: every control is a real button, link or labelled input", async () => {
    await registerAndReachVerifyStep();

    for (const input of document.querySelectorAll("input")) {
      expect(screen.getByLabelText(input.labels[0].textContent)).toBe(input);
    }
    for (const button of screen.getAllByRole("button")) {
      expect(button.tagName).toBe("BUTTON");
    }
  });
});
