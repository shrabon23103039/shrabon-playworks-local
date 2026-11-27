import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteShell } from "@/components/site-shell";

export default function FavoritesPage() {
  return <SiteShell><CatalogBrowser favoritesOnly /></SiteShell>;
}
