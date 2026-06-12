import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppTopNav } from "@/components/app-topnav";

// Rendu dynamique : ces pages lisent la base de données et la session,
// elles ne doivent pas être pré-générées au build.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/40">
      <AppTopNav user={session.user} />
      <main className="mx-auto max-w-[1500px] p-4 md:p-6">{children}</main>
    </div>
  );
}
