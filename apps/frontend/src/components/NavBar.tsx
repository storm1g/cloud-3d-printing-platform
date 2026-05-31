"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks: { label: string; href: string; sectionId: string }[] = [
  { label: "Usluge",    href: "#Modeli",    sectionId: "Modeli"    },
  { label: "Galerija",  href: "#galerija",  sectionId: "galerija"  },
  { label: "Cenovnik",  href: "#Cenovnik",  sectionId: "Cenovnik"  },
  { label: "Kalkulator",href: "#kalkulator",sectionId: "kalkulator"},
  { label: "Kontakt",   href: "#kontakt",   sectionId: "kontakt"   },
];

export function NavBar() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sectionIds = navLinks.map((l) => l.sectionId);
    const observers: IntersectionObserver[] = [];
    const visible = new Set<string>();

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.add(id);
          } else {
            visible.delete(id);
          }
          const first = sectionIds.find((s) => visible.has(s));
          setActiveSection(first ?? "");
        },
        { rootMargin: "-80px 0px -40% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="bg-surface border-b border-outline-variant sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-stack-md max-w-container-max mx-auto">
        {/* Logo */}
        <a
          href="#"
          className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}
          >
            view_in_ar
          </span>
          printuj.me
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-gutter items-center">
          {navLinks.map(({ label, href, sectionId }) => {
            const isActive = activeSection === sectionId;
            return (
              <a
                key={label}
                href={href}
                className={
                  isActive
                    ? "font-label-md text-[15px] font-medium text-primary border-b-2 border-primary pb-0.5 transition-colors"
                    : "font-label-md text-[15px] font-medium text-secondary hover:text-primary transition-colors"
                }
              >
                {label}
              </a>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-stack-sm">
          <ThemeToggle />
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded text-on-surface hover:bg-surface-variant transition-colors"
            aria-label={menuOpen ? "Zatvori meni" : "Otvori meni"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <nav className="md:hidden border-t border-outline-variant bg-surface px-margin-mobile py-stack-md flex flex-col gap-stack-md animate-slide-down">
          {navLinks.map(({ label, href, sectionId }) => {
            const isActive = activeSection === sectionId;
            return (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={
                  isActive
                    ? "font-label-md text-[15px] font-medium text-primary border-l-2 border-primary pl-stack-sm transition-colors"
                    : "font-label-md text-[15px] font-medium text-secondary hover:text-primary pl-stack-sm transition-colors"
                }
              >
                {label}
              </a>
            );
          })}
        </nav>
      )}
    </header>
  );
}
