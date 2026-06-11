import type { Role } from "@prisma/client";
import { canAccessSection } from "@/lib/permissions";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  Target,
  UserCog,
  PenLine,
  Bell,
  Shield,
  BarChart3,
  GraduationCap,
  Building2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  // Section pour le filtrage des collaborateurs (clé de lib/permissions).
  // Absent = visible pour tous les rôles autorisés (ex. tableau de bord).
  permission?: string;
};

/** Entrées de menu visibles pour un utilisateur (rôle + sections autorisées). */
export function visibleNavItems(role: Role, permissions: string[]): NavItem[] {
  return navItems.filter(
    (item) =>
      item.roles.includes(role) &&
      (!item.permission || canAccessSection(role, permissions, item.permission)),
  );
}

// Navigation principale (Phase 1). De nouveaux modules s'ajouteront ici.
export const navItems: NavItem[] = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR", "APPRENANT"],
  },
  {
    label: "Mes cours",
    href: "/mes-cours",
    icon: GraduationCap,
    roles: ["APPRENANT"],
  },
  {
    label: "CRM",
    href: "/crm",
    icon: Target,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "crm",
  },
  {
    label: "Candidats",
    href: "/candidats",
    icon: Users,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "candidats",
  },
  {
    label: "Clients pro",
    href: "/clients-pro",
    icon: Building2,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "clients-pro",
  },
  {
    label: "Formations",
    href: "/formations",
    icon: BookOpen,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "formations",
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: CalendarDays,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR"],
    permission: "sessions",
  },
  {
    label: "E-learning",
    href: "/elearning",
    icon: GraduationCap,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "FORMATEUR"],
    permission: "elearning",
  },
  {
    label: "Signatures",
    href: "/signatures",
    icon: PenLine,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "signatures",
  },
  {
    label: "Automatisations",
    href: "/automatisations",
    icon: Bell,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "automatisations",
  },
  {
    label: "Formateurs",
    href: "/formateurs",
    icon: UserCog,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "formateurs",
  },
  {
    label: "BPF",
    href: "/bpf",
    icon: BarChart3,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "bpf",
  },
  {
    label: "Qualiopi",
    href: "/qualiopi",
    icon: ShieldCheck,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "qualiopi",
  },
  {
    label: "RGPD",
    href: "/rgpd",
    icon: Shield,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "rgpd",
  },
];

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrateur",
  RESPONSABLE_FORMATION: "Responsable formation",
  ASSISTANT: "Assistant administratif",
  FORMATEUR: "Formateur",
  APPRENANT: "Apprenant",
};
