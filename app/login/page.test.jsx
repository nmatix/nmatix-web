import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const mocks = vi.hoisted(() => ({ postJson: vi.fn(), replace: vi.fn() }));

vi.mock("../signup/authApi", () => ({ postJson: mocks.postJson }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Login Page", () => {
  beforeEach(() => {
    mocks.postJson.mockReset();
    mocks.replace.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders the email form and a link to signup", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Login" })).toBeTruthy();
    expect(screen.getByLabelText("Email").getAttribute("type")).toBe("email");
    expect(screen.getByRole("button", { name: "Send code" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign-up" }).getAttribute("href")).toBe("/signup");
  });

  it("requests a code and shows the six-digit verification form and resend countdown", async () => {
    mocks.postJson.mockResolvedValue({ ok: true, status: 200, data: { resendAfterSeconds: 45 } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "USER@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));

    await waitFor(() =>
      expect(mocks.postJson).toHaveBeenCalledWith("otp/request", { email: "user@example.com" })
    );
    expect(await screen.findByLabelText("One-time code")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("If an account exists");
    expect(screen.getByRole("button", { name: "Resend code in 0:45" }).disabled).toBe(true);
  });

  it("uses the development happy path and opens the dashboard preview", async () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<LoginPage />);

    expect(screen.getByText(/Development preview: no email is sent/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "preview@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));

    expect(await screen.findByText(/no email is sent\. Enter any six-digit code/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("One-time code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and log in" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/dashboard"));
    expect(mocks.postJson).not.toHaveBeenCalled();
  });

  it("validates six digits and redirects after a successful verification", async () => {
    mocks.postJson
      .mockResolvedValueOnce({ ok: true, status: 200, data: {} })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { redirectTo: "/dashboard" } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    const codeInput = await screen.findByLabelText("One-time code");
    fireEvent.change(codeInput, { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and log in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Enter the 6-digit code");

    fireEvent.change(codeInput, { target: { value: "482913" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and log in" }));

    await waitFor(() =>
      expect(mocks.postJson).toHaveBeenLastCalledWith("otp/verify", {
        email: "user@example.com",
        code: "482913",
      })
    );
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows invalid and expired code errors from the auth service", async () => {
    mocks.postJson
      .mockResolvedValueOnce({ ok: true, status: 200, data: {} })
      .mockResolvedValueOnce({ ok: false, status: 400, data: { error: { code: "CODE_EXPIRED" } } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    fireEvent.change(await screen.findByLabelText("One-time code"), { target: { value: "482913" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and log in" }));

    expect((await screen.findByRole("alert")).textContent).toContain("That code has expired");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
