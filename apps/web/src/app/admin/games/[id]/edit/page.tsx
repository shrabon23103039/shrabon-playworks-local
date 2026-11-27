import { GameEditorPage } from "@/components/admin-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GameEditorPage gameId={id} />;
}
