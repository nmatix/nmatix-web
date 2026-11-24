import LegalPlaceholder from "../../components/LegalPlaceholder";
import { TERMS_VERSION } from "../../data/legal";

export const metadata = {
  title: "Terms of Service | nMATIX Technologies",
  robots: { index: false },
};

export default function TermsPage() {
  return <LegalPlaceholder id="terms-title" title="Terms of Service" version={TERMS_VERSION} />;
}
