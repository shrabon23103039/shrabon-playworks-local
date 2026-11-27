"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Gamepad2,
  Heart,
  Play,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { localizedText } from "@/lib/localization";
import type { Category, Game } from "@/lib/types";
import { useFavorites, useLocale } from "./locale-provider";
import { GameArtwork } from "./game-artwork";
import { GameGrid } from "./game-grid";
import { SiteShell } from "./site-shell";
import { EmptyState, GameGridSkeleton } from "./ui-primitives";

type CatalogResponse = { games: Game[] };
type CategoryResponse = { categories: Category[] };
type HomeState = {
  attempt: number;
  status: "loading" | "ready" | "error";
  games: Game[];
  categories: Category[];
  gamesFailed: boolean;
  categoriesFailed: boolean;
};

function CategoryIcon({ slug }: { slug: string }) {
  if (slug === "arcade") return <Zap size={20} aria-hidden="true" />;
  if (slug === "puzzle") return <Puzzle size={20} aria-hidden="true" />;
  return <Gamepad2 size={20} aria-hidden="true" />;
}

export function HomePage() {
  const { locale, t } = useLocale();
  const { favorites, recentSlugs, clearRecentPlays } = useFavorites();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<HomeState>({
    attempt: 0,
    status: "loading",
    games: [],
    categories: [],
    gamesFailed: false,
    categoriesFailed: false,
  });

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiRequest<CatalogResponse>("/games?limit=12"),
      apiRequest<CategoryResponse>("/categories"),
    ]).then(([gamesResult, categoryResult]) => {
      if (!active) return;
      const games = gamesResult.status === "fulfilled" ? gamesResult.value.games : [];
      const categories = categoryResult.status === "fulfilled" ? categoryResult.value.categories : [];
      const gamesFailed = gamesResult.status === "rejected";
      const categoriesFailed = categoryResult.status === "rejected";
      setState({
        attempt: retry,
        status: gamesFailed && categoriesFailed ? "error" : "ready",
        games,
        categories,
        gamesFailed,
        categoriesFailed,
      });
    });
    return () => {
      active = false;
    };
  }, [retry]);

  const loading = state.attempt !== retry || state.status === "loading";
  const games = state.games;
  const categories = state.categories;
  const spotlight = games[0] ?? null;
  const spotlightTitle = spotlight ? localizedText(spotlight.title, locale).text : "";
  const spotlightDesc = spotlight ? localizedText(spotlight.shortDescription, locale).text : "";

  const recentGames = useMemo(() => {
    const bySlug = new Map(games.map((game) => [game.slug, game]));
    return recentSlugs.map((slug) => bySlug.get(slug)).filter((game): game is Game => Boolean(game));
  }, [games, recentSlugs]);

  const favoriteGames = useMemo(
    () => games.filter((game) => favorites.includes(game.slug)),
    [games, favorites],
  );

  function categorySummary(slug: string): string {
    if (slug === "arcade") return t("categoryDescriptionArcade");
    if (slug === "puzzle") return t("categoryDescriptionPuzzle");
    return t("categoryDescriptionDefault");
  }

  return (
    <SiteShell>
      <div className="home-portal">
        <section className="portal-intro" aria-label={t("featuredEyebrow")}>
          <div className="portal-intro-copy">
            <span className="eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              {t("featuredEyebrow")}
            </span>
            <h1>
              {t("heroTitle")} <span>{t("heroAccent")}</span>
            </h1>
            <p>{t("heroCopy")}</p>
            <div className="portal-intro-actions">
              <Link className="button button-primary" href={spotlight ? `/games/${spotlight.slug}` : "/games"}>
                <Play size={16} aria-hidden="true" />
                <span>{spotlight ? `${t("playNow")}: ${spotlightTitle}` : t("discover")}</span>
              </Link>
              <Link className="button button-secondary" href="/games">
                <span>{t("discover")}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="portal-meta-line">
              <span><BadgeCheck size={15} aria-hidden="true" />{t("original")}</span>
              <span><ShieldCheck size={15} aria-hidden="true" />{t("html5Sandbox")}</span>
              {!loading && !state.gamesFailed && (
                <span>
                  <Gamepad2 size={15} aria-hidden="true" />
                  {games.length} {games.length === 1 ? t("gameCountSingle") : t("gamesCountLabel")}
                </span>
              )}
            </div>
          </div>

          {spotlight ? (
            <Link className="spotlight-card" href={`/games/${spotlight.slug}`}>
              <div className="spotlight-media">
                <GameArtwork slug={spotlight.slug} categorySlug={spotlight.categorySlug} />
                <span className="spotlight-badge">
                  <Sparkles size={13} aria-hidden="true" />
                  {t("featuredBadge")}
                </span>
              </div>
              <div className="spotlight-body">
                <div>
                  <h2>{spotlightTitle}</h2>
                  <p>{spotlightDesc}</p>
                </div>
                <span className="button button-primary button-sm">
                  <Play size={14} aria-hidden="true" />
                  {t("playNow")}
                </span>
              </div>
            </Link>
          ) : (
            <div className="spotlight-card">
              <div className="spotlight-media">
                <GameArtwork slug="meteor-dash" categorySlug="arcade" />
                <span className="spotlight-badge">
                  <Gamepad2 size={13} aria-hidden="true" />
                  {t("studio")}
                </span>
              </div>
              <div className="spotlight-body">
                <div>
                  <h2>{t("allGames")}</h2>
                  <p>{t("catalogSubtitle")}</p>
                </div>
                <Link className="button button-secondary button-sm" href="/games">
                  {t("discover")}
                </Link>
              </div>
            </div>
          )}
        </section>

        {recentGames.length > 0 && (
          <section className="section-block" aria-labelledby="recent-title">
            <div className="section-heading">
              <div>
                <span className="section-eyebrow">
                  <Clock size={14} aria-hidden="true" />
                  {t("recentGames")}
                </span>
                <h2 id="recent-title">{t("recentGames")}</h2>
                <p>{t("recentCopy")}</p>
              </div>
              <button className="text-button" type="button" onClick={clearRecentPlays}>
                {t("clearRecent")}
              </button>
            </div>
            <GameGrid games={recentGames} />
          </section>
        )}

        <section className="section-block" aria-labelledby="featured-title">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">{t("studio")}</span>
              <h2 id="featured-title">{t("newGames")}</h2>
              <p>{t("featuredCopy")}</p>
            </div>
            <Link className="text-link" href="/games">
              <span>{t("seeAll")}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {loading ? (
            <GameGridSkeleton count={2} />
          ) : state.gamesFailed ? (
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
          ) : games.length ? (
            <GameGrid games={games} />
          ) : (
            <EmptyState message={t("emptyGames")} />
          )}
        </section>

        {favoriteGames.length > 0 && (
          <section className="section-block" aria-labelledby="favorites-home-title">
            <div className="section-heading">
              <div>
                <span className="section-eyebrow">
                  <Heart size={14} aria-hidden="true" />
                  {t("navFavorites")}
                </span>
                <h2 id="favorites-home-title">{t("navFavorites")}</h2>
                <p>{t("favoritesSubtitle")}</p>
              </div>
              <Link className="text-link" href="/favorites">
                <span>{t("seeAll")}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <GameGrid games={favoriteGames} />
          </section>
        )}

        <section className="section-block" aria-labelledby="category-title">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">{t("browse")}</span>
              <h2 id="category-title">{t("categories")}</h2>
            </div>
            <Link className="text-link" href="/games">
              <span>{t("seeAll")}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {loading ? (
            <div className="category-grid" aria-busy="true">
              <div className="category-tile" aria-hidden="true"><div className="skeleton-line medium" /></div>
              <div className="category-tile" aria-hidden="true"><div className="skeleton-line medium" /></div>
            </div>
          ) : state.categoriesFailed ? (
            <EmptyState
              role="alert"
              icon={<RefreshCw size={24} />}
              message={t("categoriesError")}
              action={(
                <button className="button button-secondary" type="button" onClick={() => setRetry((value) => value + 1)}>
                  {t("retry")}
                </button>
              )}
            />
          ) : categories.length ? (
            <div className="category-grid">
              {categories.map((category) => (
                <Link className="category-tile" href={`/category/${category.slug}`} key={category.slug}>
                  <div className="category-tile-left">
                    <span className="category-icon">
                      <CategoryIcon slug={category.slug} />
                    </span>
                    <div>
                      <strong>{category.name[locale] ?? category.name.en}</strong>
                      <small>{categorySummary(category.slug)}</small>
                    </div>
                  </div>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message={t("emptyGames")} />
          )}
        </section>
      </div>
    </SiteShell>
  );
}
