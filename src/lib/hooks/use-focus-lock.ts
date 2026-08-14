/**
 * Phase 2.4 — Focus Management Hooks
 *
 * Gestion du focus pour :
 * - Modales (focus trap)
 * - Menu dropdowns
 * - Dialogs
 * - Combobox
 */

import { useEffect, useRef } from "react";

/**
 * useFocusLock — Piège le focus dans un élément
 *
 * Utilisation : modales, dialogs
 * - Tab/Shift+Tab restent dans l'élément
 * - Esc ferme
 * - Focus revient au trigger on unmount
 */
export function useFocusLock(
  containerRef: React.RefObject<HTMLElement>,
  {
    onEscapePress,
    initialFocus,
  }: {
    onEscapePress?: () => void;
    initialFocus?: HTMLElement | null;
  } = {}
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Sauvegarder le focus actuel
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Mettre le focus sur l'élément initial ou le premier focusable
    const firstFocusable =
      initialFocus || container.querySelector("button, input, a, select, textarea");
    if (firstFocusable instanceof HTMLElement) {
      firstFocusable.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Échap ferme
      if (e.key === "Escape") {
        onEscapePress?.();
        return;
      }

      // Tab trap
      if (e.key === "Tab") {
        const focusableElements = container.querySelectorAll(
          "button, input, a, select, textarea"
        );
        const focusableArray = Array.from(focusableElements);
        const currentIndex = focusableArray.indexOf(document.activeElement as Element);
        const lastIndex = focusableArray.length - 1;

        if (e.shiftKey) {
          // Shift+Tab au premier élément = aller au dernier
          if (currentIndex === 0) {
            e.preventDefault();
            (focusableArray[lastIndex] as HTMLElement).focus();
          }
        } else {
          // Tab au dernier élément = aller au premier
          if (currentIndex === lastIndex) {
            e.preventDefault();
            (focusableArray[0] as HTMLElement).focus();
          }
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);

      // Retourner le focus au trigger original
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [containerRef, onEscapePress, initialFocus]);
}

/**
 * useFocusVisible — Afficher un outline visible au focus clavier
 *
 * Utilisation : sur les éléments interactifs
 */
export function useFocusVisible() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si l'utilisateur appuie sur Tab, ajouter la classe focus-visible
      if (e.key === "Tab") {
        document.body.classList.add("using-keyboard");
      }
    };

    const handleMouseDown = () => {
      // Si l'utilisateur clique, retirer la classe
      document.body.classList.remove("using-keyboard");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);
}

/**
 * useRestoreFocus — Restaurer le focus après une action
 *
 * Utilisation : après fermeture modal, sélection d'option, etc.
 */
export function useRestoreFocus(trigger: HTMLElement | null) {
  const savedFocusRef = useRef<HTMLElement | null>(null);

  const save = () => {
    savedFocusRef.current = trigger || (document.activeElement as HTMLElement);
  };

  const restore = () => {
    if (savedFocusRef.current) {
      savedFocusRef.current.focus();
    }
  };

  return { save, restore };
}
