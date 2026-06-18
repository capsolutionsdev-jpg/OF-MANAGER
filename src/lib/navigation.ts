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
  BellRing,
  Shield,
  BarChart3,
  GraduationCap,
  Building2,
  Wallet,
  CalendarRange,
  DoorOpen,
  FileText,
  Columns3,
  ListTodo,
  Inbox,
  Gauge,
  MessageSquare,
  Sparkles,
  PieChart,
  KeyRound,
  LifeBuoy,
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

/**
 * Entrées de menu visibles pour un utilisateur : rôle + sections autorisées
 * (permissions collaborateur) + fonctionnalités activées pour l'organisme.
 * `fonctionnalites` vide = tout activé (cf. hasFeature).
 */
export function visibleNavItems(
  role: Role,
  permissions: string[],
  fonctionnalites: string[] = [],
): NavItem[] {
  return navItems.filter(
    (item) =>
      item.roles.includes(role) &&
      (!item.permission || canAccessSection(role, permissions, item.permission)) &&
      (!item.permission ||
        fonctionnalites.length === 0 ||
        fonctionnalites.includes(item.permission)),
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
    label: "Mes documents",
    href: "/mes-documents",
    icon: FileText,
    roles: ["APPRENANT"],
  },
  {
    label: "Mes émargements",
    href: "/mes-emargements",
    icon: PenLine,
    roles: ["APPRENANT"],
  },
  {
    label: "Mes sessions",
    href: "/mes-sessions",
    icon: CalendarDays,
    roles: ["FORMATEUR"],
  },
  {
    label: "Mes contrats",
    href: "/mes-contrats",
    icon: FileText,
    roles: ["FORMATEUR"],
  },
  {
    label: "Ma facturation",
    href: "/ma-facturation",
    icon: Wallet,
    roles: ["FORMATEUR"],
  },
  {
    label: "CRM",
    href: "/crm",
    icon: Target,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "crm",
  },
  {
    label: "Kanban",
    href: "/kanban",
    icon: Columns3,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "kanban",
  },
  {
    label: "Tâches",
    href: "/taches",
    icon: ListTodo,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "taches",
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: BellRing,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "notifications",
  },
  {
    label: "Leads multi-canal",
    href: "/leads-multicanal",
    icon: Inbox,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "leads-multicanal",
  },
  {
    label: "Scoring",
    href: "/scoring",
    icon: Gauge,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "scoring",
  },
  {
    label: "SMS",
    href: "/sms",
    icon: MessageSquare,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "sms",
  },
  {
    label: "Assistant IA",
    href: "/ia",
    icon: Sparkles,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "ia",
  },
  {
    label: "Rapports",
    href: "/rapports",
    icon: PieChart,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "rapports",
  },
  {
    label: "Espace client",
    href: "/portail-client",
    icon: KeyRound,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "portail-client",
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
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "sessions",
  },
  {
    label: "Planning",
    href: "/planning",
    icon: CalendarRange,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "planning",
  },
  {
    label: "Salles",
    href: "/salles",
    icon: DoorOpen,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "salles",
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
    label: "Suivi comptable",
    href: "/comptabilite",
    icon: Wallet,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "comptabilite",
  },
  {
    label: "Devis",
    href: "/devis",
    icon: FileText,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "facturation",
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
  {
    label: "Support",
    href: "/support",
    icon: LifeBuoy,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "support",
  },
];

export const roleLabels: Record<Role, string> = {
  SUPERADMIN: "Super-administrateur (éditeur)",
  ADMIN: "Administrateur",
  RESPONSABLE_FORMATION: "Responsable formation",
  ASSISTANT: "Assistant administratif",
  FORMATEUR: "Formateur",
  APPRENANT: "Apprenant",
};
