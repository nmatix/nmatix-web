import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { SetupProvider } from "../auth/SetupProvider";
import { ADMIN, CONTRACTOR, setupData, signIn } from "../test-helpers/appMocks";
import RateCardPage from "./page";
import { checkRateCardFile } from "./uploadRateCard";

const mocks = vi.hoisted(() => ({
  postJson: vi.fn(),
  getJson: vi.fn(),
  appRequest: vi.fn(),
  replace: vi.fn(),
  openDownload: vi.fn(),
}));
vi.mock("../signup/authApi", () => ({
  postJson: mocks.postJson,
  getJson: mocks.getJson,
  appRequest: mocks.appRequest,
}));
vi.mock("./download", () => ({ openDownload: mocks.openDownload }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const DRAFT = {
  id: "20261127120000-abcd1234",
  fileName: "rates.xlsx",
  fileType: "xlsx",
  sheet: "Rate card",
  headerRow: 1,
  columns: {},
  ignoredColumns: ["Notes"],
  rowCount: 2,
  templateVersion: "1",
  uploadedAt: "2026-11-27T12:00:00+00:00",
};
const ROWS = [
  {
    row: 2,
    values: { itemCode: "FL-01", name: "Vitrified tiles", unit: "sq ft", rateBasic: 85.5 },
  },
  {
    row: 3,
    values: { itemCode: "PT-01", name: "Wall paint", unit: "sq ft" },
    raw: { rateBasic: "abc" },
  },
];

/** A fake XMLHttpRequest for the S3 POST: reports progress, then answers `status`. */
function fakeS3({ status = 204, fail = false } = {}) {
  const sent = [];
  class FakeXhr {
    constructor() {
      this.upload = {};
    }
    open(method, url) {
      this.url = url;
    }
    send(body) {
      sent.push({ url: this.url, body });
      queueMicrotask(() => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
        if (fail) return this.onerror?.();
        this.status = status;
        this.onload?.();
      });
    }
  }
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  return sent;
}

/** Routes for appRequest. `draft` is what the server holds; `put` answers the parse. */
function contractorWith({ draft = null, rows = ROWS, put, summary } = {}) {
  let held = draft;
  signIn(mocks, CONTRACTOR, {});
  mocks.appRequest.mockImplementation(async (path, { method = "GET" } = {}) => {
    const ok = (data) => ({ ok: true, status: 200, data });
    if (path === "setup") return ok(setupData({ steps: { rate_card: { available: true } } }));
    if (path === "rate-card" && method === "GET") {
      return summary ? summary() : ok({ draft: held, published: null });
    }
    if (path === "rate-card/draft" && method === "GET") {
      return held ? ok({ draft: held, rows }) : { ok: false, status: 404, data: {} };
    }
    if (path === "rate-card/template") return ok({ url: "https://s3.example/template.xlsx" });
    if (path === "rate-card/uploads" && method === "POST") {
      return ok({
        upload: { url: "https://s3.example/upload", fields: { key: "pending/usr_1/x.xlsx" } },
        key: "pending/usr_1/ratecard-0123456789abcdef.xlsx",
      });
    }
    if (path === "rate-card/draft" && method === "PUT") {
      const answer = put ? put() : ok({ draft: { ...DRAFT, fileName: "new.xlsx" } });
      if (answer.ok) held = answer.data.draft;
      return answer;
    }
    throw new Error(`unexpected ${method} ${path}`);
  });
}

function renderPage() {
  return render(
    <AuthProvider>
      <SetupProvider>
        <RateCardPage />
      </SetupProvider>
    </AuthProvider>
  );
}

const file = (name, size = 10, type = "") => {
  const f = new File(["x".repeat(Math.min(size, 10))], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};
const chooseFile = (f) =>
  act(async () =>
    fireEvent.change(screen.getByLabelText("Choose rate card file"), { target: { files: [f] } })
  );
const calls = (path, method) =>
  mocks.appRequest.mock.calls.filter(([p, o]) => p === path && (o?.method || "GET") === method);

describe("Rate card page (#35)", () => {
  beforeEach(() => {
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.appRequest.mockReset();
    mocks.replace.mockReset();
    mocks.openDownload.mockReset();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sends signed-out visitors to the login page", async () => {
    renderPage();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login/"));
  });

  it("is not available to users without the product", async () => {
    signIn(mocks, ADMIN, {});
    renderPage();
    expect(await screen.findByRole("heading", { name: "Not available" })).toBeTruthy();
  });

  it("shows nothing published and no draft for a new contractor", async () => {
    contractorWith();
    renderPage();
    expect(await screen.findByRole("heading", { name: "Status" })).toBeTruthy();
    expect(screen.getByText(/Nothing published yet/)).toBeTruthy();
    expect(screen.getByText(/No draft\./)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /^Draft:/ })).toBeNull();
    expect(calls("rate-card/draft", "GET")).toHaveLength(0);
  });

  it("shows the draft waiting with a preview of its rows", async () => {
    contractorWith({ draft: DRAFT });
    renderPage();
    const card = (await screen.findByRole("heading", { name: "Draft: rates.xlsx" })).closest(
      "section"
    );
    expect(screen.getByText("Waiting")).toBeTruthy();
    expect(within(card).getByText("Vitrified tiles")).toBeTruthy();
    expect(within(card).getByText("₹85.50")).toBeTruthy();
    expect(within(card).getByText("abc (can't read)")).toBeTruthy();
    expect(within(card).getAllByText("To be priced").length).toBeGreaterThan(0);
    expect(within(card).getByText("Columns not used: Notes")).toBeTruthy();
    expect(screen.getByText(/A new file replaces the draft waiting/)).toBeTruthy();
  });

  it("downloads the template", async () => {
    contractorWith();
    renderPage();
    const button = await screen.findByRole("button", { name: "Download template (.xlsx)" });
    await act(async () => fireEvent.click(button));
    expect(mocks.openDownload).toHaveBeenCalledWith("https://s3.example/template.xlsx");
  });

  it("uploads a file, reads it into the draft and refreshes setup", async () => {
    const sent = fakeS3();
    contractorWith();
    renderPage();
    await screen.findByRole("heading", { name: "Status" });
    await chooseFile(file("new.xlsx", 2048));

    expect(await screen.findByText(/Read 2 items from new\.xlsx/)).toBeTruthy();
    expect(screen.getByText(/nothing is published yet/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Draft: new.xlsx" })).toBeTruthy();
    expect(calls("rate-card/uploads", "POST")[0][1].body).toEqual({ fileName: "new.xlsx" });
    expect(calls("rate-card/draft", "PUT")[0][1].body).toEqual({
      key: "pending/usr_1/ratecard-0123456789abcdef.xlsx",
      fileName: "new.xlsx",
    });
    expect(sent[0].url).toBe("https://s3.example/upload");
    expect(sent[0].body.get("key")).toBe("pending/usr_1/x.xlsx");
    expect(sent[0].body.get("file").name).toBe("new.xlsx");
    expect(mocks.appRequest.mock.calls.filter(([p]) => p === "setup").length).toBeGreaterThan(1);
  });

  it("accepts a dropped file", async () => {
    fakeS3();
    contractorWith();
    renderPage();
    await screen.findByRole("heading", { name: "Status" });
    await act(async () =>
      fireEvent.drop(screen.getByTestId("rate-card-dropzone"), {
        dataTransfer: { files: [file("rates.csv", 100)] },
      })
    );
    expect(await screen.findByText(/Read 2 items/)).toBeTruthy();
    expect(calls("rate-card/uploads", "POST")[0][1].body).toEqual({ fileName: "rates.csv" });
  });

  it("checks type and size before uploading", async () => {
    contractorWith();
    renderPage();
    await screen.findByRole("heading", { name: "Status" });
    await chooseFile(file("old.xls"));
    expect(screen.getByRole("alert").textContent).toMatch(/Save it as \.xlsx/);
    await chooseFile(file("big.xlsx", 6 * 1024 * 1024));
    expect(screen.getByRole("alert").textContent).toMatch(/5 MB or smaller/);
    expect(calls("rate-card/uploads", "POST")).toHaveLength(0);
  });

  it("explains why the server rejected the file", async () => {
    fakeS3();
    contractorWith({
      put: () => ({
        ok: false,
        status: 422,
        data: {
          error: {
            code: "MISSING_COLUMNS",
            message: "Some required columns are missing: Unit.",
            details: { missingColumns: ["Unit"], headersFound: ["Item", "Rate"] },
          },
        },
      }),
    });
    renderPage();
    await screen.findByRole("heading", { name: "Status" });
    await chooseFile(file("mine.csv", 100));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/required columns are missing: Unit/);
    expect(alert.textContent).toMatch(/Headings we found: Item, Rate/);
    expect(screen.getByText(/No draft\./)).toBeTruthy();
  });

  it("explains a failed upload to storage", async () => {
    fakeS3({ fail: true });
    contractorWith();
    renderPage();
    await screen.findByRole("heading", { name: "Status" });
    await chooseFile(file("rates.xlsx", 100));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Check your connection/);
    expect(calls("rate-card/draft", "PUT")).toHaveLength(0);
  });

  it("offers a retry when the rate card can't be loaded", async () => {
    let fails = true;
    contractorWith({
      summary: () =>
        fails
          ? { ok: false, status: 500, data: {} }
          : { ok: true, status: 200, data: { draft: null, published: null } },
    });
    renderPage();
    expect(await screen.findByText(/couldn't load your rate card/)).toBeTruthy();
    fails = false;
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(await screen.findByRole("heading", { name: "Status" })).toBeTruthy();
  });
});

describe("checkRateCardFile", () => {
  it("accepts .xlsx and .csv up to 5 MB", () => {
    expect(checkRateCardFile(file("a.XLSX", 100))).toBeNull();
    expect(checkRateCardFile(file("a.csv", 5 * 1024 * 1024))).toBeNull();
    expect(checkRateCardFile(file("a.pdf", 100))).toMatch(/\.xlsx or \.csv/);
    expect(checkRateCardFile(file("a.csv", 0))).toMatch(/empty/);
    expect(checkRateCardFile(null)).toMatch(/Choose a file/);
  });
});
