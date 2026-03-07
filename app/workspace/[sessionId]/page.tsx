import { redirect } from "next/navigation";

export default async function WorkspaceSessionRedirectPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(`/workspace?session=${encodeURIComponent(sessionId)}`);
}
