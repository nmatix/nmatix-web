import LegalPlaceholder from "../../components/LegalPlaceholder";
import { PRIVACY_VERSION } from "../../data/legal";

export const metadata = {
  title: "Privacy Notice | nMATIX Technologies",
  robots: { index: false },
};

export default function PrivacyPage() {
  return <LegalPlaceholder id="privacy-title" title="Privacy Notice" version={PRIVACY_VERSION} />;
}
