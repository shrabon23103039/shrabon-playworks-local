import type { Locale } from "./types";

export function localizedText(
  value: Partial<Record<Locale, string>> | undefined,
  locale: Locale,
): { text: string; fallback: boolean } {
  if (!value) return { text: "", fallback: false };
  const text = value[locale];
  return text
    ? { text, fallback: false }
    : { text: value.en ?? "", fallback: locale === "bn" };
}

export function formatDisplayDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(parsed);
}
