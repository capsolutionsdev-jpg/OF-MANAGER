/**
 * Phase 2.3 — Navigation Architecture Refactor
 * 50 items → 6 métiers (groups)
 *
 * Each group is collapsible in the sidebar.
 * Feature-gated per tenant.
 */

import type { Role } from "@prisma/client";
import {
  GraduationCap,
  Users,
  DollarSign,
  CheckSquare,
  Settings,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type NavigationGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  items: NavigationItem[];
  featureGate?: string; // Feature flag for this entire group
  allowedRoles: Role[];
};

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  permission?: string;
  feature?: string;
};

/**
 * 6 MÉTIERS (Groups)
 */

// GROUP 1: FORMATIONS & CATALOGUE
export const formationsGroup: NavigationGroup = {
  key: "formations",
  label: "Formations & Catalogue",
  icon: GraduationCap,
  description: "Gestion du catalogue et des sessions",
  allowedRoles: ["ADMIN", "RESPONSABLE_FORMATION", "FORMATEUR"],
  items: [
    {
      label: "Catalogue",
      href: "/formations",
      icon: GraduationCap,
      roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    },
    {
      label: "Sessions",
      href: "/sessions",
      icon: GraduationCap,
      roles: ["ADMIN", "RESPONSABLE_FORMATION", "FORMATEUR"],
    },
    {
      label: "Planning",
      href: "/planning",
      icon: GraduationCap,
      roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    },
    {
      label: "E-Learning",
      href: "/elearning",
      icon: GraduationCap,
      roles: ["ADMIN", "RESPONSABLE_FORMATION", "FORMATEUR"],
      feature: "elearning",
    },
  ],
};

// GROUP 2: CANDIDATS & INSCRIPTIONS
export const candidatsGroup: NavigationGroup = {
  key: "candidats",
  label: "Candidats & Inscriptions",
  icon: Users,
  description: "Gestion des candidats et parcours d'inscription",
  allowedRoles: ["ADMIN", "RESPONSABLE_FORMATION"],
  items: [
    {
      label: "Candidats",
      href: "/candidats",
      icon: Users,
      roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    },
    {
      label: "Inscriptions",
      href: "/inscriptions",
      icon: Users,
      roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    },
    {
      label: "Financement",
      href: "/financement",
      icon: Users,
      roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    },
    {
      label: "Documents",
      href: "/documents",
      icon: Users,
      roles: ["ADMIN", "RESPONSABLE_FORMATION"],
    },
  ],
};

// GROUP 3: FINANCE & FACTURATION
export const financeGroup: NavigationGroup = {
  key: "finance",
  label: "Finance & Facturation",
  icon: DollarSign,
  description: "Devis, factures, trésorerie",
  allowedRoles: ["ADMIN"],
  items: [
    {
      label: "Devis",
      href: "/devis",
      icon: DollarSign,
      roles: ["ADMIN"],
    },
    {
      label: "Factures",
      href: "/factures",
      icon: DollarSign,
      roles: ["ADMIN"],
    },
    {
      label: "Trésorerie",
      href: "/tresorerie",
      icon: DollarSign,
      roles: ["ADMIN"],
    },
    {
      label: "Rapports Financiers",
      href: "/rapports-financiers",
      icon: DollarSign,
      roles: ["ADMIN"],
    },
  ],
};

// GROUP 4: QUALITÉ & AUDIT
export const qualiteGroup: NavigationGroup = {
  key: "qualite",
  label: "Qualité & Audit",
  icon: CheckSquare,
  description: "Qualiopi, agréments, audit trail",
  allowedRoles: ["ADMIN"],
  items: [
    {
      label: "Qualiopi",
      href: "/qualiopi",
      icon: CheckSquare,
      roles: ["ADMIN"],
    },
    {
      label: "BPF",
      href: "/bpf",
      icon: CheckSquare,
      roles: ["ADMIN"],
    },
    {
      label: "Agréments",
      href: "/agrement",
      icon: CheckSquare,
      roles: ["ADMIN"],
    },
    {
      label: "Audit Trail",
      href: "/audit-trail",
      icon: CheckSquare,
      roles: ["ADMIN"],
    },
  ],
};

// GROUP 5: CONFIGURATION & AUTOMATION
export const configGroup: NavigationGroup = {
  key: "config",
  label: "Configuration & Automation",
  icon: Settings,
  description: "Paramètres, webhooks, intégrations",
  allowedRoles: ["ADMIN"],
  items: [
    {
      label: "Paramètres Organisme",
      href: "/parametres",
      icon: Settings,
      roles: ["ADMIN"],
    },
    {
      label: "Automatisations",
      href: "/automatisations",
      icon: Settings,
      roles: ["ADMIN"],
    },
    {
      label: "Intégrations",
      href: "/integrations",
      icon: Settings,
      roles: ["ADMIN"],
    },
    {
      label: "Webhooks",
      href: "/webhooks",
      icon: Settings,
      roles: ["ADMIN"],
    },
  ],
};

// GROUP 6: SITE VITRINE & COMMUNICATION
export const communicationGroup: NavigationGroup = {
  key: "communication",
  label: "Site Vitrine & Communication",
  icon: Globe,
  description: "Blog, analytics, e-mails",
  allowedRoles: ["ADMIN"],
  items: [
    {
      label: "Blog",
      href: "/blog",
      icon: Globe,
      roles: ["ADMIN"],
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: Globe,
      roles: ["ADMIN"],
    },
    {
      label: "Campagnes Email",
      href: "/campagnes-email",
      icon: Globe,
      roles: ["ADMIN"],
    },
    {
      label: "SMS & Notifications",
      href: "/notifications",
      icon: Globe,
      roles: ["ADMIN"],
    },
  ],
};

/**
 * All groups in order
 */
export const navigationGroups: NavigationGroup[] = [
  formationsGroup,
  candidatsGroup,
  financeGroup,
  qualiteGroup,
  configGroup,
  communicationGroup,
];

/**
 * Get visible groups for a user
 */
export function getVisibleGroups(
  role: Role,
  permissions: string[] = [],
  features: string[] = [],
): NavigationGroup[] {
  return navigationGroups.filter((group) => {
    // Check if user role is allowed
    if (!group.allowedRoles.includes(role)) {
      return false;
    }

    // Check if feature is gated
    if (
      group.featureGate &&
      features.length > 0 &&
      !features.includes(group.featureGate)
    ) {
      return false;
    }

    // Filter items within group (by role, permission, feature)
    group.items = group.items.filter((item) => {
      if (!item.roles.includes(role)) return false;
      if (item.feature && features.length > 0 && !features.includes(item.feature)) {
        return false;
      }
      return true;
    });

    // Only show group if it has items
    return group.items.length > 0;
  });
}
