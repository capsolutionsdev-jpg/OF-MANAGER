# Phase 3.3 — Dashboard & KPI Refactor

**Status :** ⏳ NOT STARTED
**Effort :** 25-30h
**Depends On :** Lot 2.2 (components), 3.2 (tables)
**Impact :** First impression +50%, engagement +35%

---

## 📋 Overview

Refactoriser dashboard → **animé, responsive, data-driven** (KPI cards, charts, heatmaps).

### Current → Target
```
BEFORE (Static boxes)
├─ Gray boxes with numbers
├─ No animation
├─ Mobile: unreadable (no responsive)
└─ No interactivity

AFTER (Modern Dashboard)
├─ Color-coded KPI cards (trend ↑↓)
├─ Animated counters (Recharts)
├─ Interactive charts (hover details)
├─ Responsive grid (auto-adjust columns)
├─ Dark mode support
└─ Export as PDF/PNG
```

---

## 🎨 Dashboard Sections

### 1. Top KPIs (Row 1)
```
┌────────────┬────────────┬────────────┬────────────┐
│  Revenue   │  Leads     │ Conversion │ Avg Deal   │
│  €45.2k    │   324      │   12.5%    │  €3.2k     │
│  ↑ 8% MoM  │  ↑ 15%    │  ↑ 2%     │  ↓ -5%    │
└────────────┴────────────┴────────────┴────────────┘
```

### 2. Charts (Row 2)
```
┌──────────────────────────────────────────────────┐
│ Revenue Trend (6m)          │ Lead Sources (pie)  │
│ [Line chart]                │ [Pie chart]         │
└──────────────────────────────────────────────────┘
```

### 3. Tables (Row 3)
```
┌──────────────────────────────────────────────────┐
│ Top Formations (by lead count)                   │
│ [DataTable with sorting + export]                │
└──────────────────────────────────────────────────┘
```

---

## 🏗️ Component Architecture

```typescript
// components/dashboard/
├─ KpiCard.tsx (stat card with trend)
├─ RevenueChart.tsx (line chart Recharts)
├─ ConversionFunnel.tsx (bar chart)
├─ LeadSourcePie.tsx (pie chart)
├─ TopFormationsTable.tsx (DataTable)
└─ Dashboard.tsx (layout orchestrator)

export function Dashboard() {
  const [period, setPeriod] = useState('1m')
  const stats = useStats(period)
  const chartData = useChartData(period)
  
  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        <button onClick={() => setPeriod('1m')}>1M</button>
        <button onClick={() => setPeriod('3m')}>3M</button>
        <button onClick={() => setPeriod('1y')}>1Y</button>
        <button onClick={() => setPeriod('all')}>All</button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <KpiCard key={stat.id} {...stat} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={chartData.revenue} />
        <LeadSourcePie data={chartData.sources} />
      </div>
      
      {/* Table */}
      <TopFormationsTable data={chartData.topFormations} />
    </div>
  )
}
```

---

## ✅ Checklist

- [ ] KPI cards with trend indicators (↑↓)
- [ ] Animated counters (CountUp)
- [ ] Line charts (Recharts)
- [ ] Pie charts (Recharts)
- [ ] Period selector (1m, 3m, 1y, all)
- [ ] Responsive grid (auto-adjust columns)
- [ ] Dark mode support
- [ ] Mobile optimized (single column)
- [ ] Tooltip on hover (chart details)
- [ ] Export as PDF/PNG
- [ ] Accessibility (WCAG 2.1 AA)

---

**Next:** Phase 3.4 (Critical Flows) + Phase 3.5 (Mobile Polish)
