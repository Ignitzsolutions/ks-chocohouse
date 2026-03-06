"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bakery_motion_pref";

function applyMotion(mode: "standard" | "reduced") {
  document.documentElement.dataset.motion = mode;
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new Event("bakery-motion-change"));
}

export function MotionToggle() {
  const [mode, setMode] = useState<"standard" | "reduced">(() => {
    if (typeof window === "undefined") return "standard";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "standard" || stored === "reduced") {
      return stored;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "reduced"
      : "standard";
  });

  useEffect(() => {
    document.documentElement.dataset.motion = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = mode === "standard" ? "reduced" : "standard";
        setMode(next);
        applyMotion(next);
      }}
      className="rounded-full border border-[color:var(--line)] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/65"
      aria-label="Toggle reduced animations"
    >
      Animations: {mode === "standard" ? "Standard" : "Reduced"}
    </button>
  );
}
