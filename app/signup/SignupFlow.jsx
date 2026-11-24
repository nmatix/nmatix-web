"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import RegistrationForm from "./RegistrationForm";
import {
  clearPendingVerification,
  loadPendingVerification,
  savePendingVerification,
} from "./signupStorage";
import VerifyEmailStep from "./VerifyEmailStep";

/**
 * Sign-up journey: details form -> email code -> account ready.
 * The verification step survives a page refresh (see signupStorage).
 */
export default function SignupFlow() {
  const [step, setStep] = useState("details");
  const [pending, setPending] = useState(null);
  const doneHeading = useRef(null);

  // Restore after a refresh. sessionStorage only exists in the browser and this page is
  // statically pre-rendered, so the saved step can only be applied after hydration;
  // reading it during render would make the server and client markup differ.
  useEffect(() => {
    const saved = loadPendingVerification();
    if (saved) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time restore after hydration */
      setPending(saved);
      setStep("verify");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  useEffect(() => {
    if (step === "done") doneHeading.current?.focus();
  }, [step]);

  function updatePending(next) {
    setPending(next);
    savePendingVerification(next);
  }

  function handleRegistered(data) {
    updatePending({
      id: data.id,
      email: data.email,
      codeSent: data.codeSent !== false,
      resendAt: Date.now() + (data.resendAfterSeconds || 60) * 1000,
    });
    setStep("verify");
  }

  function handleVerified() {
    clearPendingVerification();
    setPending(null);
    setStep("done");
  }

  function handleStartOver() {
    clearPendingVerification();
    setPending(null);
    setStep("details");
  }

  if (step === "done") {
    return (
      <div className="registration-result success signup-done" role="status" aria-live="polite">
        <h2 ref={doneHeading} tabIndex={-1}>
          Your account is ready
        </h2>
        <p>You can now log in.</p>
        <Link className="registration-login-button" href="/login">
          Login
        </Link>
      </div>
    );
  }

  if (step === "verify" && pending) {
    return (
      <VerifyEmailStep
        onPendingChange={updatePending}
        onStartOver={handleStartOver}
        onVerified={handleVerified}
        pending={pending}
      />
    );
  }

  return <RegistrationForm onRegistered={handleRegistered} />;
}
