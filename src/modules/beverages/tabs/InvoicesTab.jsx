import { useState } from 'react'
import { KIOSKS } from '../../../lib/constants'
import { fmtDate, fmtMoney, findKiosk } from '../../../lib/utils'
import { InvoicePreview } from '../components/InvoicePreview'
import { Icon } from '../../../components/icons/Icons'

export function InvoicesTab({ invoices, onGenerateInvoice, onMarkSent, onDelete, onGoToDistribution }) {
  const [activePreviewId, setActivePreviewId] = useState(null)
  const [copiedId,        setCopiedId]        = useState(null)
  const [expanded,        setExpanded]        = useState({})

  const isExpanded   = (id) => expanded[id] === true
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !isExpanded(id) }))

  const copyInvoice = (inv) => {
    const kiosk = findKiosk(inv.kioskId, KIOSKS)
    const lines = [
      `INVOICE #${inv.invoiceCode}`,
      `Date: ${fmtDate(inv.date)}`,
      `Billed To: ${kiosk?.fullName ?? kiosk?.name ?? inv.kioskId}`,
      '',
      ...inv.items.map(i => `${i.name} × ${i.qty}   ${fmtMoney(i.amount)}`),
      '',
      `Subtotal   ${fmtMoney(inv.subtotal)}`,
      inv.deposit > 0 ? `Bottle Deposit   ${fmtMoney(inv.deposit)}` : null,
      `Tax (8.875%)   ${fmtMoney(inv.tax)}`,
      `TOTAL   ${fmtMoney(inv.total)}`,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(lines).then(() => {
      setCopiedId(inv.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const activeInvoice = invoices.find(inv => inv.id === activePreviewId) || null

  const handlePrint = () => {
    const inv = activeInvoice
    if (!inv) return
    const kiosk = findKiosk(inv.kioskId, KIOSKS)
    const kioskName = kiosk ? (kiosk.fullName ?? kiosk.name) : inv.kioskId
    // Grab the already-resolved logo URL from the rendered img element
    const logoSrc = document.getElementById('invoice-print-area')?.querySelector('img')?.src ?? ''

    const rows = inv.items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#f5f5f5' : '#fff'}">
        <td style="padding:8px 12px">${item.invName}</td>
        <td style="padding:8px 12px;text-align:center">${item.qty}</td>
        <td style="padding:8px 12px;text-align:center">${fmtMoney(item.price)}</td>
        <td style="padding:8px 12px;text-align:right">${fmtMoney(item.amount)}</td>
      </tr>`).join('')

    const depositRow = inv.deposit > 0
      ? `<tr><td style="padding:5px 10px;color:#555;font-size:10px;text-transform:uppercase;letter-spacing:.5px">Bottle Deposit ($1.20/case)</td><td style="padding:5px 10px;text-align:right">${fmtMoney(inv.deposit)}</td></tr>`
      : ''

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Invoice ${inv.invoiceCode}</title>
<style>
  @page { size: letter; margin: .5in .65in; }
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif; font-size:11px; color:#1d1d1f; background:#fff; }
  .hdr { display:flex; gap:20px; align-items:flex-start; margin-bottom:12px; }
  .hdr img { width:72px; height:72px; object-fit:contain; display:block; }
  .rhs { flex:1; display:flex; flex-direction:column; align-items:flex-end; }
  .inv-title { font-size:26px; font-weight:200; color:#c8c8cc; letter-spacing:5px; text-transform:uppercase; line-height:1; margin-bottom:10px; }
  .meta { font-size:11px; border-collapse:collapse; }
  .meta td { padding:3px 0; }
  .meta td:first-child { padding-right:20px; color:#666; min-width:72px; }
  .addr { font-size:11px; color:#666; margin-bottom:16px; line-height:1.6; }
  table.items { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:0; }
  table.items thead tr { background:#1d1d1f; }
  table.items th { padding:7px 12px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.6px; color:#fff; text-align:left; }
  table.items th.c { text-align:center; } table.items th.r { text-align:right; }
  table.items td.c { text-align:center; } table.items td.r { text-align:right; }
  .bot { display:flex; justify-content:space-between; align-items:flex-end; margin-top:16px; }
  .sig { font-size:11px; color:#444; }
  .totals { border-collapse:collapse; font-size:11px; min-width:240px; }
  .totals td { padding:5px 10px; }
  .totals td.r { text-align:right; }
  .lbl { color:#555; text-transform:uppercase; font-size:10px; letter-spacing:.5px; }
  .ttl { background:#f0f0f0; font-weight:700; font-size:12px; border-top:1px solid #ccc; }
  .ttl td { padding:8px 10px; }
</style>
</head><body>
<div class="hdr">
  <img src="${logoSrc}" alt="Time Out Market">
  <div class="rhs">
    <div class="inv-title">INVOICE</div>
    <table class="meta"><tbody>
      <tr><td>Date:</td><td>${fmtDate(inv.date)}</td></tr>
      <tr><td>Invoice #:</td><td>${inv.invoiceCode}</td></tr>
      <tr><td>For:</td><td>Beverage Delivery</td></tr>
      <tr><td colspan="2" style="padding:3px 0"></td></tr>
      <tr><td>Bill To:</td><td>${kioskName}</td></tr>
    </tbody></table>
  </div>
</div>
<div class="addr">124 East 14th Street<br>New York, NY 10003<br>Phone: (917) 810-4855</div>
<table class="items">
  <thead><tr><th>Description</th><th class="c">Cases</th><th class="c">Price</th><th class="r">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="bot">
  <div class="sig">Authorized Signature:______________________________</div>
  <table class="totals"><tbody>
    <tr><td class="lbl">Subtotal</td><td class="r">${fmtMoney(inv.subtotal)}</td></tr>
    ${depositRow}
    <tr><td class="lbl">Tax (8.875%)</td><td class="r">${fmtMoney(inv.tax)}</td></tr>
    <tr class="ttl"><td>Total Due</td><td class="r">${fmtMoney(inv.total)}</td></tr>
  </tbody></table>
</div>
<script>window.onload=function(){window.print();window.close();}</script>
</body></html>`

    const win = window.open('', '_blank', 'width=820,height=1060')
    win.document.write(html)
    win.document.close()
  }

  const handleView = (id) => {
    setActivePreviewId(prev => prev === id ? null : id)
    setTimeout(() => {
      document.getElementById('invoice-print-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <div className="screen">
      <div className="actions-bar">
        <div style={{ fontSize: 13, color: 'var(--sub)', fontWeight: 500 }}>
          {invoices.length > 0 ? `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}` : ''}
        </div>
        <button className="btn btn-primary" onClick={() => onGenerateInvoice(null)}>
          + Generate Invoice
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap"><Icon name="receipt" size={36} /></div>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No invoices for this day</p>
          <p style={{ fontSize: 12, color: 'var(--sub-light)', marginBottom: 16 }}>
            Distributions must be recorded first, then you can generate invoices here
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => onGenerateInvoice(null)}>
              + Generate Invoice
            </button>
            {onGoToDistribution && (
              <button className="btn btn-ghost" onClick={onGoToDistribution}>
                View Distributions
              </button>
            )}
          </div>
        </div>
      ) : (
        invoices.map(inv => {
          const kiosk       = findKiosk(inv.kioskId, KIOSKS)
          const kioskLabel  = kiosk ? `${kiosk.id.replace(/^K0?/, 'K')} · ${kiosk.name}` : inv.kioskId
          const borderColor = inv.status === 'sent'  ? '#16a34a'
                            : inv.status === 'draft' ? '#d97706'
                            : 'var(--border)'
          return (
            <div className="card" key={inv.id} style={{ borderLeft: `3px solid ${borderColor}` }}>
              <div className="item-card-header">
                <div className="item-card-name">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                    <strong>{kioskLabel}</strong>
                    <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span className="item-card-amount" style={{ color: 'var(--red)' }}>{fmtMoney(inv.total)}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button
                        className={`btn-icon${copiedId === inv.id ? ' success' : ''}`}
                        title="Copy invoice text"
                        onClick={() => copyInvoice(inv)}
                      >
                        <Icon name={copiedId === inv.id ? 'check' : 'clipboard'} size={14} />
                      </button>
                      <button
                        className={`btn-icon${activePreviewId === inv.id ? ' primary' : ''}`}
                        title={activePreviewId === inv.id ? 'Hide Invoice' : 'View / Print'}
                        onClick={() => handleView(inv.id)}
                      >
                        <Icon name="eye" size={14} />
                      </button>
                      <button className="btn-icon danger" title="Delete" onClick={() => {
                        onDelete(inv.id)
                        if (activePreviewId === inv.id) setActivePreviewId(null)
                      }}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="item-card-meta" style={{ marginTop: 3 }}>
                  {inv.invoiceCode} · {fmtDate(inv.date)}
                </div>
              </div>

              <button className="card-items-toggle" onClick={() => toggleExpand(inv.id)}>
                <span>{inv.items.length} item{inv.items.length !== 1 ? 's' : ''}</span>
                <span className="toggle-chevron">{isExpanded(inv.id) ? '▲' : '▼'}</span>
              </button>

              {isExpanded(inv.id) && (
                <div style={{ margin: '6px 0 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {inv.items.map(item => (
                    <div key={item.productId} style={{
                      display: 'grid', gridTemplateColumns: '32px 1fr auto',
                      alignItems: 'center', columnGap: 8,
                      fontSize: 13, color: 'var(--sub)', padding: '1px 0',
                    }}>
                      <span style={{ color: 'var(--text)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>×{item.qty}</span>
                      <span>{item.name}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{fmtMoney(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {inv.status === 'draft' && (
                <button className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 13 }}
                  onClick={() => onMarkSent(inv.id)}>
                  Mark as sent →
                </button>
              )}
            </div>
          )
        })
      )}

      {/* Invoice print preview */}
      {activeInvoice && (
        <div style={{ marginTop: 24 }}>
          <div className="inv-preview-controls">
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Invoice {activeInvoice.invoiceCode}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setActivePreviewId(null)}>Close</button>
              <button className="btn btn-sm btn-ghost" onClick={() => copyInvoice(activeInvoice)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {copiedId === activeInvoice?.id
                  ? <><Icon name="check" size={13} /> Copied!</>
                  : <><Icon name="clipboard" size={13} /> Copy</>
                }
              </button>
              <button className="btn btn-sm btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="printer" size={13} /> Print
              </button>
            </div>
          </div>
          <div id="invoice-print-area">
            <InvoicePreview invoice={activeInvoice} />
          </div>
        </div>
      )}
    </div>
  )
}
