import type { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "iis" };
}

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }): Promise<never> {
  const { slug } = await params;
  redirect(`/play/${slug}`);
}
