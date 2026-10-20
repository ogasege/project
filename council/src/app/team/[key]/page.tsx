import { redirect } from "next/navigation";

export default async function TeamIndex({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  redirect(`/team/${key}/issues`);
}
