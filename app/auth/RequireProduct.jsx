"use client";

import NotAvailable from "./NotAvailable";
import RequireAuth from "./RequireAuth";
import { useAccess } from "./useAccess";

/**
 * Renders children only for users with access to `product` (#133), e.g. the rate card
 * and estimate pages. UI only: product APIs check access on the server
 * (authz.require_product, #23).
 */
export default function RequireProduct({ product, children }) {
  return (
    <RequireAuth>
      <ProductGate product={product}>{children}</ProductGate>
    </RequireAuth>
  );
}

function ProductGate({ product, children }) {
  const { hasProduct } = useAccess();
  if (!hasProduct(product)) {
    return <NotAvailable message="Your account doesn't have access to this product." />;
  }
  return children;
}
