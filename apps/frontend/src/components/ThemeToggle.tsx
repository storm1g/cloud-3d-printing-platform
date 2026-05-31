"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 flex items-center justify-center rounded-full text-secondary hover:bg-surface-container transition-colors"
      aria-label={theme === "dark" ? "Prebaci na svetlu temu" : "Prebaci na tamnu temu"}
      title={theme === "dark" ? "Svetla tema" : "Tamna tema"}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
