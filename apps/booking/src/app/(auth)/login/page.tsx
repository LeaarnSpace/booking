import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CodeSignIn } from "@/components/auth/code-sign-in";
import { signInMethods } from "@/lib/env";
import { getViewer, safeNext } from "@/lib/viewer";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getViewer()) redirect(next);
  return <CodeSignIn mode="login" next={next} methods={signInMethods()} />;
}
