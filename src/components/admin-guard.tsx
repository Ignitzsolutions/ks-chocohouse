"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch("/api/admin/auth/session", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await response.json();
        if (!data?.authenticated) {
          router.replace("/admin/login");
          return;
        }
        if (!cancelled) setReady(true);
      } catch {
        router.replace("/admin/login");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) return null;

  return <>{children}</>;
}
