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
  Scale,
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
  Calculator,
  Award,
  Gavel,
  Library,
  UserCircle,
  History,
  Globe,
  Newspaper,
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
  // Flag d'organisme STRICT : l'item n'apparaît QUE si l'organisme a
  // explicitement cette fonctionnalité (contrairement à `permission` où une
  // liste vide = tout activé). Sert aux modules réservés à un tenant.
  feature?: string;
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
        fonctionnalites.includes(item.permission)) &&
      // Flag STRICT (module réservé) : doit être explicitement présent.
      (!item.feature || fonctionnalites.includes(item.feature)),
  );
}

// Navigation principale (Phase 1). De nouveaux modules s'ajouteront ici.
export const navItems: NavItem[] = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR"],
  },
  {
    label: "Accueil",
    href: "/mon-espace",
    icon: LayoutDashboard,
    roles: ["APPRENANT"],
  },
  {
    label: "Mes formations",
    href: "/mes-formations",
    icon: BookOpen,
    roles: ["APPRENANT"],
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
    label: "Mes certificats",
    href: "/mes-certificats",
    icon: Award,
    roles: ["APPRENANT"],
  },
  {
    label: "Catalogue",
    href: "/catalogue",
    icon: Library,
    roles: ["APPRENANT"],
  },
  {
    label: "Messagerie",
    href: "/messagerie",
    icon: MessageSquare,
    roles: ["APPRENANT"],
  },
  {
    label: "Notifications",
    href: "/mes-notifications",
    icon: BellRing,
    roles: ["APPRENANT"],
  },
  {
    label: "Historique",
    href: "/historique",
    icon: History,
    roles: ["APPRENANT"],
  },
  {
    label: "Mon profil",
    href: "/mon-profil",
    icon: UserCircle,
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
    label: "Simulateur financement",
    href: "/simulateur-financement",
    icon: Calculator,
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
    label: "Validations",
    href: "/validations",
    icon: ShieldCheck,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "validations",
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
    label: "Site vitrine",
    href: "/site-vitrine",
    icon: Globe,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "site-vitrine",
  },
  {
    label: "Blog",
    href: "/blog",
    icon: Newspaper,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "blog",
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
    label: "Examen civique",
    href: "/examen-civique",
    icon: GraduationCap,
    roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    permission: "elearning",
    // Module réservé à CAP Compétences : masqué pour les autres organismes.
    feature: "examen-civique",
  },
  {
    label: "Diplômes",
    href: "/diplomes",
    icon: Award,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "suivi-pedagogique",
    feature: "diplomes",
  },
  {
    label: "Jurys",
    href: "/jurys",
    icon: Gavel,
    roles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
    permission: "suivi-pedagogique",
    feature: "jurys",
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
    label: "Trésorerie & bilan",
    href: "/tresorerie",
    icon: Scale,
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

// ── Regroupement de la barre de navigation par catégories (barre allégée) ──
// Les entrées non listées ici (ex. Tableau de bord, espaces apprenant/formateur)
// restent des liens directs. Les entrées « __footer » sortent de la barre et
// vont dans le pied de page (avec les mentions légales).
const GROUP_BY_HREF: Record<string, string> = {
  "/crm": "Commercial", "/simulateur-financement": "Commercial", "/kanban": "Commercial", "/taches": "Commercial", "/validations": "Commercial",
  "/notifications": "Commercial", "/leads-multicanal": "Commercial",
  "/scoring": "Commercial", "/portail-client": "Commercial",
  "/candidats": "Formation", "/clients-pro": "Formation", "/formations": "Formation",
  "/sessions": "Formation", "/planning": "Formation", "/salles": "Formation",
  "/elearning": "Formation", "/examen-civique": "Formation", "/formateurs": "Formation",
  "/diplomes": "Formation", "/jurys": "Formation",
  "/sms": "Communication", "/ia": "Communication", "/signatures": "Communication",
  "/automatisations": "Communication",
  "/comptabilite": "Finance", "/tresorerie": "Finance", "/devis": "Finance", "/bpf": "Finance", "/rapports": "Finance",
  "/qualiopi": "Qualité",
  "/rgpd": "__footer", "/support": "__footer",
};

export const NAV_GROUP_ORDER = ["Commercial", "Formation", "Communication", "Finance", "Qualité"];

export type NavSection = {
  standalone: NavItem[];
  groups: { name: string; items: NavItem[] }[];
  footer: NavItem[];
};

/** Construit la navigation regroupée pour un utilisateur (barre + footer). */
export function buildNav(
  role: Role,
  permissions: string[],
  fonctionnalites: string[] = [],
): NavSection {
  const items = visibleNavItems(role, permissions, fonctionnalites);
  const standalone: NavItem[] = [];
  const footer: NavItem[] = [];
  const byGroup = new Map<string, NavItem[]>();
  for (const it of items) {
    const g = GROUP_BY_HREF[it.href];
    if (!g) standalone.push(it);
    else if (g === "__footer") footer.push(it);
    else {
      const arr = byGroup.get(g) ?? [];
      arr.push(it);
      byGroup.set(g, arr);
    }
  }
  const groups = NAV_GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
    name: g,
    items: byGroup.get(g)!,
  }));
  return { standalone, groups, footer };
}

export const roleLabels: Record<Role, string> = {
  SUPERADMIN: "Super-administrateur (éditeur)",
  ADMIN: "Administrateur",
  RESPONSABLE_FORMATION: "Responsable formation",
  ASSISTANT: "Assistant administratif",
  FORMATEUR: "Formateur",
  APPRENANT: "Apprenant",
};
