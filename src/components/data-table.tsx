"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export type ColumnDef<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  render: (row: T, index: number) => React.ReactNode;
  width?: string;
};

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onSort?: (column: string, direction: SortDirection) => void;
  onSelectionChange?: (rows: T[]) => void;
  enableBulkActions?: boolean;
  enableExport?: boolean;
  pageSize?: number;
}

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  onSort,
  onSelectionChange,
  enableBulkActions = true,
  enableExport = true,
  pageSize = 25,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDir(sortDir === "asc" ? "desc" : null);
      if (sortDir === "desc") setSortColumn(null);
    } else {
      setSortColumn(columnId);
      setSortDir("asc");
    }
    onSort?.(columnId, sortDir === "asc" ? "desc" : null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(data.map((_, i) => String(i))));
      onSelectionChange?.(data);
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    const key = String(index);
    if (checked) {
      newSelection.add(key);
    } else {
      newSelection.delete(key);
    }
    setSelectedRows(newSelection);
    const selected = data.filter((_, i) => newSelection.has(String(i)));
    onSelectionChange?.(selected);
  };

  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);

  return (
    <div className="space-y-4">
      {/* Bulk actions toolbar */}
      {enableBulkActions && selectedRows.size > 0 && (
        <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
          <span className="text-sm font-medium">
            {selectedRows.size} ligne(s) sélectionnée(s)
          </span>
          <button
            onClick={() => {
              setSelectedRows(new Set());
              onSelectionChange?.([]);
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Effacer
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b sticky top-0 z-10">
            <tr>
              {enableBulkActions && (
                <th className="sticky left-0 bg-muted z-20 w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Sélectionner tout"
                    className="cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "px-4 py-3 text-left text-sm font-medium",
                    col.sortable && "cursor-pointer hover:bg-muted-dark transition-colors"
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.id)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.header}</span>
                    {col.sortable !== false && sortColumn === col.id && (
                      <>
                        {sortDir === "asc" && <ChevronUp className="h-4 w-4" />}
                        {sortDir === "desc" && <ChevronDown className="h-4 w-4" />}
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, i) => {
                const realIndex = currentPage * pageSize + i;
                const isSelected = selectedRows.has(String(realIndex));
                return (
                  <tr
                    key={realIndex}
                    className={cn(
                      "border-t transition-colors",
                      isSelected ? "bg-primary/10" : "hover:bg-muted"
                    )}
                  >
                    {enableBulkActions && (
                      <td className="sticky left-0 bg-background z-10 w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(realIndex, e.target.checked)}
                          aria-label={`Sélectionner ligne ${realIndex + 1}`}
                          className="cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.id} className="px-4 py-3 text-sm">
                        {col.render(row, realIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (enableBulkActions ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Aucune donnée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {data.length > 0
            ? `${currentPage * pageSize + 1}-${Math.min((currentPage + 1) * pageSize, data.length)} sur ${data.length}`
            : "0 résultats"}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ← Précédent
          </button>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1 || data.length === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  );
}
