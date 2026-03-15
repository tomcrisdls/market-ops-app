import { useState } from 'react'
import { KIOSKS, MONTHS, PRODUCTS } from '../../../lib/constants'
import { fmtMoney, fmtDate, getPhase, findKiosk } from '../../../lib/utils'

const PHASES = ['All Phases', 'Phase 1', 'Phase 2']
const VIEWS  = ['Billing', 'Consumption', 'Reorder']

// ── Week helpers ──────────────────────────────────────────────────────────────

function toYMD(d) {
  return d.toISOString().slice(0, 10)
}

function getWeekRanges(n) {
  const now = new Date()
  const dow = now.getDay() // 0=Sun … 6=Sat
  // Monday of current week
  const currentMon = new Date(now)
  currentMon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  currentMon.setHours(0, 0, 0, 0)

  const ranges = []
  for (let i = n - 1; i >= 0; i--) {
    const mon = new Date(currentMon)
    mon.setDate(currentMon.getDate() - i * 7)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)

    const start = toYMD(mon)
    const end   = toYMD(sun)
    const label = i === 0 ? 'This Wk' : fmtWeekLabel(mon, sun)
    ranges.push({ label, start, end })
  }
  return ranges
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtWeekLabel(mon, sun) {
  const m1 = MONTH_ABBR[mon.getMonth()]
  const m2 = MONTH_ABBR[sun.getMonth()]
  return m1 === m2
    ? `${m1} ${mon.getDate()}–${sun.getDate()}`
    : `${m1} ${mon.getDate()}–${m2} ${sun.getDate()}`
}

function sumWeek(distributions, productId, start, end) {
  return distributions
    .filter(d => d.date >= start && d.date <= end)
    .flatMap(d => d.items)
    .filter(i => i.productId === productId)
    .reduce((s, i) => s + i.qty, 0)
}

// ── Consumption view ──────────────────────────────────────────────────────────

// Trend arrow comparing latest week vs prior 3-week avg
function trendArrow(counts) {
  const thisWk   = counts[counts.length - 1]
  const priorAvg = counts.slice(0, -1).reduce((s, c) => s + c, 0) / (counts.length - 1)
  if (priorAvg === 0 && thisWk === 0) return null
  if (thisWk > priorAvg * 1.1)  return { symbol: '↑', color: '#16a34a' }
  if (thisWk < priorAvg * 0.9)  return { symbol: '↓', color: '#dc2626' }
  return { symbol: '→', color: 'var(--sub)' }
}

// Heat shade for a cell — higher count relative to row max = warmer tint
function heatBg(count, rowMax) {
  if (count === 0 || rowMax === 0) return undefined
  const intensity = count / rowMax          // 0–1
  const alpha     = 0.06 + intensity * 0.18 // 0.06–0.24
  return `rgba(220, 38, 38, ${alpha})`
}

function ConsumptionView({ distributions }) {
  const weeks = getWeekRanges(4)

  const rows = PRODUCTS.map(p => {
    const counts = weeks.map(w => sumWeek(distributions, p.id, w.start, w.end))
    const total  = counts.reduce((s, c) => s + c, 0)
    const avg    = total / weeks.length
    return { product: p, counts, avg }
  }).filter(r => r.counts.some(c => c > 0))

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📊</div>
        <p>No distribution data yet</p>
      </div>
    )
  }

  // Weekly totals across all products — for bar chart
  const weekTotals = weeks.map((w, wi) =>
    rows.reduce((s, r) => s + r.counts[wi], 0)
  )
  const barMax = Math.max(...weekTotals, 1)

  return (
    <>
      {/* ── Table ── */}
      <div className="card">
        <div className="card-title">Cases Distributed — Last 4 Weeks</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              {weeks.map(w => <th key={w.start} style={{ textAlign: 'center' }}>{w.label}</th>)}
              <th style={{ textAlign: 'center' }}>4-Wk Avg</th>
              <th style={{ textAlign: 'center' }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product: p, counts, avg }) => {
              const rowMax = Math.max(...counts, 1)
              const trend  = trendArrow(counts)
              return (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  {counts.map((c, i) => (
                    <td key={i} style={{
                      textAlign:       'center',
                      color:           c === 0 ? 'var(--sub)' : 'inherit',
                      backgroundColor: heatBg(c, rowMax),
                      transition:      'background-color 0.2s',
                    }}>
                      {c === 0 ? '—' : c}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {avg % 1 === 0 ? avg : avg.toFixed(1)}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: trend?.color ?? 'var(--sub)' }}>
                    {trend ? trend.symbol : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Weekly Total Bar Chart ── */}
      <div className="card">
        <div className="card-title">Weekly Volume — All Products</div>
        <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 16 }}>
          Total cases distributed across all kitchens
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, padding: '0 8px' }}>
          {weeks.map((w, i) => {
            const val    = weekTotals[i]
            const pct    = val / barMax
            const barH   = Math.max(pct * 120, val > 0 ? 4 : 0)
            const isLast = i === weeks.length - 1
            return (
              <div key={w.start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: val === 0 ? 'var(--sub)' : 'var(--text)', minHeight: 18 }}>
                  {val > 0 ? val : ''}
                </span>
                <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width:           '100%',
                    height:          barH,
                    borderRadius:    '4px 4px 0 0',
                    backgroundColor: isLast ? '#dc2626' : 'var(--border)',
                    transition:      'height 0.3s ease',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: isLast ? '#dc2626' : 'var(--sub)', fontWeight: isLast ? 600 : 400, textAlign: 'center' }}>
                  {w.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Reorder view ──────────────────────────────────────────────────────────────

function ReorderView({ distributions, inventory }) {
  const weeks = getWeekRanges(4)

  const rows = PRODUCTS.map(p => {
    const counts     = weeks.map(w => sumWeek(distributions, p.id, w.start, w.end))
    const avg        = counts.reduce((s, c) => s + c, 0) / weeks.length
    const currentQty = inventory[p.id]?.qty ?? 0
    const suggested  = Math.max(0, Math.ceil(avg * 2) - currentQty)
    const needsOrder = currentQty < avg
    return { product: p, avg, currentQty, suggested, needsOrder }
  })

  return (
    <div className="card">
      <div className="card-title">Suggested Reorder — Based on 4-Week Average</div>
      <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 12 }}>
        Target: 2 weeks of stock on hand after delivery
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Vendor</th>
            <th style={{ textAlign: 'center' }}>In Cage</th>
            <th style={{ textAlign: 'center' }}>Avg / Wk</th>
            <th style={{ textAlign: 'center' }}>Suggested Order</th>
            <th style={{ textAlign: 'center' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ product: p, avg, currentQty, suggested, needsOrder }) => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong></td>
              <td style={{ color: 'var(--sub)' }}>{p.vendor}</td>
              <td style={{ textAlign: 'center' }}>{currentQty}</td>
              <td style={{ textAlign: 'center', color: 'var(--sub)' }}>
                {avg === 0 ? '—' : (avg % 1 === 0 ? avg : avg.toFixed(1))}
              </td>
              <td style={{ textAlign: 'center', fontWeight: suggested > 0 ? 600 : 'normal' }}>
                {suggested === 0 ? '—' : suggested}
              </td>
              <td style={{ textAlign: 'center' }}>
                {avg === 0 ? (
                  <span style={{ color: 'var(--sub)', fontSize: 12 }}>No data</span>
                ) : needsOrder ? (
                  <span className="badge badge-reorder-order">⚠ Order</span>
                ) : (
                  <span className="badge badge-reorder-ok">✓ OK</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Billing view (existing) ───────────────────────────────────────────────────

function BillingView({ invoices }) {
  const now = new Date()
  const [month,   setMonth]   = useState(now.getMonth())
  const [year,    setYear]    = useState(now.getFullYear())
  const [phase,   setPhase]   = useState('All Phases')
  const [kitchen, setKitchen] = useState('All Kitchens')

  // Invoices matching period + phase
  const periodFiltered = invoices.filter(inv => {
    const [y, m] = inv.date.split('-')
    const matchPeriod = parseInt(y) === year && parseInt(m) - 1 === month
    const matchPhase  = phase === 'All Phases' || inv.phase === phase
    return matchPeriod && matchPhase
  })

  // Kitchens that actually have invoices in this period
  const activeKioskIds = [...new Set(periodFiltered.map(inv => inv.kioskId))]
  const activeKiosks   = KIOSKS.filter(k => activeKioskIds.includes(k.id))

  // Reset kitchen filter if selected kitchen has no invoices in new period
  const resolvedKitchen = activeKioskIds.includes(
    KIOSKS.find(k => k.name === kitchen)?.id
  ) ? kitchen : 'All Kitchens'

  const filtered = periodFiltered.filter(inv =>
    resolvedKitchen === 'All Kitchens' ||
    inv.kioskId === KIOSKS.find(k => k.name === resolvedKitchen)?.id
  )

  const byKiosk = {}
  filtered.forEach(inv => {
    if (!byKiosk[inv.kioskId]) byKiosk[inv.kioskId] = []
    byKiosk[inv.kioskId].push(inv)
  })

  return (
    <>
      <div className="card">
        <div className="card-title">Filter Billing Period</div>
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Year</label>
            <input
              type="number"
              className="form-input"
              value={year}
              onChange={e => setYear(parseInt(e.target.value) || now.getFullYear())}
            />
          </div>
        </div>
        <div className="filter-pills" style={{ marginBottom: 10 }}>
          {PHASES.map(p => (
            <button
              key={p}
              className={`pill${phase === p ? ' active' : ''}`}
              onClick={() => setPhase(p)}
            >
              {p === 'Phase 1' ? 'Phase 1 — Days 1–15' :
               p === 'Phase 2' ? 'Phase 2 — Days 16–end' : p}
            </button>
          ))}
        </div>
        {activeKiosks.length > 0 && (
          <div className="filter-pills">
            <button
              className={`pill${resolvedKitchen === 'All Kitchens' ? ' active' : ''}`}
              onClick={() => setKitchen('All Kitchens')}
            >
              All Kitchens
            </button>
            {activeKiosks.map(k => (
              <button
                key={k.id}
                className={`pill${resolvedKitchen === k.name ? ' active' : ''}`}
                onClick={() => setKitchen(k.name)}
              >
                {k.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📊</div>
          <p>No invoices for {MONTHS[month]} {year}{phase !== 'All Phases' ? ' · ' + phase : ''}</p>
        </div>
      ) : (
        Object.entries(byKiosk).map(([kioskId, kioskInvoices]) => {
          const kiosk     = findKiosk(kioskId, KIOSKS)
          const kioskName = kiosk ? kiosk.name : kioskId

          let waterAmt = 0, sodaAmt = 0, bagsAmt = 0
          kioskInvoices.forEach(inv => {
            inv.items.forEach(item => {
              if (item.trackerCategory === 'water') waterAmt += item.amount
              else if (item.trackerCategory === 'soda') sodaAmt += item.amount
              else if (item.trackerCategory === 'bags') bagsAmt += item.amount
            })
          })
          const grandTotal = kioskInvoices.reduce((s, inv) => s + inv.total, 0)

          return (
            <div className="tracker-section" key={kioskId}>
              <div className="tracker-header">
                <div className="tracker-label">{kioskName}</div>
                <span style={{ fontSize: 13, color: 'var(--sub)' }}>
                  {kioskInvoices.length} invoice{kioskInvoices.length !== 1 ? 's' : ''}
                </span>
              </div>
              <table className="tracker-table" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Phase</th>
                    <th style={{ textAlign: 'right' }}>Water</th>
                    <th style={{ textAlign: 'right' }}>Soda</th>
                    <th style={{ textAlign: 'right' }}>Bags</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {kioskInvoices.map(inv => {
                    let w = 0, s = 0, b = 0
                    inv.items.forEach(item => {
                      if (item.trackerCategory === 'water') w += item.amount
                      else if (item.trackerCategory === 'soda') s += item.amount
                      else if (item.trackerCategory === 'bags') b += item.amount
                    })
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 500 }}>{inv.invoiceCode}</td>
                        <td>{fmtDate(inv.date)}</td>
                        <td style={{ color: 'var(--sub)' }}>{inv.phase}</td>
                        <td style={{ textAlign: 'right' }}>{w > 0 ? fmtMoney(w) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{s > 0 ? fmtMoney(s) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{b > 0 ? fmtMoney(b) : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(inv.total)}</td>
                      </tr>
                    )
                  })}
                  <tr className="total-row">
                    <td colSpan={3} style={{ fontWeight: 700 }}>Totals</td>
                    <td style={{ textAlign: 'right' }}>{waterAmt > 0 ? fmtMoney(waterAmt) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{sodaAmt  > 0 ? fmtMoney(sodaAmt)  : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{bagsAmt  > 0 ? fmtMoney(bagsAmt)  : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })
      )}
    </>
  )
}

// ── Main TrackerTab ───────────────────────────────────────────────────────────

export function TrackerTab({ invoices, inventory, distributions }) {
  const [view, setView] = useState('Billing')

  return (
    <div className="screen">
      <div className="filter-pills" style={{ marginBottom: 16 }}>
        {VIEWS.map(v => (
          <button
            key={v}
            className={`pill${view === v ? ' active' : ''}`}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'Billing'     && <BillingView invoices={invoices} />}
      {view === 'Consumption' && <ConsumptionView distributions={distributions} />}
      {view === 'Reorder'     && <ReorderView distributions={distributions} inventory={inventory} />}
    </div>
  )
}
