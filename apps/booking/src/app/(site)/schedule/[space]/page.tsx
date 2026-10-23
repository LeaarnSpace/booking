import { redirect } from "next/navigation";

// Older links to a space's calendar: the Schedule page filtered to it
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ space: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ space }, { date }] = await Promise.all([params, searchParams]);
  redirect(`/schedule?${new URLSearchParams({ view: space, ...(date ? { date } : {}) })}`);
}
