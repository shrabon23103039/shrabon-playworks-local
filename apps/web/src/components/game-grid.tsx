"use client";

import Link from "next/link";
import { ArrowUpRight, Heart, Sparkles } from "lucide-react";
import { useFavorites, useLocale } from "./locale-provider";
import { GameArtwork } from "./game-artwork";
import { formatDisplayDate, localizedText } from "@/lib/localization";
import { trackEvent } from "@/lib/api";
import type { Game } from "@/lib/types";

export function GameCard({ game }: { game: Game }) {
  const { locale, t } = useLocale();
  const { favorites, toggleFavorite } = useFavorites();
  const isFavorite = favorites.includes(game.slug);
  const title = localizedText(game.title, locale);
  const description = localizedText(game.shortDescription, locale);
  const category = localizedText(game.category, locale).text || t("studio");
  const publishedDate = formatDisplayDate(game.publishedAt, locale);

  return (
    <article className="game-card">
      <div className="game-art">
        <Link className="game-art-link" href={`/games/${game.slug}`} tabIndex={-1} aria-hidden="true">
          <GameArtwork slug={game.slug} categorySlug={game.categorySlug} />
        </Link>
        <span className="art-badge">
          <Sparkles size={13} aria-hidden="true" />
          {t("original")}
        </span>
        <button
          className={`favorite-button${isFavorite ? " is-favorite" : ""}`}
          type="button"
          aria-label={isFavorite ? `${t("unfavorite")}: ${title.text}` : `${t("favorite")}: ${title.text}`}
          aria-pressed={isFavorite}
          onClick={() => {
            if (!isFavorite) trackEvent("favorite", game.slug);
            toggleFavorite(game.slug);
          }}
        >
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      <div className="game-card-body">
        <div className="card-kicker">
          <span className="card-category-pill">{category}</span>
          <span>{publishedDate || t("minutes")}</span>
        </div>
        <h3>
          <Link href={`/games/${game.slug}`}>{title.text}</Link>
        </h3>
        {title.fallback && <span className="fallback-label">{t("contentFallback")}</span>}
        <p className="game-card-desc">{description.text}</p>
        {description.fallback && <span className="fallback-label">{t("contentFallback")}</span>}
        <div className="card-footer-row">
          <Link className="card-play-link" href={`/games/${game.slug}`}>
            <span>{t("openGame")}</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function GameGrid({ games }: { games: Game[] }) {
  return (
    <div className="game-grid">
      {games.map((game) => (
        <GameCard key={game.slug} game={game} />
      ))}
    </div>
  );
}
