import { redirect } from "next/navigation";

export default async function LegacyMarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/tasks/${id}`);
}
