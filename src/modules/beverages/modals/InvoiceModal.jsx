import { useState, useEffect } from 'react'
import { KIOSKS, PRODUCTS } from '../../../lib/constants'
import { fmtDate, fmtMoney, getPhase, invCode, calcTotals, findKiosk, findProduct } from '../../../lib/utils'
import { uid } from '../../../lib/utils'

export function InvoiceModal({ isOpen, onClose, distributions, inventory, preDistId, onSave }) {
  const [selectedDistId, setSelectedDistId] = useState('')

  // Distributions not yet invoiced, excluding Bar (noInvoice)
  const available = distributions.filter(d => {
    if (d.status === 'invoiced') return false
    const k = findKiosk(d.kioskId, KIOSKS)
    return !k?.noInvoice
  })

  useEffect(() => {
    if (!isOpen) return
    setSelectedDistId(preDistId || '')
  }, [isOpen, preDistId])

  if (!isOpen) return null

  const selectedDist = available.find(d => d.id === selectedDistId) || null
  const kiosk  = selectedDist ? findKiosk(selectedDist.kioskId, KIOSKS) : null
  const totals = selectedDist ? calcTotals(selectedDist.items, inventory) : null
  const code   = selectedDist && kiosk ? invCode(kiosk.code, selectedDist.date) : null

  const handleSave = () => {
    if (!selectedDist) { alert('Select a distribution.'); return }

    // Build invoice items with prices locked at current inventory price
    const items = selectedDist.items.map(item => {
      const product = findProduct(item.productId)
      const price   = inventory[item.productId]?.price ?? product?.defaultPrice ?? 0
      return {
        productId:       item.productId,
        name:            product?.name     ?? item.productId,
        invName:         product?.invName  ?? item.productId,
        qty:             item.qty,
        price,
        amount:          item.qty * price,
        trackerCategory: product?.trackerCategory ?? '',
        hasDeposit:      product?.hasDeposit ?? false,
      }
    })

    const invoice = {
      id:             uid(),
      distributionId: selectedDist.id,
      orderId:        selectedDist.orderId || null,
      kioskId:        selectedDist.kioskId,
      date:           selectedDist.date,
      invoiceCode:    code,
      phase:          getPhase(selectedDist.date),
      items,
      subtotal:       totals.subtotal,
      deposit:        totals.deposit,
      tax:            totals.tax,
      total:          totals.total,
      status:         'draft',
      createdAt:      new Date().toISOString(),
    }

    onSave(invoice, selectedDist)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Generate Invoice</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label className="form-label">From Distribution</label>
          <select
            className="form-select"
            value={selectedDistId}
            onChange={e => setSelectedDistId(e.target.value)}
          >
            <option value="">— Select distribution —</option>
            {available.map(d => {
              const k = findKiosk(d.kioskId, KIOSKS)
              return (
                <option key={d.id} value={d.id}>
                  {k ? k.name : d.kioskId} — {fmtDate(d.date)} ({getPhase(d.date)})
                </option>
              )
            })}
          </select>
        </div>

        {/* Preview calculation */}
        {selectedDist && totals && (
          <div className="inv-calc-box">
            <div className="inv-calc-row">
              <span>Billed To</span>
              <strong>{kiosk?.fullName ?? kiosk?.name}</strong>
            </div>
            <div className="inv-calc-row" style={{ marginBottom: 12 }}>
              <span>Invoice #</span>
              <strong>{code}</strong>
            </div>

            {selectedDist.items.map(item => {
              const product = findProduct(item.productId)
              const price   = inventory[item.productId]?.price ?? product?.defaultPrice ?? 0
              return (
                <div className="inv-calc-row" key={item.productId}>
                  <span>{product?.name ?? item.productId} × {item.qty}</span>
                  <span>{fmtMoney(item.qty * price)}</span>
                </div>
              )
            })}

            <div className="inv-calc-divider" />
            <div className="inv-calc-row">
              <span>Subtotal</span>
              <span>{fmtMoney(totals.subtotal)}</span>
            </div>
            {totals.deposit > 0 && (
              <div className="inv-calc-row">
                <span>Bottle Deposit</span>
                <span>{fmtMoney(totals.deposit)}</span>
              </div>
            )}
            <div className="inv-calc-row" style={{ marginBottom: 8 }}>
              <span>Tax (8.875%)</span>
              <span>{fmtMoney(totals.tax)}</span>
            </div>
            <div className="inv-calc-total">
              <span>TOTAL</span>
              <span>{fmtMoney(totals.total)}</span>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Generate Invoice</button>
        </div>
      </div>
    </div>
  )
}
