import { redirect } from "next/navigation";
import { hasStrictFeature } from "@/lib/feature-guard";

/** Module Jury : réservé aux organismes ayant la fonctionnalité `jurys`. */
export default async function JurysLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasStrictFeature("jurys"))) redirect("/dashboard");
  return <>{children}</>;
}
