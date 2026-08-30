// Sérialise un objet JSON-LD pour insertion SÛRE dans
// <script type="application/ld+json" dangerouslySetInnerHTML=...>.
// Audit SEC-026 / F-27 : `JSON.stringify` n'échappe pas `<`/`>`/`&`, donc un
// `</script>` (ou du HTML) présent dans un contenu dynamique (titre, terme, FAQ)
// casserait le contexte script → XSS réfléchi. On neutralise ces caractères.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
