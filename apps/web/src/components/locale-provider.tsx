"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { messages, type MessageKey } from "@/lib/messages";
import type { Locale } from "@/lib/types";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "playworks.locale";
const LOCALE_EVENT = "playworks:locale-change";
let localeOverride: Locale | null = null;

function getLocaleSnapshot(): Locale {
  if (localeOverride) return localeOverride;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
}

function getServerLocaleSnapshot(): Locale {
  return "en";
}

function subscribeLocale(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      localeOverride = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LOCALE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LOCALE_EVENT, listener);
  };
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getServerLocaleSnapshot);
  const setLocale = useCallback((next: Locale) => {
    localeOverride = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current selection still applies for this page view.
    }
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t: (key: MessageKey) => messages[locale][key] }),
    [locale, setLocale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}

type SlugListSnapshot = {
  items: string[];
  storageAvailable: boolean;
};

const EMPTY_SLUGS: SlugListSnapshot = {
  items: [],
  storageAvailable: true,
};

const FAVORITES_KEY = "playworks.favorites";
const FAVORITES_EVENT = "playworks:favorites-change";
const RECENT_KEY = "playworks.recent";
const RECENT_EVENT = "playworks:recent-change";
const MAX_RECENT_SLUGS = 6;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let favoritesSnapshot: SlugListSnapshot | null = null;
let recentSnapshot: SlugListSnapshot | null = null;

function readSlugList(key: string): SlugListSnapshot {
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return EMPTY_SLUGS;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return EMPTY_SLUGS;
    const valid = parsed.filter((value): value is string => typeof value === "string" && SLUG_PATTERN.test(value));
    return {
      items: [...new Set(valid)],
      storageAvailable: true,
    };
  } catch {
    return { items: [], storageAvailable: false };
  }
}

function getFavoritesSnapshot(): SlugListSnapshot {
  if (favoritesSnapshot) return favoritesSnapshot;
  favoritesSnapshot = readSlugList(FAVORITES_KEY);
  return favoritesSnapshot;
}

function getRecentSnapshot(): SlugListSnapshot {
  if (recentSnapshot) return recentSnapshot;
  recentSnapshot = readSlugList(RECENT_KEY);
  return recentSnapshot;
}

function subscribeStorage(key: string, eventName: string, clearCache: () => void) {
  return (listener: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        clearCache();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(eventName, listener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(eventName, listener);
    };
  };
}

const subscribeFavorites = subscribeStorage(FAVORITES_KEY, FAVORITES_EVENT, () => {
  favoritesSnapshot = null;
});

const subscribeRecent = subscribeStorage(RECENT_KEY, RECENT_EVENT, () => {
  recentSnapshot = null;
});

type FavoritesContextValue = {
  favorites: string[];
  storageAvailable: boolean;
  toggleFavorite: (slug: string) => void;
  recentSlugs: string[];
  recentStorageAvailable: boolean;
  recordRecentPlay: (slug: string) => void;
  clearRecentPlays: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const favSnapshot = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    () => EMPTY_SLUGS,
  );
  const recSnapshot = useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    () => EMPTY_SLUGS,
  );

  const toggleFavorite = useCallback((slug: string) => {
    if (!SLUG_PATTERN.test(slug)) return;
    const current = getFavoritesSnapshot();
    const items = current.items.includes(slug)
      ? current.items.filter((value) => value !== slug)
      : [...current.items, slug];
    let storageAvailable = true;
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
    } catch {
      storageAvailable = false;
    }
    favoritesSnapshot = { items, storageAvailable };
    window.dispatchEvent(new Event(FAVORITES_EVENT));
  }, []);

  const recordRecentPlay = useCallback((slug: string) => {
    if (!SLUG_PATTERN.test(slug)) return;
    const current = getRecentSnapshot();
    const items = [slug, ...current.items.filter((value) => value !== slug)].slice(0, MAX_RECENT_SLUGS);
    let storageAvailable = true;
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(items));
    } catch {
      storageAvailable = false;
    }
    recentSnapshot = { items, storageAvailable };
    window.dispatchEvent(new Event(RECENT_EVENT));
  }, []);

  const clearRecentPlays = useCallback(() => {
    let storageAvailable = true;
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      storageAvailable = false;
    }
    recentSnapshot = { items: [], storageAvailable };
    window.dispatchEvent(new Event(RECENT_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      favorites: favSnapshot.items,
      storageAvailable: favSnapshot.storageAvailable,
      toggleFavorite,
      recentSlugs: recSnapshot.items,
      recentStorageAvailable: recSnapshot.storageAvailable,
      recordRecentPlay,
      clearRecentPlays,
    }),
    [favSnapshot, recSnapshot, toggleFavorite, recordRecentPlay, clearRecentPlays],
  );
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used within FavoritesProvider");
  return value;
}
