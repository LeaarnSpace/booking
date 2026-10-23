import { redirect } from "next/navigation";

// Older links to a service's calendar: the Schedule page filtered to it
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ space: string; service: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ space, service }, { date }] = await Promise.all([params, searchParams]);
  redirect(`/schedule?${new URLSearchParams({ view: `${space}:${service}`, ...(date ? { date } : {}) })}`);
}
