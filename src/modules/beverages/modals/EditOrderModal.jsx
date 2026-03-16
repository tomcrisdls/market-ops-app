import { useState, useEffect } from 'react'
import { PRODUCTS } from '../../../lib/constants'
import { today, fmtDate, findProduct } from '../../../lib/utils'

export function EditOrderModal({ isOpen, onClose, order, inventory, onSave }) {
  const [notes, setNotes] = useState('')
  const [date,  setDate]  = useState('')
  const [qtys,  setQtys]  = useState(() => Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!order) return
    const q = Object.fromEntries(PRODUCTS.map(p => [p.id, 0]))
    order.items.forEach(item => { q[item.productId] = item.qty })
    setQtys(q)
    setNotes(order.notes || '')
    setDate(order.date || today())
  }, [order])

  if (!isOpen || !order) return null

  const setQty = (id, val) => setQtys(prev => ({ ...prev, [id]: Math.max(0, val) }))

  const handleSave = () => {
    const items = PRODUCTS
      .filter(p => (qtys[p.id] || 0) > 0)
      .map(p => ({ productId: p.id, qty: parseInt(qtys[p.id]) }))
    if (items.length === 0) { setError('Select at least one item.'); return }
    setError(null)
    onSave(order.id, items, notes, date)
    onClose()
  }

  const selectedCount = PRODUCTS.filter(p => (qtys[p.id] || 0) > 0).length
  const isFutureDate  = date > today()

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Edit Order</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Date field */}
        <div className="form-group">
          <label className="form-label">Delivery Date</label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          {isFutureDate && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>📅</span> Scheduled for <strong>{fmtDate(date)}</strong>
            </div>
          )}
        </div>

        {/* Items header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="card-title" style={{ margin: 0 }}>Items</div>
          {selectedCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {PRODUCTS.map(p => {
            const stock = inventory[p.id]?.qty ?? 0
            const qty   = qtys[p.id] || 0
            const active = qty > 0
            const outOfStock = stock === 0

            return (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8,
                  border: `1px solid ${active ? '#3b82f6' : 'var(--border)'}`,
                  background: active ? '#eff6ff' : 'var(--surface)',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, marginTop: 2, color: outOfStock ? '#dc2626' : 'var(--sub)', fontWeight: outOfStock ? 600 : 400 }}>
                    {outOfStock ? '⚠ out of stock' : `${stock} in cage`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setQty(p.id, qty - 1)} disabled={qty === 0}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 18, cursor: qty === 0 ? 'default' : 'pointer', color: qty === 0 ? 'var(--sub)' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: 16, color: active ? '#2563eb' : 'var(--sub)' }}>{qty}</span>
                  <button onClick={() => setQty(p.id, qty + 1)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 18, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} placeholder="Urgent, special notes..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {error && (
          <div className="alert alert-warn" style={{ marginBottom: 12 }}>{error}</div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Changes{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
