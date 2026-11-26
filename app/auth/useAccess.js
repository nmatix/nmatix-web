"use client";

import { useAuth } from "./AuthProvider";

/**
 * What the signed-in user may see (#133), from their /me profile.
 * For showing and hiding UI only: every permission is enforced on the server (#23).
 */
export function useAccess() {
  const { status, user } = useAuth();
  const products = Array.isArray(user?.products) ? user.products : [];
  return {
    status,
    isAdmin: Boolean(user?.isAdmin),
    products,
    hasProduct: (slug) => products.includes(slug),
  };
}
