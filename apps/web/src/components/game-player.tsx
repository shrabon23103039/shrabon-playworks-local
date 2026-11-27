"use client";

import { Expand, Heart, Maximize2, Minimize2, Play, RotateCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/api";
import { GameArtwork } from "./game-artwork";
import { useFavorites, useLocale } from "./locale-provider";

const gameOrigin = process.env.NEXT_PUBLIC_GAME_ORIGIN ?? "http://localhost:4002";
const PACKAGE_ENTRY_PATTERN = /^\/packages\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/index\.html$/i;

function isSupportedEntryPath(entryPath: string): boolean {
  return (
    entryPath === "/games/meteor-dash/index.html" ||
    entryPath === "/games/orbit-memory/index.html" ||
    PACKAGE_ENTRY_PATTERN.test(entryPath)
  );
}

export function GamePlayer({
  entryPath,
  slug,
  categorySlug,
  gameTitle,
}: {
  entryPath: string;
  slug: string;
  categorySlug?: string;
  gameTitle: string;
}) {
  const { locale, t } = useLocale();
  const { favorites, toggleFavorite, recordRecentPlay } = useFavorites();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const [theater, setTheater] = useState(false);
  const [version, setVersion] = useState(0);

  const isFavorite = favorites.includes(slug);

  useEffect(() => {
    if (!theater) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTheater(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [theater]);

  function start() {
    if (!isSupportedEntryPath(entryPath)) {
      setError(true);
      return;
    }
    setError(false);
    setFullscreenError(false);
    setLoading(true);
    setStarted(true);
    recordRecentPlay(slug);
    trackEvent("game_launch", slug);
  }

  function restartGame() {
    setVersion((value) => value + 1);
    start();
  }

  async function fullscreen() {
    const frame = frameRef.current;
    if (!frame) return;
    if (!document.fullscreenEnabled) {
      setFullscreenError(true);
      return;
    }
    try {
      await frame.requestFullscreen();
      setFullscreenError(false);
    } catch {
      setFullscreenError(true);
    }
  }

  const src = `${gameOrigin}${entryPath}?lang=${locale}`;

  return (
    <div className={`player-wrap${theater ? " is-theater" : ""}`}>
      <div className="player-stage">
        {error && !started ? (
          <div className="player-overlay player-error" role="alert">
            <p>{t("playerError")}</p>
            <button className="button button-primary" type="button" onClick={restartGame}>
              <RotateCw size={15} aria-hidden="true" />
              {t("retry")}
            </button>
          </div>
        ) : started ? (
          <>
            <iframe
              key={`${slug}-${locale}-${version}`}
              ref={frameRef}
              className="game-frame"
              src={src}
              title={gameTitle}
              sandbox="allow-scripts"
              allow="fullscreen"
              referrerPolicy="no-referrer"
              onLoad={() => {
                setLoading(false);
                setError(false);
              }}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
            {loading && (
              <div className="player-overlay" role="status">
                {t("loadingGame")}
              </div>
            )}
            {error && (
              <div className="player-overlay player-error" role="alert">
                <p>{t("playerError")}</p>
                <button className="button button-primary" type="button" onClick={restartGame}>
                  <RotateCw size={15} aria-hidden="true" />
                  {t("retry")}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="player-start-backdrop">
            <div className="player-start-art" aria-hidden="true">
              <GameArtwork slug={slug} categorySlug={categorySlug} />
            </div>
            <button className="player-start" type="button" onClick={start}>
              <span className="play-orb" aria-hidden="true">
                <Play size={24} fill="currentColor" />
              </span>
              <span>{t("playNow")}</span>
            </button>
          </div>
        )}
      </div>

      {fullscreenError && (
        <p className="player-inline-error" role="status">
          {t("fullscreenUnavailable")}
        </p>
      )}

      <div className="player-toolbar">
        <div className="player-toolbar-title">
          <span className={`player-live-dot${started && !error ? " active" : ""}`} aria-hidden="true" />
          <strong>{gameTitle}</strong>
        </div>
        <div className="player-toolbar-actions">
          <button
            className={`player-control${isFavorite ? " is-favorite" : ""}`}
            type="button"
            aria-pressed={isFavorite}
            onClick={() => {
              if (!isFavorite) trackEvent("favorite", slug);
              toggleFavorite(slug);
            }}
          >
            <Heart size={15} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
            <span>{isFavorite ? t("saved") : t("favorite")}</span>
          </button>

          {started && (
            <button className="player-control" type="button" onClick={restartGame}>
              <RotateCw size={15} aria-hidden="true" />
              <span>{t("restart")}</span>
            </button>
          )}

          <button
            className={`player-control${theater ? " is-active" : ""}`}
            type="button"
            aria-pressed={theater}
            onClick={() => setTheater((value) => !value)}
          >
            {theater ? <Minimize2 size={15} aria-hidden="true" /> : <Expand size={15} aria-hidden="true" />}
            <span>{theater ? t("exitTheater") : t("theaterMode")}</span>
          </button>

          <button className="player-control" type="button" onClick={() => void fullscreen()} disabled={!started}>
            <Maximize2 size={15} aria-hidden="true" />
            <span>{t("fullscreen")}</span>
          </button>
        </div>
      </div>

      <p className="player-safety">
        <ShieldCheck size={13} aria-hidden="true" style={{ verticalAlign: "text-bottom", marginRight: 6 }} />
        {t("playerSafety")}
      </p>
    </div>
  );
}
