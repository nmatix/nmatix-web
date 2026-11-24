import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "../data/legal";

export default function Footer() {
  return (
    <div className="container">
      <footer>
        <p>&copy; 2026 Nmatix Technologies LLP. All Rights Reserved.</p>
        <nav aria-label="Legal">
          <Link href={TERMS_PATH}>Terms of Service</Link>
          <Link href={PRIVACY_PATH}>Privacy Notice</Link>
        </nav>
      </footer>
    </div>
  );
}
