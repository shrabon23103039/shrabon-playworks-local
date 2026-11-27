"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Gamepad2, Heart, Home, Mail, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale } from "./locale-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className="language-switch" role="group" aria-label={t("language")}>
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <button
        type="button"
        lang="bn"
        aria-pressed={locale === "bn"}
        onClick={() => setLocale("bn")}
      >
        বাংলা
      </button>
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">{t("skip")}</a>
      <SiteHeader />
      <main id="main-content" className="main-content">{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <Link className="footer-brand" href="/">
              <span className="brand-mark small"><Gamepad2 size={16} aria-hidden="true" /></span>
              <span>{t("brand")}</span>
            </Link>
            <p className="footer-note">{t("footerNote")}</p>
          </div>
          <nav className="footer-nav" aria-label={t("footerNavLabel")}>
            <Link href="/games">{t("navGames")}</Link>
            <Link href="/favorites">{t("navFavorites")}</Link>
            <Link href="/contact">{t("navContact")}</Link>
            <Link href="/privacy">{t("footerPrivacy")}</Link>
            <Link href="/terms">{t("footerTerms")}</Link>
            <Link href="/admin/login">{t("footerAdmin")}</Link>
          </nav>
          <span className="copyright">© {new Date().getFullYear()} {t("brand")}</span>
        </div>
      </footer>
    </div>
  );
}

function SiteHeader() {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const tag = (event.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        event.preventDefault();
        if (window.innerWidth < 768) {
          setSearchOpen(true);
          window.setTimeout(() => mobileInputRef.current?.focus(), 0);
        } else {
          desktopInputRef.current?.focus();
        }
      } else if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/games?q=${encodeURIComponent(value)}` : "/games");
    setMenuOpen(false);
    setSearchOpen(false);
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><Gamepad2 size={18} aria-hidden="true" /></span>
          <span className="brand-copy">
            <strong>{t("brand")}</strong>
            <small>{t("tagline")}</small>
          </span>
        </Link>

        <nav className="main-nav-desktop" aria-label={t("mainNavLabel")}>
          <Link aria-current={pathname === "/" ? "page" : undefined} href="/">
            <Home size={15} aria-hidden="true" />
            <span>{t("navHome")}</span>
          </Link>
          <Link
            aria-current={pathname.startsWith("/games") || pathname.startsWith("/category") || pathname.startsWith("/search") ? "page" : undefined}
            href="/games"
          >
            <Compass size={15} aria-hidden="true" />
            <span>{t("navGames")}</span>
          </Link>
          <Link aria-current={pathname === "/favorites" ? "page" : undefined} href="/favorites">
            <Heart size={15} aria-hidden="true" />
            <span>{t("navFavorites")}</span>
          </Link>
          <Link aria-current={pathname === "/contact" ? "page" : undefined} href="/contact">
            <Mail size={15} aria-hidden="true" />
            <span>{t("navContact")}</span>
          </Link>
        </nav>

        <div className="header-actions">
          <form className="header-search-desktop" onSubmit={submitSearch} role="search">
            <Search size={16} aria-hidden="true" className="search-icon" />
            <input
              ref={desktopInputRef}
              aria-label={t("searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label={t("clearSearch")}
                onClick={() => {
                  setQuery("");
                  desktopInputRef.current?.focus();
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
            <button type="submit" className="search-submit">{t("search")}</button>
          </form>

          <button
            className="mobile-icon-button mobile-search-toggle"
            type="button"
            aria-label={t("search")}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((open) => {
                const next = !open;
                if (next) {
                  setMenuOpen(false);
                  window.setTimeout(() => mobileInputRef.current?.focus(), 0);
                }
                return next;
              });
            }}
          >
            {searchOpen ? <X size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          </button>

          <LanguageSwitcher />

          <button
            className="mobile-icon-button mobile-menu-button"
            type="button"
            aria-label={menuOpen ? t("closeMenu") : t("menu")}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setSearchOpen(false);
            }}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="mobile-search-bar">
          <form className="header-search-mobile" onSubmit={submitSearch} role="search">
            <Search size={16} aria-hidden="true" className="search-icon" />
            <input
              ref={mobileInputRef}
              aria-label={t("searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label={t("clearSearch")}
                onClick={() => {
                  setQuery("");
                  mobileInputRef.current?.focus();
                }}
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
            <button type="submit" className="button button-primary button-sm">{t("search")}</button>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav className="mobile-drawer" aria-label={t("mainNavLabel")}>
          <Link aria-current={pathname === "/" ? "page" : undefined} href="/" onClick={() => setMenuOpen(false)}>
            <Home size={16} aria-hidden="true" />
            <span>{t("navHome")}</span>
          </Link>
          <Link
            aria-current={pathname.startsWith("/games") || pathname.startsWith("/category") || pathname.startsWith("/search") ? "page" : undefined}
            href="/games"
            onClick={() => setMenuOpen(false)}
          >
            <Compass size={16} aria-hidden="true" />
            <span>{t("navGames")}</span>
          </Link>
          <Link aria-current={pathname === "/favorites" ? "page" : undefined} href="/favorites" onClick={() => setMenuOpen(false)}>
            <Heart size={16} aria-hidden="true" />
            <span>{t("navFavorites")}</span>
          </Link>
          <Link aria-current={pathname === "/contact" ? "page" : undefined} href="/contact" onClick={() => setMenuOpen(false)}>
            <Mail size={16} aria-hidden="true" />
            <span>{t("navContact")}</span>
          </Link>
        </nav>
      )}
    </header>
  );
}

export function PageContainer({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`page-container${narrow ? " narrow" : ""}`}>{children}</div>;
}
