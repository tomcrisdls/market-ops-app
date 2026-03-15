import { useState } from 'react'
import { KIOSKS } from '../../../lib/constants'
import { fmtDate, fmtMoney, calcTotals, findKiosk, findProduct } from '../../../lib/utils'
import { DistributionSheet } from '../components/DistributionSheet'
import { Icon } from '../../../components/icons/Icons'

const DIST_FILTERS = ['all', 'needs invoice', 'no invoice', 'invoiced']

const PILL_COLORS = {
  'needs invoice': { bg: '#f97316', text: '#fff' },
  'no invoice':    { bg: '#6b7280', text: '#fff' },
  'invoiced':      { bg: '#16a34a', text: '#fff' },
}

export function DistributionTab({ distributions, orders, inventory, onNewDistribution, onGenerateInvoice, onInvoiceAll, onEdit, onDelete, onDistributeAll, pendingTodayOrders }) {
  const [activePrintId, setActivePrintId] = useState(null)
  const [printAllOpen,  setPrintAllOpen]  = useState(false)
  const [filter,        setFilter]        = useState('all')
  const [expanded,      setExpanded]      = useState({})

  const isExpanded   = (id) => expanded[id] !== false
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !isExpanded(id) }))

  const classify = (d) => {
    if (d.status === 'invoiced') return 'invoiced'
    if (findKiosk(d.kioskId, KIOSKS)?.noInvoice) return 'no invoice'
    return 'needs invoice'
  }

  const counts = {
    all:             distributions.length,
    'needs invoice': distributions.filter(d => classify(d) === 'needs invoice').length,
    'no invoice':    distributions.filter(d => classify(d) === 'no invoice').length,
    invoiced:        distributions.filter(d => classify(d) === 'invoiced').length,
  }

  const filtered = filter === 'all' ? distributions : distributions.filter(d => classify(d) === filter)
  const sorted = [...filtered].sort((a, b) => {
    const rank = (d) => classify(d) === 'needs invoice' ? 0 : classify(d) === 'no invoice' ? 1 : 2
    return rank(a) - rank(b)
  })

  const invoicedCount      = counts.invoiced
  const invoiceableCount   = counts['needs invoice'] + counts.invoiced
  const dayTotal           = distributions.reduce((sum, d) => sum + calcTotals(d.items, inventory).total, 0)
  const pendingInvoiceCount = counts['needs invoice']

  return (
    <div className="screen">
      {/* Actions bar */}
      <div className="actions-bar">
        <div className="filter-pills">
          {DIST_FILTERS.map(f => {
            const count  = counts[f]
            const color  = PILL_COLORS[f]
            const active = filter === f
            return (
              <button key={f} className={`pill${active ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 && color && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginLeft: 5, minWidth: 18, height: 18, borderRadius: 9,
                    fontSize: 11, fontWeight: 700, lineHeight: 1, padding: '0 5px',
                    background: active ? 'rgba(255,255,255,0.25)' : color.bg,
                    color:      active ? '#fff' : color.text,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pendingTodayOrders?.length > 0 && (
            <button className="btn btn-secondary" onClick={onDistributeAll} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="bolt" size={13} />
              Distribute All Today ({pendingTodayOrders.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => onNewDistribution(null)}>
            + New Distribution
          </button>
        </div>
      </div>

      {distributions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap"><Icon name="truck" size={36} /></div>
          <p>No distributions for this day</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNewDistribution(null)}>
            + New Distribution
          </button>
        </div>
      ) : (
        <>
          {/* Day summary */}
          <div className="dist-summary-bar" style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '10px 0 14px', fontSize: 13, color: 'var(--sub)',
            flexWrap: 'wrap', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span>{distributions.length} kitchen{distributions.length !== 1 ? 's' : ''}</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtMoney(dayTotal)}</span>
              <span style={{ fontWeight: 500, color: invoicedCount === invoiceableCount ? '#16a34a' : '#d97706' }}>
                {invoicedCount} of {invoiceableCount} invoiced
              </span>
            </div>
            <div className="dist-summary-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pendingInvoiceCount > 0 && (
                <button className="btn btn-sm btn-success" onClick={onInvoiceAll} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="bolt" size={12} />
                  Invoice All ({pendingInvoiceCount})
                </button>
              )}
              {distributions.length > 1 && (
                <button
                  className={`btn btn-sm mobile-print-hidden ${printAllOpen ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setPrintAllOpen(p => !p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Icon name="printer" size={13} />
                  {printAllOpen ? 'Hide All' : `Print All (${distributions.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Combined print sheet for all kitchens */}
          {printAllOpen && (
            <div style={{ marginBottom: 16 }} id="dist-sheet-all">
              <div className="inv-preview-controls">
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  All Kitchens — {distributions[0]?.date ? fmtDate(distributions[0].date) : ''}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setPrintAllOpen(false)}>Close</button>
                  <button className="btn btn-sm btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="printer" size={13} /> Print
                  </button>
                </div>
              </div>
              <div id="invoice-print-area">
                <DistributionSheet distributions={distributions} />
              </div>
            </div>
          )}

          {/* Distribution cards — 2-column grid */}
          <div className="card-grid">
            {sorted.map(dist => {
              const kiosk        = findKiosk(dist.kioskId, KIOSKS)
              const totals       = calcTotals(dist.items, inventory)
              const isInvoiced   = dist.status === 'invoiced'
              const noInvoice    = kiosk?.noInvoice
              const needsInvoice = !isInvoiced && !noInvoice
              const isPrinting   = activePrintId === dist.id
              const linkedOrder  = dist.orderId ? orders?.find(o => o.id === dist.orderId) : null
              const borderColor  = isInvoiced   ? '#16a34a'
                                 : needsInvoice ? '#f97316'
                                 : 'var(--border)'
              const kioskLabel   = kiosk
                ? `${kiosk.id.replace(/^K0?/, 'K')} · ${kiosk.name}`
                : dist.kioskId

              return (
                <div className="card" key={dist.id} style={{ borderLeft: `3px solid ${borderColor}` }}>
                  {/* Header row */}
                  <div className="item-card-header">
                    <div className="item-card-name">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                        <strong>{kioskLabel}</strong>
                        <span className={`badge badge-${isInvoiced ? 'invoiced' : 'distributed'}`}>
                          {isInvoiced ? 'invoiced' : noInvoice ? 'no invoice' : 'pending invoice'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span className="item-card-amount">{fmtMoney(totals.total)}</span>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {needsInvoice && (
                            <button className="btn-icon success" title="Generate Invoice" onClick={() => onGenerateInvoice(dist.id)}>
                              <Icon name="receipt" size={14} />
                            </button>
                          )}
                          {!isInvoiced && (
                            <button className="btn-icon primary" title="Edit" onClick={() => onEdit(dist.id)}>
                              <Icon name="pencil" size={14} />
                            </button>
                          )}
                          <button
                            className={`btn-icon mobile-print-hidden${isPrinting ? ' primary' : ''}`}
                            title="Print Sheet"
                            onClick={() => {
                              const opening = activePrintId !== dist.id
                              setActivePrintId(opening ? dist.id : null)
                              if (opening) setTimeout(() => document.getElementById(`dist-sheet-${dist.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
                            }}
                          >
                            <Icon name="printer" size={14} />
                          </button>
                          <button className="btn-icon danger" title="Delete" onClick={() => {
                            onDelete(dist.id)
                            if (activePrintId === dist.id) setActivePrintId(null)
                          }}>
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    {linkedOrder && (
                      <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2 }}>
                        from order · {fmtDate(linkedOrder.date)}{linkedOrder.notes ? ` · ${linkedOrder.notes}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Items toggle */}
                  <button className="card-items-toggle" onClick={() => toggleExpand(dist.id)}>
                    <span>{dist.items.length} item{dist.items.length !== 1 ? 's' : ''} · {fmtMoney(totals.subtotal)}</span>
                    <span className="toggle-chevron">{isExpanded(dist.id) ? '▲' : '▼'}</span>
                  </button>

                  {/* Item rows */}
                  {isExpanded(dist.id) && (
                    <div style={{ margin: '6px 0 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {dist.items.map(item => {
                        const product  = findProduct(item.productId)
                        const unitCost = inventory[item.productId]?.price ?? product?.defaultPrice ?? 0
                        const lineAmt  = unitCost * item.qty
                        return (
                          <div key={item.productId} style={{
                            display: 'grid', gridTemplateColumns: '32px 1fr auto',
                            alignItems: 'center', columnGap: 8,
                            fontSize: 13, color: 'var(--sub)', padding: '1px 0',
                          }}>
                            <span style={{ color: 'var(--text)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>×{item.qty}</span>
                            <span>{product?.name ?? item.productId}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: 'var(--sub)' }}>
                              {unitCost > 0 ? fmtMoney(lineAmt) : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {dist.notes && <div className="item-card-notes">{dist.notes}</div>}
                </div>
              )
            })}
          </div>

          {/* Print sheets — rendered outside grid so they span full width */}
          {sorted.map(dist => {
            if (activePrintId !== dist.id) return null
            const kiosk      = findKiosk(dist.kioskId, KIOSKS)
            const kioskLabel = kiosk ? `${kiosk.id.replace(/^K0?/, 'K')} · ${kiosk.name}` : dist.kioskId
            return (
              <div key={`sheet-${dist.id}`} style={{ marginTop: 8, marginBottom: 16 }} id={`dist-sheet-${dist.id}`}>
                <div className="inv-preview-controls">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{kioskLabel} — {fmtDate(dist.date)}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setActivePrintId(null)}>Close</button>
                    <button className="btn btn-sm btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon name="printer" size={13} /> Print
                    </button>
                  </div>
                </div>
                <div id="invoice-print-area">
                  <DistributionSheet distribution={dist} />
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
