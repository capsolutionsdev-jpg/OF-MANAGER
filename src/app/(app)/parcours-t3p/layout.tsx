import { redirect } from "next/navigation";
import { hasStrictFeature } from "@/lib/feature-guard";

/** Module « Parcours T3P » : opt-in par organisme (feature parcours-t3p). */
export default async function ParcoursT3PLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasStrictFeature("parcours-t3p"))) redirect("/dashboard");
  return <>{children}</>;
}
