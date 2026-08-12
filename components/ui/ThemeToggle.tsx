"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("eloquence-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Lecture de localStorage/matchMedia impossible côté serveur — on
    // synchronise l'état réel du thème une fois montés côté client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("eloquence-theme", theme);
  }, [theme, mounted]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
      className="rounded-full border border-border-subtle px-3 py-1.5 text-sm font-mono-util hover:bg-surface-muted transition-colors"
      aria-label="Basculer le thème clair/sombre"
    >
      {mounted ? (theme === "light" ? "☾ Sombre" : "☀ Clair") : "···"}
    </button>
  );
}
