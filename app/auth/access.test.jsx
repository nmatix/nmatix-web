import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, SIGNED_IN_HINT } from "./AuthProvider";
import RequireProduct from "./RequireProduct";
import { useAccess } from "./useAccess";

const mocks = vi.hoisted(() => ({ postJson: vi.fn(), getJson: vi.fn(), replace: vi.fn() }));
vi.mock("../signup/authApi", () => ({ postJson: mocks.postJson, getJson: mocks.getJson }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const PRODUCT = "interior-quote-generator";

function signedInAs(user) {
  window.localStorage.setItem(SIGNED_IN_HINT, "1");
  mocks.postJson.mockResolvedValue({
    ok: true,
    status: 200,
    data: { idToken: "id", expiresIn: 3600 },
  });
  mocks.getJson.mockResolvedValue({ ok: true, status: 200, data: user });
}

function AccessProbe() {
  const { status, isAdmin, products, hasProduct } = useAccess();
  return (
    <p data-testid="access">
      {JSON.stringify({
        status,
        isAdmin,
        products,
        has: hasProduct(PRODUCT),
        other: hasProduct("tender-flow"),
      })}
    </p>
  );
}

const access = () => JSON.parse(screen.getByTestId("access").textContent);

function renderWith(children) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

describe("useAccess (#133)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.replace.mockReset();
  });
  afterEach(() => cleanup());

  it("is empty for signed-out visitors", async () => {
    renderWith(<AccessProbe />);
    await waitFor(() => expect(access().status).toBe("signedOut"));
    expect(access()).toMatchObject({ isAdmin: false, products: [], has: false });
  });

  it("reflects a contractor's products", async () => {
    signedInAs({ id: "usr_1", name: "Ravi", isAdmin: false, products: [PRODUCT] });
    renderWith(<AccessProbe />);
    await waitFor(() => expect(access().status).toBe("signedIn"));
    expect(access()).toMatchObject({
      isAdmin: false,
      products: [PRODUCT],
      has: true,
      other: false,
    });
  });

  it("reflects an admin without product access", async () => {
    signedInAs({ id: "usr_2", name: "Kiran", isAdmin: true, products: [] });
    renderWith(<AccessProbe />);
    await waitFor(() => expect(access().status).toBe("signedIn"));
    expect(access()).toMatchObject({ isAdmin: true, has: false });
  });

  it("copes with a profile that has no products field", async () => {
    signedInAs({ id: "usr_3", name: "X" });
    renderWith(<AccessProbe />);
    await waitFor(() => expect(access().status).toBe("signedIn"));
    expect(access()).toMatchObject({ products: [], has: false });
  });
});

describe("RequireProduct (#133)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.replace.mockReset();
  });
  afterEach(() => cleanup());

  const page = (
    <RequireProduct product={PRODUCT}>
      <h1>Rate card</h1>
    </RequireProduct>
  );

  it("sends signed-out visitors to login", async () => {
    renderWith(page);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login/"));
    expect(screen.queryByRole("heading", { name: "Rate card" })).toBeNull();
  });

  it("shows the page to users with the product", async () => {
    signedInAs({ id: "usr_1", name: "Ravi", isAdmin: false, products: [PRODUCT] });
    renderWith(page);
    expect(await screen.findByRole("heading", { name: "Rate card" })).toBeTruthy();
  });

  it("shows 'Not available' to users without the product, admins included", async () => {
    signedInAs({ id: "usr_2", name: "Kiran", isAdmin: true, products: [] });
    renderWith(page);
    expect(await screen.findByRole("heading", { name: "Not available" })).toBeTruthy();
    expect(screen.getByText("Your account doesn't have access to this product.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Rate card" })).toBeNull();
  });
});
