/**
 * Template du groupe (app) : remonté à CHAQUE navigation (contrairement au
 * layout) → rejoue l'animation d'entrée de page (fondu + glissement) sur
 * toutes les pages de l'application. CSS pur (cf. .page-enter, globals.css),
 * désactivé si prefers-reduced-motion.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
