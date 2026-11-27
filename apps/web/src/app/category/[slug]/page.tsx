import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteShell } from "@/components/site-shell";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SiteShell><CatalogBrowser categorySlug={slug} /></SiteShell>;
}
