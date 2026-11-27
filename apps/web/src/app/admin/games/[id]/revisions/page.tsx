import { RevisionsPage } from "@/components/admin-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RevisionsPage gameId={id} />;
}
