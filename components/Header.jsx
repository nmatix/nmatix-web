"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const navLinks = {
    "/": [
      { name: "About", href: "/about" },
      { name: "Contact", href: "/contact" },
    ],

    "/about": [
      { name: "Home", href: "/" },
      { name: "Contact", href: "/contact" },
    ],

    "/contact": [
      { name: "Home", href: "/" },
      { name: "About", href: "/about" },
    ],
  };

  const links = navLinks[pathname] || navLinks["/"];

  return (
    <div className = "container">
        <header>

        <div className="logo">
            <Link href="/">
                <img src="/images/nmatix-logo.png" alt="nMATIX" />
            </Link>
        </div>

        <nav>
            {links.map((link) => (
            <Link key={link.href} href={link.href}>
                {link.name}
            </Link>
            ))}
        </nav>

        </header>
    </div>
  );
}
