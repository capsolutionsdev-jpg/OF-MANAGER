"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Loader2 } from "lucide-react";
import { importLeadsCsv, type ImportResult } from "@/lib/actions/growth-actions";
import { Button } from "@/components/ui/button";

/**
 * Import CSV de leads (console growth). En-tête attendu : au minimum `email`,
 * colonnes optionnelles nom / organisme / telephone / message.
 */
export function LeadsImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("file", file);
          start(async () => {
            setResult(await importLeadsCsv(fd));
            if (inputRef.current) inputRef.current.value = "";
          });
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        title="CSV avec en-tête : email (obligatoire), nom, organisme, telephone, message"
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Importer un CSV
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.ok
            ? `${result.crees ?? 0} créé${(result.crees ?? 0) > 1 ? "s" : ""} · ${result.ignores ?? 0} ignoré${(result.ignores ?? 0) > 1 ? "s" : ""}`
            : result.error}
        </span>
      )}
    </div>
  );
}
