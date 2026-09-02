import { redirect } from "next/navigation";
import { hasStrictFeature } from "@/lib/feature-guard";

/** Module « Audit » : opt-in par organisme (feature `audit`). */
export default async function AuditLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasStrictFeature("audit"))) redirect("/dashboard");
  return <>{children}</>;
}
