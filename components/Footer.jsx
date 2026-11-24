import Link from "next/link";

export default function Footer() {
  return (
    <div className="container">
      <footer>
        <p>&copy; 2026 Nmatix Technologies LLP. All Rights Reserved.</p>
        <nav aria-label="Legal">
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Notice</Link>
        </nav>
      </footer>
    </div>
  );
}
