/**
 * Phase 2.4 — Skip Links
 *
 * Navigation clavier : Cmd+Shift+1 pour sauter au contenu principal
 * WCAG 2.4.1 (Bypass Blocks)
 */

export function SkipLinks() {
  return (
    <>
      {/* Skip to main content - visible on focus */}
      <a
        href="#main-content"
        className={`
          fixed top-0 left-0 z-50
          bg-primary text-primary-foreground
          px-4 py-2 rounded-br-lg
          -translate-y-full focus:translate-y-0
          transition-transform duration-200
          font-medium text-sm
        `}
      >
        Aller au contenu principal
      </a>

      {/* Skip to navigation - visible on focus */}
      <a
        href="#main-nav"
        className={`
          fixed top-0 left-0 z-50
          bg-primary text-primary-foreground
          px-4 py-2 rounded-br-lg
          -translate-y-full focus:translate-y-0
          transition-transform duration-200
          font-medium text-sm
          top-12
        `}
      >
        Aller à la navigation
      </a>

      {/* Skip to search - visible on focus */}
      <a
        href="#main-search"
        className={`
          fixed top-0 left-0 z-50
          bg-primary text-primary-foreground
          px-4 py-2 rounded-br-lg
          -translate-y-full focus:translate-y-0
          transition-transform duration-200
          font-medium text-sm
          top-24
        `}
      >
        Aller à la recherche
      </a>

      {/* Keyboard shortcut hint */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('keydown', function(e) {
              // Cmd+Shift+1 ou Ctrl+Shift+1 = skip to main
              if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '1') {
                e.preventDefault();
                const main = document.getElementById('main-content');
                if (main) main.focus();
              }
              // Cmd+Shift+2 = skip to nav
              if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '2') {
                e.preventDefault();
                const nav = document.getElementById('main-nav');
                if (nav) nav.focus();
              }
              // Cmd+Shift+3 = skip to search
              if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '3') {
                e.preventDefault();
                const search = document.getElementById('main-search');
                if (search) search.focus();
              }
            });
          `,
        }}
      />
    </>
  );
}
