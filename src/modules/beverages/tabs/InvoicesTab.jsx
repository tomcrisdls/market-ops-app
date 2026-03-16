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
              <button className="btn btn-sm btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
