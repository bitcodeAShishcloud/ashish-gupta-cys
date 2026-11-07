"use client";

import { useEffect } from "react";

/**
 * One-time service-worker cleanup for visitors coming from the previous
 * static HTML site. The old worker keeps serving its cached shell (a blank
 * white first paint) until it is explicitly removed — a 404 on the old
 * sw.js does not unregister it. This mounts once in the root layout and:
 *   - does nothing at all for fresh visitors (no service worker = no
 *     controller = no registration, no network request for sw.js), and
 *   - for anyone still holding the old worker, swaps in /sw.js — the
 *     migration kill-switch — which deletes every cache and unregisters
 *     itself on activation.
 */
export function SwCleanup() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!navigator.serviceWorker.controller) return; // fresh visitor — nothing to clean
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* registration failures are non-fatal; the worker is gone either way */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
