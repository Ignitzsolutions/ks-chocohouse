"use client";

import { useEffect, useState } from "react";

type PublicSplashSettings = {
  splashEnabled?: boolean;
  splashImageSrc?: string;
};

const SPLASH_SESSION_KEY = "ks_choco_house_home_splash_dismissed";

export function HomepageSplash() {
  const [imageSrc, setImageSrc] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      if (window.sessionStorage.getItem(SPLASH_SESSION_KEY) === "1") return;
    } catch {
      return;
    }

    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { settings?: PublicSplashSettings }) => {
        if (!active) return;
        const nextImageSrc = String(data.settings?.splashImageSrc ?? "").trim();
        if (data.settings?.splashEnabled && nextImageSrc) {
          setImageSrc(nextImageSrc);
          setVisible(true);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const closeSplash = () => {
    try {
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch {
      // Ignore storage failures so the user can still enter the site.
    }
    setVisible(false);
  };

  if (!visible || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="K S Choco House welcome splash"
    >
      <div className="relative w-full max-w-[min(92vw,820px)] rounded-[32px] border border-white/20 bg-[#17100d] p-3 shadow-2xl">
        <button
          type="button"
          onClick={closeSplash}
          className="absolute right-3 top-3 z-10 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-black shadow-lg"
          aria-label="Close splash screen"
        >
          Enter
        </button>
        <button
          type="button"
          onClick={closeSplash}
          className="block w-full overflow-hidden rounded-[24px] bg-black"
          aria-label="Enter K S Choco House website"
        >
          <img
            src={imageSrc}
            alt="K S Choco House welcome"
            onError={closeSplash}
            className="max-h-[86vh] w-full object-contain"
          />
        </button>
      </div>
    </div>
  );
}
