import { IdeApp } from "@/components/IdeApp";

export default async function ReplPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <IdeApp slug={slug} />;
}
