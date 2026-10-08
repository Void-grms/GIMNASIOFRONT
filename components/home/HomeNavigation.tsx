"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HomeNavigation.module.css";

const sections = [
  { href: "#experiencia", label: "El gimnasio" },
  { href: "#planes", label: "Planes" },
  { href: "#clases", label: "Clases" },
  { href: "#ubicacion", label: "Encuéntranos" },
];

function BrandMark() {
  return (
    <svg
      width="35"
      height="32"
      viewBox="0 0 35 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M7 2H35L30.5 9H2.5L7 2Z" fill="currentColor" />
      <path d="M5 13H27L22.5 20H.5L5 13Z" fill="currentColor" />
      <path d="M5 24H18L13.5 31H.5L5 24Z" fill="currentColor" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20v-1.5a7 7 0 0 1 14 0V20" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path
        d="m12 3 8 3v5c0 5-4 8-8 10-4-2-8-5-8-10V6l8-3Z"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomeNavigation({ name }: { name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setReady(true);
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function openMenu() {
    dialogRef.current?.showModal();
    setMenuOpen(true);
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  function handleClose() {
    setMenuOpen(false);
    if (triggerRef.current?.getClientRects().length) triggerRef.current.focus();
  }

  return (
    <header className={styles.header} data-ready={ready}>
      <div className={styles.utilityBar}>
        <div className={styles.utilityInner}>
          <span>Acceso exclusivo para personal</span>
          <a href="/login" className={styles.adminLink}>
            <ShieldIcon />
            Administración
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <div className={styles.mainBar}>
        <a href="/" className={styles.brand} aria-label={`${name}, inicio`}>
          <BrandMark />
          <span className={styles.wordmark}>{name}</span>
        </a>

        <nav className={styles.desktopNav} aria-label="Navegación principal">
          {sections.map((section) => (
            <a key={section.href} href={section.href}>
              {section.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <a href="/portal" className={styles.portalLink}>
            <PersonIcon />
            <span className={styles.portalDesktopLabel}>
              Portal de clientes
            </span>
            <span className={styles.portalMobileLabel}>Portal clientes</span>
          </a>
          <button
            ref={triggerRef}
            type="button"
            className={styles.menuTrigger}
            onClick={openMenu}
            aria-label="Abrir menú de navegación"
            aria-expanded={menuOpen}
            aria-controls="home-navigation-menu"
            aria-haspopup="dialog"
          >
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M3 7h18M3 16h18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <noscript>
        <nav className={styles.fallbackNav} aria-label="Navegación principal">
          {sections.map((section) => (
            <a key={section.href} href={section.href}>
              {section.label}
            </a>
          ))}
          <a href="/login" className={styles.fallbackAdmin}>
            Administración · Solo personal
          </a>
        </nav>
      </noscript>

      <dialog
        ref={dialogRef}
        id="home-navigation-menu"
        className={styles.mobileDialog}
        aria-label="Menú principal"
        onClose={handleClose}
      >
        <div className={styles.dialogTop}>
          <a
            href="/"
            className={styles.brand}
            aria-label={`${name}, inicio`}
            onClick={closeMenu}
          >
            <BrandMark />
            <span className={styles.wordmark}>{name}</span>
          </a>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeMenu}
            aria-label="Cerrar menú"
            autoFocus
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M6 18 18 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className={styles.mobileNav} aria-label="Navegación principal">
          {sections.map((section) => (
            <a key={section.href} href={section.href} onClick={closeMenu}>
              {section.label}
              <ArrowIcon />
            </a>
          ))}
        </nav>

        <div className={styles.memberAccess}>
          <p>¿Ya entrenas con nosotros?</p>
          <a href="/portal" className={styles.mobilePortal} onClick={closeMenu}>
            <PersonIcon />
            Portal de clientes
            <ArrowIcon />
          </a>
          <span>Tu membresía, tus rutinas y tu progreso.</span>
        </div>

        <div className={styles.staffAccess}>
          <span>Acceso exclusivo para personal</span>
          <a href="/login" className={styles.adminLink} onClick={closeMenu}>
            <ShieldIcon />
            Administración
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </dialog>
    </header>
  );
}
