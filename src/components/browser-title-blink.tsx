"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BRAND_NAME } from "@/lib/brand";

const BLINK_TITLE = `${BRAND_NAME} | Fresh Cakes & Chocolates`;

export function BrowserTitleBlink() {
  const pathname = usePathname();

  useEffect(() => {
    const baseTitle = document.title;
    let showBlink = false;

    const intervalId = window.setInterval(() => {
      showBlink = !showBlink;
      document.title = showBlink ? BLINK_TITLE : baseTitle;
    }, 1400);

    return () => {
      window.clearInterval(intervalId);
      document.title = baseTitle;
    };
  }, [pathname]);

  return null;
}
