"use client";

import Link from "next/link";
import { ChevronRight, Gamepad2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest, trackEvent } from "@/lib/api";
import { formatDisplayDate, localizedText } from "@/lib/localization";
import type { Game } from "@/lib/types";
import { useLocale } from "./locale-provider";
import { GameArtwork } from "./game-artwork";
import { GameGrid } from "./game-grid";
import { GamePlayer } from "./game-player";
import { PageContainer, SiteShell } from "./site-shell";
import { DetailSkeleton, EmptyState } from "./ui-primitives";

type GameResponse = { game: Game };
type GamesResponse = { games: Game[] };
type DetailState = {
  slug: string;
  status: "loading" | "ready" | "missing" | "error";
  game: Game | null;
  related: Game[];
  relatedError: boolean;
};

export function GameDetailPage({ slug }: { slug: string }) {
  const { locale, t } = useLocale();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<DetailState>({
    slug: "",
    status: "loading",
    game: null,
    related: [],
    relatedError: false,
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { game: found } = await apiRequest<GameResponse>(`/games/${encodeURIComponent(slug)}`);
        if (!active) return;
        setState({
          slug,
          status: "ready",
          game: found,
          related: [],
          relatedError: false,
        });
        trackEvent("game_view", slug);
        try {
          const relatedGames = await apiRequest<GamesResponse>(
            `/games?${new URLSearchParams({ category: found.categorySlug ?? "", exclude: slug, limit: "3" })}`,
          );
          if (active) {
            setState((current) =>
              current.slug === slug ? { ...current, related: relatedGames.games } : current,
            );
          }
        } catch {
          if (active) {
            setState((current) =>
              current.slug === slug ? { ...current, relatedError: true } : current,
            );
          }
        }
      } catch (error: unknown) {
        if (!active) return;
        const isMissing = typeof error === "object" && error !== null && "status" in error && error.status === 404;
        setState({
          slug,
          status: isMissing ? "missing" : "error",
          game: null,
          related: [],
          relatedError: false,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, retry]);

  const loading = state.slug !== slug || state.status === "loading";
  const game = state.slug === slug ? state.game : null;
  const related = state.slug === slug ? state.related : [];
  const relatedError = state.slug === slug && state.relatedError;
  const notFound = state.slug === slug && state.status === "missing";

  const title = localizedText(game?.title, locale);
  const shortDesc = localizedText(game?.shortDescription, locale);
  const summary = localizedText(game?.description, locale);
  const instructions = localizedText(game?.instructions, locale);
  const categoryName = localizedText(game?.category, locale).text || t("studio");
  const publishedDate = formatDisplayDate(game?.publishedAt, locale);

  return (
    <SiteShell>
      <PageContainer>
        {loading ? (
          <DetailSkeleton />
        ) : notFound || !game ? (
          <EmptyState
            role="alert"
            icon={notFound ? <Gamepad2 size={26} /> : <RefreshCw size={24} />}
            message={t(notFound ? "unavailable" : "loadError")}
            action={
              notFound ? (
                <Link className="button button-primary" href="/games">
                  {t("backToGames")}
                </Link>
              ) : (
                <button className="button button-secondary" type="button" onClick={() => setRetry((v) => v + 1)}>
                  {t("retry")}
                </button>
              )
            }
          />
        ) : (
          <>
            <nav className="breadcrumbs" aria-label={t("breadcrumbLabel")}>
              <Link href="/games">{t("backToGames")}</Link>
              <ChevronRight size={14} aria-hidden="true" />
              {game.categorySlug ? (
                <>
                  <Link href={`/category/${game.categorySlug}`}>{categoryName}</Link>
                  <ChevronRight size={14} aria-hidden="true" />
                </>
              ) : null}
              <span aria-current="page">{title.text}</span>
            </nav>

            <section id="player" className="player-section" aria-label={title.text}>
              <GamePlayer
                entryPath={game.entryPath}
                slug={slug}
                categorySlug={game.categorySlug}
                gameTitle={title.text}
              />
            </section>

            <section className="detail-header-card">
              <div>
                <span className="section-eyebrow">{categoryName}</span>
                <h1>{title.text}</h1>
                {title.fallback && <span className="fallback-label">{t("contentFallback")}</span>}
                <p>{shortDesc.text}</p>
                {shortDesc.fallback && <span className="fallback-label">{t("contentFallback")}</span>}
                {Array.isArray(game.tags) && game.tags.length > 0 && (
                  <div className="detail-tags">
                    {game.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="detail-thumb" aria-hidden="true">
                <GameArtwork slug={slug} categorySlug={game.categorySlug} />
              </div>
            </section>

            <div className="detail-columns">
              <section className="info-panel">
                <h2>{t("instructions")}</h2>
                <p>{instructions.text || shortDesc.text}</p>
                {instructions.fallback && <small className="fallback-label">{t("contentFallback")}</small>}
              </section>

              <section className="info-panel">
                <h2>{t("aboutGame")}</h2>
                <p>{summary.text}</p>
                {summary.fallback && <small className="fallback-label">{t("contentFallback")}</small>}
                <dl className="specs-list">
                  <div className="spec-row">
                    <dt>{t("categoryLabel")}</dt>
                    <dd>{categoryName}</dd>
                  </div>
                  <div className="spec-row">
                    <dt>{t("runtime")}</dt>
                    <dd>{t("html5Sandbox")}</dd>
                  </div>
                  {publishedDate && (
                    <div className="spec-row">
                      <dt>{t("publishedOn")}</dt>
                      <dd>{publishedDate}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            {(related.length > 0 || relatedError) && (
              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <span className="section-eyebrow">{categoryName}</span>
                    <h2>{t("related")}</h2>
                  </div>
                </div>
                {relatedError ? (
                  <p className="inline-notice" role="status">{t("relatedLoadError")}</p>
                ) : (
                  <GameGrid games={related} />
                )}
              </section>
            )}
          </>
        )}
      </PageContainer>
    </SiteShell>
  );
}
