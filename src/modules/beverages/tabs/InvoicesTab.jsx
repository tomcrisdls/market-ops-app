import { useState } from 'react'
import { KIOSKS } from '../../../lib/constants'
import { fmtDate, fmtMoney, findKiosk } from '../../../lib/utils'
import { InvoicePreview } from '../components/InvoicePreview'

export function InvoicesTab({ invoices, onGenerateInvoice, onMarkSent, onDelete, onGoToDistribution }) {
  const [activePreviewId, setActivePreviewId] = useState(null)
  const [copiedId,        setCopiedId]        = useState(null)

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

  const handleView = (id) => {
    setActivePreviewId(prev => prev === id ? null : id)
    // Scroll to preview after a tick
    setTimeout(() => {
      document.getElementById('invoice-print-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <div className="screen">
      <div className="actions-bar">
        <span />
        <button className="btn btn-primary" onClick={() => onGenerateInvoice(null)}>
          + Generate Invoice
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 52, marginBottom: 14 }}>🧾</div>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No invoices for this day</p>
          <p style={{ fontSize: 12, marginBottom: 16 }}>Generate an invoice from a completed distribution</p>
          {onGoToDistribution && (
            <button className="btn btn-secondary" onClick={onGoToDistribution}>
              → Go to Distribution
            </button>
          )}
        </div>
      ) : (
        invoices.map(inv => {
          const kiosk      = findKiosk(inv.kioskId, KIOSKS)
          const kioskLabel = kiosk
            ? `${kiosk.id.replace(/^K0?/, 'K')} · ${kiosk.name}`
            : inv.kioskId
          return (
            <div className="card" key={inv.id}>
              <div className="item-card-header">
                <div>
                  <div className="item-card-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                      <strong>{kioskLabel}</strong>
                      <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                    </div>
                    <span className="item-card-amount" style={{ color: 'var(--red)' }}>{fmtMoney(inv.total)}</span>
                  </div>
                  <div className="item-card-meta">
                    {inv.invoiceCode} · {fmtDate(inv.date)}
                  </div>
                </div>
              </div>

              <div className="row-actions">
                <button
                  className={`btn btn-sm ${activePreviewId === inv.id ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => handleView(inv.id)}
                >
                  {activePreviewId === inv.id ? 'Hide Invoice' : 'View / Print'}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => copyInvoice(inv)}
                  title="Copy invoice as text"
                >
                  {copiedId === inv.id ? '✓ Copied!' : '📋 Copy'}
                </button>
                {inv.status === 'draft' && (
                  <button className="btn btn-sm btn-success" onClick={() => onMarkSent(inv.id)}>
                    ✓ Mark Sent
                  </button>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => {
                  onDelete(inv.id)
                  if (activePreviewId === inv.id) setActivePreviewId(null)
                }}>
                  Delete
                </button>
              </div>
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
              <button className="btn btn-sm btn-ghost" onClick={() => setActivePreviewId(null)}>
                Close
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => copyInvoice(activeInvoice)}
              >
                {copiedId === activeInvoice?.id ? '✓ Copied!' : '📋 Copy'}
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
                🖨 Print
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
