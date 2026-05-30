import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  Target,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

// Navigation principale (Phase 1). De nouveaux modules s'ajouteront ici.
export const navItems: NavItem[] = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR", "APPRENANT"],
  },
  {
    label: "CRM Prospects",
    href: "/crm",
    icon: Target,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  },
  {
    label: "Candidats",
    href: "/candidats",
    icon: Users,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  },
  {
    label: "Formations",
    href: "/formations",
    icon: BookOpen,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: CalendarDays,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR"],
  },
  {
    label: "Formateurs",
    href: "/formateurs",
    icon: UserCog,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
  },
  {
    label: "Qualiopi",
    href: "/qualiopi",
    icon: ShieldCheck,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
  },
];

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrateur",
  RESPONSABLE_FORMATION: "Responsable formation",
  ASSISTANT: "Assistant administratif",
  FORMATEUR: "Formateur",
  APPRENANT: "Apprenant",
};
