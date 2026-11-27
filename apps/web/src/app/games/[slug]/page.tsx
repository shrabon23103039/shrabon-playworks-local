import { GameDetailPage } from "@/components/game-detail-page";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GameDetailPage slug={slug} />;
}
