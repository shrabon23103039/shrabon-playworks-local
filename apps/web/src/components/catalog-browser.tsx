"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api";
import type { Category, Game } from "@/lib/types";
import { useFavorites, useLocale } from "./locale-provider";
import { GameGrid } from "./game-grid";
import { PageContainer } from "./site-shell";
import { EmptyState, GameGridSkeleton } from "./ui-primitives";

type CatalogResponse = { games: Game[] };
type CategoryResponse = { categories: Category[] };

export function CatalogBrowser({
  initialQuery = "",
  categorySlug,
  favoritesOnly = false,
}: {
  initialQuery?: string;
  categorySlug?: string;
  favoritesOnly?: boolean;
}) {
  const { locale, t } = useLocale();
  const { favorites, storageAvailable } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      Promise.all([
        apiRequest<CatalogResponse>(`/games?${new URLSearchParams({
          ...(submittedQuery ? { q: submittedQuery } : {}),
          ...(categorySlug ? { category: categorySlug } : {}),
          limit: "48",
        })}`),
        apiRequest<CategoryResponse>("/categories"),
      ])
        .then(([catalog, categoryResponse]) => {
          if (!active) return;
          setGames(catalog.games);
          setCategories(categoryResponse.categories);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 60);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [submittedQuery, categorySlug, retry]);

  const visibleGames = useMemo(
    () => (favoritesOnly ? games.filter((game) => favorites.includes(game.slug)) : games),
    [favoritesOnly, favorites, games],
  );

  const activeCategory = categories.find((category) => category.slug === categorySlug);

  function syncUrlSearch(nextValue: string) {
    const trimmed = nextValue.trim();
    setSubmittedQuery(trimmed);
    if (!favoritesOnly && !categorySlug) {
      const target = trimmed ? `${pathname}?q=${encodeURIComponent(trimmed)}` : pathname;
      router.replace(target, { scroll: false });
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    syncUrlSearch(query);
  }

  function clearSearch() {
    setQuery("");
    syncUrlSearch("");
  }

  const heading = favoritesOnly
    ? t("navFavorites")
    : activeCategory?.name[locale] ??
      activeCategory?.name.en ??
      (submittedQuery ? `${t("searchResultsFor")}: “${submittedQuery}”` : t("allGames"));

  function categoryDescription(slug: string | undefined): string {
    if (slug === "arcade") return t("categoryDescriptionArcade");
    if (slug === "puzzle") return t("categoryDescriptionPuzzle");
    if (slug) return t("categoryDescriptionDefault");
    return t("catalogSubtitle");
  }

  const subtitle = favoritesOnly
    ? t("favoritesSubtitle")
    : categorySlug
      ? categoryDescription(categorySlug)
      : !loading && !error
        ? `${visibleGames.length} ${visibleGames.length === 1 ? t("gameCountSingle") : t("gamesCountLabel")}`
        : t("catalogSubtitle");

  return (
    <PageContainer>
      <section className="catalog-heading">
        <div>
          <span className="section-eyebrow">
            {favoritesOnly ? <Heart size={14} aria-hidden="true" /> : <SlidersHorizontal size={14} aria-hidden="true" />}
            {t("browse")}
          </span>
          <h1>{heading}</h1>
          <p>{subtitle}</p>
        </div>

        <form className="catalog-search" role="search" onSubmit={submitSearch}>
          <Search size={18} aria-hidden="true" className="search-icon" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label={t("clearSearch")}
              onClick={clearSearch}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button className="button button-primary button-sm" type="submit">
            {t("search")}
          </button>
        </form>
      </section>

      {!favoritesOnly && (
        <nav className="category-row" aria-label={t("categories")}>
          <Link className={!categorySlug ? "category-chip selected" : "category-chip"} href="/games">
            {t("allCategories")}
          </Link>
          {categories.map((category) => (
            <Link
              className={categorySlug === category.slug ? "category-chip selected" : "category-chip"}
              href={`/category/${category.slug}`}
              key={category.slug}
            >
              {category.name[locale] ?? category.name.en}
            </Link>
          ))}
        </nav>
      )}

      {favoritesOnly && !storageAvailable && <p className="inline-notice">{t("storageUnavailable")}</p>}

      {loading ? (
        <GameGridSkeleton count={2} />
      ) : error ? (
        <EmptyState
          role="alert"
          icon={<RefreshCw size={24} />}
          message={t("loadError")}
          action={(
            <button className="button button-secondary" type="button" onClick={() => setRetry((value) => value + 1)}>
              {t("retry")}
            </button>
          )}
        />
      ) : visibleGames.length ? (
        <GameGrid games={visibleGames} />
      ) : (
        <EmptyState
          icon={favoritesOnly ? <Heart size={24} /> : <Search size={24} />}
          message={
            favoritesOnly
              ? submittedQuery
                ? t("emptySearch")
                : t("emptyFavorites")
              : submittedQuery
                ? t("emptySearch")
                : categorySlug
                  ? t("categoryEmpty")
                  : t("emptyGames")
          }
          action={
            submittedQuery ? (
              <button className="button button-secondary" type="button" onClick={clearSearch}>
                {t("clearSearch")}
              </button>
            ) : favoritesOnly ? (
              <Link className="button button-primary" href="/games">
                {t("discover")}
              </Link>
            ) : undefined
          }
        />
      )}
    </PageContainer>
  );
}
