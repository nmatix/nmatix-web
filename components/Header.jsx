"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { products } from "../data/products";

function NavigationLink({ href, label, currentPath }) {
  if (currentPath === href) {
    return (
      <span aria-current="page" className="current-nav-link">
        {label}
      </span>
    );
  }

  return <Link href={href}>{label}</Link>;
}

export default function Header() {
  const pathname = usePathname();
  const currentPath = (pathname || "/").replace(/\/$/, "") || "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const productsDropdownRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const previousPathRef = useRef(currentPath);

  useEffect(() => {
    if (previousPathRef.current === currentPath) return;
    previousPathRef.current = currentPath;
    if (productsDropdownRef.current) {
      productsDropdownRef.current.open = false;
    }
    setMobileMenuOpen(false);
  }, [currentPath]);

  useEffect(() => {
    function handlePointerDown(event) {
      const dropdown = productsDropdownRef.current;
      if (dropdown?.open && !dropdown.contains(event.target)) {
        dropdown.open = false;
      }
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;

      if (productsDropdownRef.current?.open) {
        productsDropdownRef.current.open = false;
        productsDropdownRef.current.querySelector("summary")?.focus();
      } else if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  function toggleMobileMenu() {
    setMobileMenuOpen((open) => !open);
    if (productsDropdownRef.current) {
      productsDropdownRef.current.open = false;
    }
  }

  return (
    <div className="container">
      <header className="site-header">
        <div className="header-top">
          <div className="logo">
            <Link href="/" aria-label="nMATIX home">
              <img src="/images/nmatix-logo.png" alt="nMATIX" />
            </Link>
          </div>
          <button
            ref={mobileMenuButtonRef}
            aria-controls="site-navigation"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            type="button"
          >
            <span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
            <span>{mobileMenuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>

        <div
          className={`header-menu${mobileMenuOpen ? " is-open" : ""}`}
          id="site-navigation"
        >
          <nav aria-label="Main navigation" className="site-nav">
            <NavigationLink
              currentPath={currentPath}
              href="/about"
              label="About"
            />

            <details className="products-dropdown" ref={productsDropdownRef}>
              <summary className="products-toggle">Products</summary>
              <div className="products-menu">
                {products.map((product) => {
                  const productPath = `/products/${product.slug}/`;
                  const isCurrentProduct = currentPath === productPath.replace(/\/$/, "");

                  return (
                    <Link
                      aria-current={isCurrentProduct ? "page" : undefined}
                      href={productPath}
                      key={product.slug}
                    >
                      <span>{product.name}</span>
                      {product.status === "coming-soon" && (
                        <span className="product-menu-status">Coming soon</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </details>

            <NavigationLink
              currentPath={currentPath}
              href="/contact"
              label="Contact"
            />
          </nav>

          <div className="account-actions">
            <Link className="login-link" href="/login">Login</Link>
          </div>
        </div>
      </header>
    </div>
  );
}
