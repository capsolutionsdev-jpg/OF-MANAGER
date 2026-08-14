# Phase 3.2 — Tables : Tri + Sticky Headers + Bulk Actions

**Status :** ⏳ NOT STARTED
**Effort :** 35-40h
**Depends On :** Lot 2.2 (components), 2.3 (navigation)
**Impact :** +20% productivité staff, −35% task duration

---

## 📋 Overview

Transformer les tables OF Manager de **statiques** → **puissantes** (tri, sticky, bulk actions, export).

### Target Features
```
BEFORE (Current)
├─ Fixed column widths
├─ No sorting
├─ No filtering
├─ Horizontal scroll mobile
├─ Single-row actions only
└─ No bulk operations

AFTER (Target)
├─ Sortable columns (click header)
├─ Sticky header + sticky left column
├─ Multi-select + checkbox column
├─ Bulk actions (delete, assign, export)
├─ Export to CSV/Excel/PDF
├─ Responsive (collapse columns mobile)
├─ Search + filter (in table)
└─ Pagination (25/50/100 rows)
```

---

## 🏗️ Architecture

### DataTable Component
```typescript
// components/data-table.tsx
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onSelectionChange?: (rows: T[]) => void
  onSort?: (sortBy: string, direction: 'asc' | 'desc') => void
  enableBulkActions?: boolean
  enableExport?: boolean
  exportFormats?: ('csv' | 'excel' | 'pdf')[]
}

export function DataTable<T>({
  data,
  columns,
  onSelectionChange,
  onSort,
  enableBulkActions = true,
  enableExport = true,
  exportFormats = ['csv', 'excel'],
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>([])
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [pageSize, setPageSize] = useState(25)
  const [pageIndex, setPageIndex] = useState(0)
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(data.map((row, i) => i.toString())))
    } else {
      setSelectedRows(new Set())
    }
  }
  
  const handleSelectRow = (rowIndex: number, checked: boolean) => {
    const newSelection = new Set(selectedRows)
    if (checked) {
      newSelection.add(rowIndex.toString())
    } else {
      newSelection.delete(rowIndex.toString())
    }
    setSelectedRows(newSelection)
    onSelectionChange?.(Array.from(newSelection).map(i => data[parseInt(i)]))
  }
  
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
    onSort?.(column, sortDir === 'asc' ? 'desc' : 'asc')
  }
  
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {enableBulkActions && selectedRows.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedRows.size}
          totalCount={data.length}
          actions={getBulkActions()}
        />
      )}
      
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              {enableBulkActions && (
                <th className="sticky left-0 bg-muted p-3 z-20">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="p-3 text-left cursor-pointer hover:bg-muted-dark transition-colors"
                  onClick={() => col.sortable !== false && handleSort(col.id)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <SortIcon
                        isSorted={sortBy === col.id}
                        direction={sortDir}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize).map((row, i) => (
              <tr
                key={i}
                className="border-t hover:bg-muted transition-colors"
                aria-selected={selectedRows.has(i.toString())}
              >
                {enableBulkActions && (
                  <td className="sticky left-0 bg-white p-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(i.toString())}
                      onChange={(e) => handleSelectRow(i, e.target.checked)}
                      aria-label={`Select row ${i + 1}`}
                    />
                  </td>
                )}
                
                {columns.map((col) => (
                  <td key={col.id} className="p-3">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Affichage {pageIndex * pageSize + 1} à {Math.min((pageIndex + 1) * pageSize, data.length)} sur {data.length}
        </div>
        
        <div className="flex gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value))
              setPageIndex(0)
            }}
            className="px-3 py-1 border rounded"
          >
            <option value={25}>25 par page</option>
            <option value={50}>50 par page</option>
            <option value={100}>100 par page</option>
          </select>
          
          <button
            disabled={pageIndex === 0}
            onClick={() => setPageIndex(pageIndex - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ← Précédent
          </button>
          
          <button
            disabled={(pageIndex + 1) * pageSize >= data.length}
            onClick={() => setPageIndex(pageIndex + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Usage — Sessions Table
```typescript
export function SessionsTable() {
  const [sessions, setSessions] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  
  const columns: ColumnDef<Session>[] = [
    {
      id: 'name',
      header: 'Formation',
      sortable: true,
      render: (row) => <a href={`/sessions/${row.id}`}>{row.name}</a>,
    },
    {
      id: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => new Date(row.startDate).toLocaleDateString('fr-FR'),
    },
    {
      id: 'candidates',
      header: 'Candidats',
      sortable: true,
      render: (row) => `${row.candidateCount}/${row.maxCapacity}`,
    },
    {
      id: 'status',
      header: 'Statut',
      sortable: true,
      render: (row) => <Badge>{row.status}</Badge>,
    },
    {
      id: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => editSession(row.id)}>Éditer</button>
          <button onClick={() => deleteSession(row.id)}>Supprimer</button>
        </div>
      ),
    },
  ]
  
  const handleBulkDelete = async () => {
    await Promise.all(
      selectedRows.map(row => deleteSession(row.id))
    )
    setSelectedRows([])
    // Refresh data
  }
  
  const handleExport = (format: 'csv' | 'excel') => {
    exportSessions(sessions, format)
  }
  
  return (
    <DataTable
      data={sessions}
      columns={columns}
      onSelectionChange={setSelectedRows}
      enableBulkActions={true}
      enableExport={true}
      exportFormats={['csv', 'excel', 'pdf']}
    />
  )
}
```

---

## 📊 Features Detail

### 1. Sortable Headers
```typescript
// Click header = toggle sort direction
// Show ↑ / ↓ / ↕ icon based on state
// Server-side sort (if large dataset):
onSort={(column, direction) => {
  fetchSessions({ sortBy: column, order: direction })
}}
```

### 2. Sticky Header + Left Column
```css
/* Header stays visible while scrolling down */
thead {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* First column (checkbox) stays visible while scrolling right */
.checkbox-col {
  position: sticky;
  left: 0;
  z-index: 9;
}
```

### 3. Bulk Actions Toolbar
```
┌─────────────────────────────────────────────┐
│ ☑ 5 rows selected                    [Hide] │
├─────────────────────────────────────────────┤
│ [Delete] [Assign to...] [Export] [Clear]    │
└─────────────────────────────────────────────┘
```

### 4. Export Formats
```typescript
// CSV — Plain text, opens in Excel
// Excel — .xlsx with formatting (colors, fonts)
// PDF — Formatted report with header/footer
```

### 5. Responsive Design (Mobile)
```
Mobile:
├─ Hide low-priority columns (collapse)
├─ Show/Hide columns toggle menu
├─ Horizontal scroll for remaining columns
├─ Bulk actions = floating button (↗ icon)
└─ Pagination: prev/next only (no page jumper)
```

---

## ✅ Checklist

- [ ] DataTable component (generic, reusable)
- [ ] Sortable columns (click header)
- [ ] Multi-select with checkbox column
- [ ] Bulk actions toolbar
- [ ] Export (CSV, Excel, PDF)
- [ ] Sticky header + sticky left column
- [ ] Pagination (25/50/100 rows)
- [ ] Responsive (mobile column hiding)
- [ ] Keyboard nav (Tab, Shift+Tab, Arrow keys)
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Mobile-optimized (touch targets)
- [ ] Test on 3+ tables (sessions, candidats, formations)

---

## 📈 Success Metrics

| Metric | Before | Target | Impact |
|--------|--------|--------|--------|
| Avg sort time | 30s (manual) | 2s (1-click) | +93% faster |
| Bulk delete ops | Single row | 50+ rows | 20x faster |
| Mobile usability | 3/10 | 8/10 | +167% |
| Export time | Manual copy | 1-click | −99% |

---

**Next:** Phase 3.3 (Dashboard & KPI Refactor) + Phase 4.1 (WCAG Testing)
