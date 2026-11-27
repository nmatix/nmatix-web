"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** /settings/ opens the first section. */
export default function SettingsIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/profile/");
  }, [router]);
  return (
    <p className="auth-loading">
      Opening settings... <Link href="/settings/profile/">Business profile</Link>
    </p>
  );
}
