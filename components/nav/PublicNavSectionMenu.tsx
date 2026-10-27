"use client";
// FILE: components/nav/PublicNavSectionMenu.tsx

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { PublicNavMenuGroup } from "@/lib/design/publicSurface";

export function PublicNavSectionMenu({ menu }: { menu: PublicNavMenuGroup }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="public-nav-connect rd-nav-section-menu">
      <button
        type="button"
        className="public-nav-connect__trigger public-nav-connect__trigger--ghost rd-nav-section-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="public-nav-connect__trigger-label">{menu.label}</span>
        <span className="public-nav-connect__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div id={menuId} className="public-nav-connect__menu rd-nav-section-menu__panel" role="menu">
          <ul className="public-nav-connect__menu-list">
            {menu.links.map((link) => (
              <li key={link.href} role="none">
                <Link
                  href={link.href}
                  role="menuitem"
                  className="public-nav-connect__menu-item"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
