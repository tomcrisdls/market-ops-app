import { useState } from 'react'
import { KIOSKS } from '../../../lib/constants'
import { fmtDate, fmtMoney, calcTotals, findKiosk, findProduct } from '../../../lib/utils'
import { DistributionSheet } from '../components/DistributionSheet'
import { Icon } from '../../../components/icons/Icons'

const DIST_FILTERS = ['all', 'needs invoice', 'internal', 'invoiced']

const PILL_COLORS = {
  'needs invoice': { bg: '#f97316', text: '#fff' },
  'internal':      { bg: '#6b7280', text: '#fff' },
  'invoiced':      { bg: '#16a34a', text: '#fff' },
}

export function DistributionTab({ distributions, orders, inventory, onNewDistribution, onGenerateInvoice, onInvoiceAll, onEdit, onDelete, onDistributeAll, pendingTodayOrders }) {
  const [activePrintId, setActivePrintId] = useState(null)
  const [printAllOpen,  setPrintAllOpen]  = useState(false)
  const [filter,        setFilter]        = useState('all')
  const [expanded,      setExpanded]      = useState({})

  // ── Clean popup print — no app chrome ──────────────────
  const handlePrintSheet = (dists) => {
    const list = [...(Array.isArray(dists) ? dists : [dists])].sort((a, b) => a.kioskId.localeCompare(b.kioskId))
    const date = list[0]?.date
    const fmt = (s) => { if (!s) return ''; const [y,m,d] = s.split('-'); return `${m}/${d}/${y}` }

    // Grab logo URL from the already-rendered preview img
    const logoSrc = document.querySelector('[id^="dist-sheet"] img')?.src ?? ''

    const sections = list.map((dist, si) => {
      const kiosk = findKiosk(dist.kioskId, KIOSKS)
      const label = kiosk ? `${kiosk.id.replace(/^K0?/, 'K')} · ${kiosk.name}` : dist.kioskId
      const rows = dist.items.map((item, i) => {
        const product = findProduct(item.productId)
        return `<tr style="background:${i%2===0?'#f9f9f9':'#fff'};height:36px">
          <td style="padding:6px 12px;font-weight:500">${product?.invName ?? item.productId}</td>
          <td style="padding:6px 12px;text-align:center;font-weight:700;font-size:15px">${item.qty}</td>
          <td style="padding:6px 12px;text-align:center"><div style="width:22px;height:22px;border:2px solid #ccc;border-radius:4px;margin:0 auto"></div></td>
        </tr>`
      }).join('')
      const divider = si > 0 ? '<div style="border-top:1px solid #e5e7eb;margin:16px 0"></div>' : ''
      const notes = dist.notes ? `<div style="margin-top:8px;padding:6px 10px;background:#f9f9f9;border-radius:6px;font-size:12px"><strong>Notes:</strong> ${dist.notes}</div>` : ''
      return `${divider}
        <div style="margin-bottom:20px">
          <div style="font-size:16px;font-weight:700;margin-bottom:10px">${label}</div>
          <table style="width:100%;border-collapse:collapse">
            <colgroup><col style="width:58%"><col style="width:18%"><col style="width:24%"></colgroup>
            <thead><tr style="background:#1d1d1f">
              <th style="padding:7px 12px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#fff;text-align:left">Product</th>
              <th style="padding:7px 12px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#fff;text-align:center">Cases</th>
              <th style="padding:7px 12px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#fff;text-align:center">✓ Delivered</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${notes}
        </div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Distribution Sheet — ${fmt(date)}</title>
<style>
  @page { size: letter; margin: .5in .65in; }
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif; font-size:12px; color:#1d1d1f; background:#fff; }
</style></head><body>
<div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:20px">
  <img src="${logoSrc}" alt="Time Out Market" style="height:60px;width:auto;object-fit:contain">
  <div>
    <div style="font-size:22px;font-weight:200;color:#c8c8cc;letter-spacing:5px;text-transform:uppercase;line-height:1;margin-bottom:8px">Distribution Sheet</div>
    <table style="font-size:11px;border-collapse:collapse">
      <tr><td style="padding:3px 16px 3px 0;color:#666">Date</td><td>${fmt(date)}</td></tr>
      ${list.length > 1 ? `<tr><td style="padding:3px 16px 3px 0;color:#666">Kitchens</td><td>${list.length}</td></tr>` : ''}
    </table>
  </div>
</div>
<div style="border-top:2px solid #e5e7eb;margin-bottom:16px"></div>
${sections}
<div style="display:flex;justify-content:space-between;margin-top:36px">
  <div><div style="margin-bottom:40px;border-bottom:1px solid #ccc;width:160px"></div><div style="font-size:11px;color:#444">Staff Signature</div></div>
  <div><div style="margin-bottom:40px;border-bottom:1px solid #ccc;width:160px"></div><div style="font-size:11px;color:#444">Confirmed By</div></div>
</div>
<script>window.onload=function(){window.print();window.close();}</script>
</body></html>`

    const win = window.open('', '_blank', 'width=820,height=1060')
    win.document.write(html)
    win.document.close()
  }

  const isExpanded   = (id) => expanded[id] === true
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !isExpanded(id) }))

  const classify = (d) => {
    if (d.status === 'invoiced') return 'invoiced'
    if (findKiosk(d.kioskId, KIOSKS)?.noInvoice) return 'internal'
    return 'needs invoice'
  }

  const counts = {
    all:             distributions.length,
    'needs invoice': distributions.filter(d => classify(d) === 'needs invoice').length,
    'internal':      distributions.filter(d => classify(d) === 'internal').length,
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
        <div className="segmented-control">
          {DIST_FILTERS.map(f => {
            const count  = counts[f]
            const active = filter === f
            return (
              <button key={f} className={`pill${active ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 && f !== 'all' && (
                  <span style={{
                    marginLeft: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: active ? 0.7 : 0.5,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pendingTodayOrders?.length > 0 && distributions.length > 0 && (
            <button className="btn btn-secondary" onClick={onDistributeAll} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="bolt" size={13} />
              Distribute All Today ({pendingTodayOrders.length})
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => onNewDistribution(null)}>
            + Manual Entry
          </button>
        </div>
      </div>

      {distributions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap"><Icon name="truck" size={36} /></div>
          {pendingTodayOrders?.length > 0 ? (
            <>
              <p style={{ marginBottom: 4 }}>
                {pendingTodayOrders.length} order{pendingTodayOrders.length !== 1 ? 's are' : ' is'} pending distribution today
              </p>
              <p style={{ fontSize: 13, color: 'var(--sub-light)', marginBottom: 16 }}>
                Go to Orders to distribute individually, or distribute all at once.
              </p>
              <button className="btn btn-primary" onClick={onDistributeAll}>
                Distribute All Today ({pendingTodayOrders.length}) →
              </button>
            </>
          ) : (
            <p>No distributions for this day</p>
          )}
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
                  <button className="btn btn-sm btn-primary" onClick={() => handlePrintSheet(distributions)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
                          {isInvoiced ? 'invoiced' : noInvoice ? 'internal' : 'pending invoice'}
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
                    <span>{dist.items.length} item{dist.items.length !== 1 ? 's' : ''}</span>
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

                  {needsInvoice && (
                    <button className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 13 }}
                      onClick={() => onGenerateInvoice(dist.id)}>
                      Generate invoice →
                    </button>
                  )}
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
                    <button className="btn btn-sm btn-primary" onClick={() => handlePrintSheet([dist])} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
