"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PAGE_SHORTCUTS: Record<string, string> = {
  "1": "/",
  "2": "/compare",
  "3": "/watchlist",
  "4": "/portfolio",
  "5": "/screener",
  "6": "/heatmap",
};

export default function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Cmd+K or / to focus search (only on main page)
      if ((e.metaKey && e.key === "k") || (e.key === "/" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          router.push("/");
        }
        return;
      }

      // Alt+1-6 for page navigation
      if (e.altKey && PAGE_SHORTCUTS[e.key]) {
        e.preventDefault();
        router.push(PAGE_SHORTCUTS[e.key]);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
