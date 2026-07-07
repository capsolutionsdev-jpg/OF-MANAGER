import { redirect } from "next/navigation";
import { hasStrictFeature } from "@/lib/feature-guard";

/** Module Diplômes : réservé aux organismes ayant la fonctionnalité `diplomes`. */
export default async function DiplomesLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasStrictFeature("diplomes"))) redirect("/dashboard");
  return <>{children}</>;
}
