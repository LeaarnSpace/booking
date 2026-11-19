import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmailLinkSignIn } from "@/components/auth/email-link-sign-in";
import { getViewer, safeNext } from "@/lib/viewer";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Where the Sign in button in the code email lands. It signs in only when they tap Sign in here, not on opening
// the link: email security scanners open links to check them, and would otherwise use up the code.
export default async function EmailLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; code?: string; next?: string; new?: string; name?: string }>;
}) {
  const { email, code, new: isNew, name, ...rest } = await searchParams;
  const next = safeNext(rest.next);
  const viewer = await getViewer();
  if (viewer && viewer.email === email?.trim().toLowerCase()) redirect(next);
  return (
    <EmailLinkSignIn
      email={email?.trim() ?? ""}
      code={/^\d{6}$/.test(code ?? "") ? code! : ""}
      next={next}
      signUp={isNew === "1"}
      name={name?.trim().slice(0, 80) ?? ""}
    />
  );
}
