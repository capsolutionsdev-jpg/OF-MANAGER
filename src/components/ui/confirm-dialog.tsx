"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────
//  Fenêtre de confirmation façon macOS, réutilisable partout.
//  Remplace les `confirm()` natifs : API impérative promise-based.
//
//    const confirm = useConfirm();
//    if (!(await confirm({ title: "Supprimer ?", destructive: true }))) return;
//
//  Le fournisseur est monté une fois dans le layout de l'app.
// ─────────────────────────────────────────────────────────────

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Action destructive → bouton de confirmation en rouge. */
  destructive?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm() doit être utilisé à l'intérieur de <ConfirmProvider>.");
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = React.useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={opts !== null}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
      >
        {opts && (
          <DialogContent showCloseButton={false} className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{opts.title}</DialogTitle>
              {opts.description ? (
                <DialogDescription>{opts.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => settle(false)}>
                {opts.cancelLabel ?? "Annuler"}
              </Button>
              <Button
                variant={opts.destructive ? "destructive" : "default"}
                onClick={() => settle(true)}
                autoFocus
              >
                {opts.confirmLabel ?? "Confirmer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}
