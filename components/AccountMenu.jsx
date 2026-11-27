"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../app/auth/AuthProvider";
import { setupPending, useSetup } from "../app/auth/SetupProvider";
import { useAccess } from "../app/auth/useAccess";

export function initials(name, email) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email || "?")[0].toUpperCase();
}

/**
 * Header account menu for signed-in users (#186): an avatar button that opens a menu with
 * the user's name and email, Finish setup (until one-time setup is done, PRD v0.6) or
 * Dashboard, Admin (internal admins only) and Log out.
 * Follows the WAI-ARIA menu button pattern. The header remounts it on every page change
 * (key = path), which closes it. What it shows is UI only; the server enforces access.
 */
export default function AccountMenu({ currentPath }) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAccess();
  const setup = useSetup();
  const home = setupPending(setup)
    ? { href: "/get-started/", path: "/get-started", label: "Finish setup" }
    : { href: "/dashboard/", path: "/dashboard", label: "Dashboard" };
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const focusFirstOnOpen = useRef(false);
  const menuId = useId();

  const fullName = (user?.name || "").trim() || "Your account";
  const firstName = fullName.split(/\s+/)[0];

  const items = () => Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || []);

  useEffect(() => {
    if (!open) return undefined;
    if (focusFirstOnOpen.current) {
      focusFirstOnOpen.current = false;
      items()[0]?.focus();
    }
    function onPointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close({ focusButton = false } = {}) {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }

  function onButtonKeyDown(event) {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      focusFirstOnOpen.current = true;
      setOpen(true);
    }
  }

  function onMenuKeyDown(event) {
    const list = items();
    const index = list.indexOf(document.activeElement);
    const move = (to) => {
      event.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(list.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // don't also close the mobile navigation
      close({ focusButton: true });
    } else if (event.key === "Tab") close();
  }

  async function handleLogout() {
    close();
    await signOut();
    router.replace("/");
  }

  const isCurrent = (path) => (currentPath === path ? "page" : undefined);

  return (
    <div className="account-menu" ref={wrapperRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${fullName}`}
        className="account-button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
        ref={buttonRef}
        type="button"
      >
        <span aria-hidden="true" className="account-avatar">
          {initials(user?.name, user?.email)}
        </span>
        <span aria-hidden="true" className="account-button-name">
          {firstName}
        </span>
        <span aria-hidden="true" className={open ? "account-caret is-open" : "account-caret"} />
      </button>

      {open && (
        <div
          aria-label="Account"
          className="account-dropdown"
          id={menuId}
          onKeyDown={onMenuKeyDown}
          ref={menuRef}
          role="menu"
        >
          <div className="account-dropdown-header" role="none">
            <span className="account-dropdown-name">{fullName}</span>
            {user?.email && <span className="account-dropdown-email">{user.email}</span>}
          </div>
          <Link
            aria-current={isCurrent(home.path)}
            href={home.href}
            onClick={() => close()}
            role="menuitem"
            tabIndex={-1}
          >
            {home.label}
          </Link>
          {isAdmin && (
            <Link
              aria-current={isCurrent("/admin")}
              href="/admin/"
              onClick={() => close()}
              role="menuitem"
              tabIndex={-1}
            >
              Admin
            </Link>
          )}
          <div className="account-dropdown-divider" role="separator" />
          <button onClick={handleLogout} role="menuitem" tabIndex={-1} type="button">
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
