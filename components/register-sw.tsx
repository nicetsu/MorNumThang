"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable + works offline.
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
