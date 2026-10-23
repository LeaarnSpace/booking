// Sign-up, login and code pages: a centred card with no app navigation, as in the design.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-svh items-center justify-center bg-white px-4 py-10 md:bg-sunk">{children}</main>;
}
