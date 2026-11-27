import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { SetupProvider } from "../../auth/SetupProvider";
import { ADMIN, CONTRACTOR, setupData, signIn } from "../../test-helpers/appMocks";
import BusinessProfilePage from "./page";
import { checkLogoFile } from "./uploadLogo";

const mocks = vi.hoisted(() => ({
  postJson: vi.fn(),
  getJson: vi.fn(),
  appRequest: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("../../signup/authApi", () => ({
  postJson: mocks.postJson,
  getJson: mocks.getJson,
  appRequest: mocks.appRequest,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const DEFAULTS = {
  businessName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  website: "",
  brandColour: "#FF8A05",
  disclaimer: "This is an indicative estimate, not a quotation.",
  validityDays: 30,
  showItemRates: true,
  areaUnit: "sqft",
  logoUrl: null,
};
const SAVED = { ...DEFAULTS, businessName: "Sharma Interiors", contactPhone: "+91 98765 43210" };

function renderPage() {
  return render(
    <AuthProvider>
      <SetupProvider>
        <BusinessProfilePage />
      </SetupProvider>
    </AuthProvider>
  );
}

/** Routes for appRequest: GET profile, PUT profile, logo calls; setup flips once saved. */
function contractorWith({ profile = DEFAULTS, put, logo } = {}) {
  let saved = false;
  mocks.appRequest.mockReset();
  signIn(mocks, CONTRACTOR, {});
  mocks.appRequest.mockImplementation(async (path, { method } = {}) => {
    if (path === "setup") {
      return {
        ok: true,
        status: 200,
        data: saved
          ? setupData({
              steps: { business_profile: { status: "complete", available: true } },
              complete: true,
              startHere: null,
            })
          : setupData(),
      };
    }
    if (path === "profile" && method === "GET")
      return { ok: true, status: 200, data: { profile, saved: false } };
    if (path === "profile" && method === "PUT") {
      const answer = put
        ? await put()
        : { ok: true, status: 200, data: { profile: SAVED, saved: true } };
      if (answer.ok) saved = true;
      return answer;
    }
    if (path.startsWith("profile/logo")) return logo(method);
    throw new Error(`unexpected ${method} ${path}`);
  });
}

const field = (name) => screen.getByLabelText(name, { exact: false });

describe("Settings › Business profile (#30)", () => {
  beforeEach(() => {
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.appRequest.mockReset();
    mocks.replace.mockReset();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => cleanup());

  it("sends signed-out visitors to the login page", async () => {
    renderPage();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login/"));
  });

  it("is not available to users without the product", async () => {
    signIn(mocks, ADMIN, {});
    renderPage();
    expect(await screen.findByRole("heading", { name: "Not available" })).toBeTruthy();
  });

  it("loads the defaults for a new contractor, with the Settings navigation", async () => {
    contractorWith();
    renderPage();
    expect(await screen.findByRole("heading", { name: "Business profile" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(within(nav).getByText("Business profile").getAttribute("aria-current")).toBe("page");
    expect(field("Business name").value).toBe("");
    expect(field("Estimates are valid for").value).toBe("30");
    expect(field("Disclaimer").value).toContain("estimate");
    expect(screen.getByLabelText("Square feet").checked).toBe(true);
    expect(screen.getByLabelText("Show item rates on the estimate PDF").checked).toBe(true);
    expect(screen.getByText("Amounts are always in Indian rupees (₹).")).toBeTruthy();
  });

  it("updates the estimate preview as you type", async () => {
    contractorWith();
    renderPage();
    await screen.findByRole("heading", { name: "Business profile" });
    const preview = screen.getByRole("complementary", { name: "Estimate preview" });
    expect(within(preview).getByText("Your business name")).toBeTruthy();

    fireEvent.change(field("Business name"), { target: { value: "Sharma Interiors" } });
    fireEvent.change(field("Contact phone"), { target: { value: "+91 98765 43210" } });
    fireEvent.change(field("Estimates are valid for"), { target: { value: "45" } });
    fireEvent.click(screen.getByLabelText("Square metres"));
    expect(within(preview).getByText("Sharma Interiors")).toBeTruthy();
    expect(within(preview).getByText("+91 98765 43210")).toBeTruthy();
    expect(within(preview).getByText(/Valid for 45 days/)).toBeTruthy();
    expect(within(preview).getByText(/square metres/)).toBeTruthy();
  });

  it("saves the profile, then offers the dashboard once setup is complete", async () => {
    contractorWith();
    renderPage();
    await screen.findByRole("heading", { name: "Business profile" });
    fireEvent.change(field("Business name"), { target: { value: "Sharma Interiors" } });
    fireEvent.change(field("Contact phone"), { target: { value: "+91 98765 43210" } });
    fireEvent.change(field("Estimates are valid for"), { target: { value: "45" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));

    const put = mocks.appRequest.mock.calls.find(([p, o]) => p === "profile" && o.method === "PUT");
    expect(put[1].body).toMatchObject({
      businessName: "Sharma Interiors",
      contactPhone: "+91 98765 43210",
      validityDays: 45,
      areaUnit: "sqft",
      showItemRates: true,
    });
    expect(await screen.findByText(/Saved\./)).toBeTruthy();
    expect(
      (await screen.findByRole("link", { name: "Go to your dashboard" })).getAttribute("href")
    ).toBe("/dashboard/");
  });

  it("shows the server's field errors next to the fields", async () => {
    contractorWith({
      put: async () => ({
        ok: false,
        status: 400,
        data: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please correct the highlighted fields.",
            fields: {
              businessName: "Required.",
              contactEmail: "Enter a contact email or phone number.",
            },
          },
        },
      }),
    });
    renderPage();
    await screen.findByRole("heading", { name: "Business profile" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));

    expect(await screen.findByText("Required.")).toBeTruthy();
    expect(field("Business name").getAttribute("aria-invalid")).toBe("true");
    expect(field("Contact email").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Please correct the highlighted fields.");
  });

  it("explains a failed save", async () => {
    contractorWith({ put: async () => ({ ok: false, status: 500, data: {} }) });
    renderPage();
    await screen.findByRole("heading", { name: "Business profile" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't save/);
  });

  describe("logo", () => {
    const png = () =>
      new File([new Uint8Array([137, 80, 78, 71])], "logo.png", { type: "image/png" });

    it("checks the file type and size before uploading", () => {
      expect(checkLogoFile(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/PNG or JPEG/);
      const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
      expect(checkLogoFile(big)).toMatch(/2 MB/);
      expect(checkLogoFile(png())).toBeNull();
    });

    it("uploads to the presigned form, confirms, and shows the logo", async () => {
      const s3 = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 204 });
      contractorWith({
        logo: async (method) =>
          method === "POST"
            ? {
                ok: true,
                status: 200,
                data: {
                  key: "pending/u/logo-1",
                  upload: {
                    url: "https://bucket.s3.example/",
                    fields: { key: "pending/u/logo-1", policy: "p" },
                  },
                },
              }
            : {
                ok: true,
                status: 200,
                data: {
                  profile: { ...DEFAULTS, logoUrl: "https://bucket.s3.example/logo.png" },
                  saved: false,
                },
              },
      });
      renderPage();
      await screen.findByRole("heading", { name: "Business profile" });
      await act(async () =>
        fireEvent.change(screen.getByLabelText("Upload logo"), { target: { files: [png()] } })
      );

      expect(await screen.findByText("Logo updated.")).toBeTruthy();
      expect(screen.getByAltText("Your logo").getAttribute("src")).toBe(
        "https://bucket.s3.example/logo.png"
      );
      const [url, init] = s3.mock.calls[0];
      expect(url).toBe("https://bucket.s3.example/");
      expect(init.method).toBe("POST");
      expect(init.body.get("key")).toBe("pending/u/logo-1");
      expect(init.body.get("file").name).toBe("logo.png");
      const confirm = mocks.appRequest.mock.calls.find(
        ([p, o]) => p === "profile/logo" && o.method === "PUT"
      );
      expect(confirm[1].body).toEqual({ key: "pending/u/logo-1" });
    });

    it("refuses a wrong file type without contacting the server", async () => {
      contractorWith({ logo: async () => ({ ok: true, status: 200, data: {} }) });
      renderPage();
      await screen.findByRole("heading", { name: "Business profile" });
      const gif = new File(["x"], "a.gif", { type: "image/gif" });
      await act(async () =>
        fireEvent.change(screen.getByLabelText("Upload logo"), { target: { files: [gif] } })
      );
      expect((await screen.findByRole("alert")).textContent).toBe("Upload a PNG or JPEG image.");
      expect(mocks.appRequest.mock.calls.some(([p]) => p.startsWith("profile/logo"))).toBe(false);
    });

    it("shows the server's reason when the image is rejected", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 204 });
      contractorWith({
        logo: async (method) =>
          method === "POST"
            ? {
                ok: true,
                status: 200,
                data: { key: "k", upload: { url: "https://s3/", fields: {} } },
              }
            : {
                ok: false,
                status: 400,
                data: { error: { message: "Upload a PNG or JPEG image." } },
              },
      });
      renderPage();
      await screen.findByRole("heading", { name: "Business profile" });
      await act(async () =>
        fireEvent.change(screen.getByLabelText("Upload logo"), { target: { files: [png()] } })
      );
      expect((await screen.findByRole("alert")).textContent).toBe("Upload a PNG or JPEG image.");
    });

    it("removes the logo", async () => {
      contractorWith({
        profile: { ...SAVED, logoUrl: "https://s3/logo.png" },
        logo: async () => ({
          ok: true,
          status: 200,
          data: { profile: { ...SAVED, logoUrl: null }, saved: true },
        }),
      });
      renderPage();
      expect(await screen.findByAltText("Your logo")).toBeTruthy();
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remove" })));
      expect(await screen.findByText("Logo removed.")).toBeTruthy();
      expect(screen.queryByAltText("Your logo")).toBeNull();
    });
  });

  it("shows an error with a retry when the profile can't be loaded", async () => {
    let calls = 0;
    contractorWith();
    const base = mocks.appRequest.getMockImplementation();
    mocks.appRequest.mockImplementation(async (path, opts) =>
      path === "profile" && calls++ === 0 ? { ok: false, status: 500, data: {} } : base(path, opts)
    );
    renderPage();
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Business profile" })).toBeTruthy();
  });
});
