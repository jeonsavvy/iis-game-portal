import { redirect } from "next/navigation";

type DiscoverSearchParams = {
  q?: string;
  genre?: string;
  sort?: string;
};

export default async function DiscoverPage({ searchParams }: { searchParams?: Promise<DiscoverSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.genre) query.set("genre", params.genre);
  if (params.sort) query.set("sort", params.sort);
  redirect(query.toString() ? `/?${query.toString()}` : "/");
}
