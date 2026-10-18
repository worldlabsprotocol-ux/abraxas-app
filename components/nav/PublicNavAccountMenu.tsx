"use client";
// FILE: components/nav/PublicNavAccountMenu.tsx
// Compact header menu for secondary account / recovery actions (keeps one primary CTA visible).

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type PublicNavAccountMenuItem =
  | { type: "button"; label: string; onClick: () => void; disabled?: boolean }
  | { type: "link"; label: string; href: string; description?: string };

export function PublicNavAccountMenu(props: {
  triggerLabel: string;
  triggerAriaLabel: string;
  prominent?: boolean;
  variant?: "primary" | "muted";
  menuTitle?: string;
  menuDescription?: string;
  items: PublicNavAccountMenuItem[];
  footer?: ReactNode;
  defaultOpen?: boolean;
}) {
  const {
    triggerLabel,
    triggerAriaLabel,
    prominent = false,
    variant = "primary",
    menuTitle,
    menuDescription,
    items,
    footer,
  } = props;
  const [open, setOpen] = useState(Boolean(props.defaultOpen));
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

  const triggerClass = [
    "public-nav-connect__trigger",
    `public-nav-connect__trigger--${variant}`,
    prominent ? "public-nav-connect__trigger--prominent" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className="public-nav-connect">
      <button
        type="button"
        className={triggerClass}
        aria-label={triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="public-nav-connect__trigger-label">{triggerLabel}</span>
        <span className="public-nav-connect__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div id={menuId} className="public-nav-connect__menu" role="menu">
          {menuTitle ? <p className="public-nav-connect__menu-title">{menuTitle}</p> : null}
          {menuDescription ? <p className="public-nav-connect__menu-desc">{menuDescription}</p> : null}
          <ul className="public-nav-connect__menu-list">
            {items.map((item) => (
              <li key={item.label} role="none">
                {item.type === "button" ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="public-nav-connect__menu-item"
                    disabled={item.disabled}
                    onClick={() => {
                      item.onClick();
                      setOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    role="menuitem"
                    className="public-nav-connect__menu-item public-nav-connect__menu-item--link"
                    onClick={() => setOpen(false)}
                  >
                    <span>{item.label}</span>
                    {item.description ? (
                      <span className="public-nav-connect__menu-item-desc">{item.description}</span>
                    ) : null}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {footer ? <div className="public-nav-connect__footer">{footer}</div> : null}
    </div>
  );
}

export function PublicNavConnectPrimary(props: {
  prominent?: boolean;
  label: string;
  ariaLabel: string;
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  footer?: ReactNode;
}) {
  const className = [
    "public-nav-connect__trigger",
    "public-nav-connect__trigger--primary",
    props.prominent ? "public-nav-connect__trigger--prominent" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = props.busy ? `${props.label}…` : props.label;

  return (
    <div className="public-nav-connect">
      {props.href ? (
        <Link href={props.href} className={className} aria-label={props.ariaLabel}>
          <span className="public-nav-connect__trigger-label">{inner}</span>
        </Link>
      ) : (
        <button
          type="button"
          className={className}
          aria-label={props.ariaLabel}
          disabled={props.disabled || props.busy}
          onClick={props.onClick}
        >
          <span className="public-nav-connect__trigger-label">{inner}</span>
        </button>
      )}
      {props.footer ? <div className="public-nav-connect__footer">{props.footer}</div> : null}
    </div>
  );
}
