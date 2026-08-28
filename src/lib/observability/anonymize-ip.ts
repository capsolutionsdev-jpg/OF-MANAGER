/**
 * Anonymise une adresse IP pour la journalisation (RGPD) :
 * - IPv4 → dernier octet mis à zéro (/24), ex. 192.168.1.42 → 192.168.1.0
 * - IPv6 → conserve les 3 premiers groupes (~/48), ex. 2001:41d0:301:abcd:… → 2001:41d0:301::
 * - valeur absente / non reconnue → "unknown"
 *
 * Objectif : conserver une granularité suffisante pour l'analyse anti-fraude
 * (réseau/opérateur) sans journaliser l'IP complète (donnée personnelle).
 */
export function anonymizeIp(ip: string | null | undefined): string {
  if (!ip) return "unknown";
  const value = ip.trim();
  if (!value) return "unknown";

  const v4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0`;

  if (value.includes(":")) {
    const groups = value.split(":").filter((g) => g.length > 0);
    if (groups.length === 0) return "unknown";
    return groups.slice(0, 3).join(":") + "::";
  }

  return "unknown";
}
