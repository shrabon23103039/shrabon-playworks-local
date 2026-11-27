import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteShell } from "@/components/site-shell";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return <SiteShell><CatalogBrowser key={q} initialQuery={q} /></SiteShell>;
}
