import { useState } from 'react'
import { KIOSKS, PRODUCTS } from '../../../lib/constants'
import { today } from '../../../lib/utils'

export function OrderModal({ isOpen, onClose, inventory, onSave }) {
  const [kioskId, setKioskId] = useState(KIOSKS[0].id)
  const [date,    setDate]    = useState(today())
  const [notes,   setNotes]   = useState('')
  const [qtys,    setQtys]    = useState(() => Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))

  if (!isOpen) return null

  const setQty = (id, val) => setQtys(prev => ({ ...prev, [id]: Math.max(0, val) }))

  const handleSave = () => {
    const items = PRODUCTS
      .filter(p => (qtys[p.id] || 0) > 0)
      .map(p => ({ productId: p.id, qty: parseInt(qtys[p.id]) }))

    if (!kioskId || !date || items.length === 0) {
      alert('Select kitchen, date, and at least one item.')
      return
    }
    onSave(kioskId, date, items, notes)
    setQtys(Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))
    setNotes('')
    onClose()
  }

  const selectedCount = PRODUCTS.filter(p => (qtys[p.id] || 0) > 0).length

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">New Kitchen Order</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Kitchen + Date on one row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label className="form-label">Kitchen</label>
            <select className="form-select" value={kioskId} onChange={e => setKioskId(e.target.value)}>
              {KIOSKS.map(k => (
                <option key={k.id} value={k.id}>{k.id.replace(/^K0?/, 'K')} · {k.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
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

        {/* Product rows with steppers */}
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
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'space-between',
                  padding:         '10px 12px',
                  borderRadius:    8,
                  border:          `1px solid ${active ? '#3b82f6' : 'var(--border)'}`,
                  background:      active ? '#eff6ff' : 'var(--surface)',
                  transition:      'all 0.15s',
                }}
              >
                {/* Left: name + stock */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, marginTop: 2, color: outOfStock ? '#dc2626' : 'var(--sub)', fontWeight: outOfStock ? 600 : 400 }}>
                    {outOfStock ? '⚠ out of stock' : `${stock} in cage`}
                  </div>
                </div>

                {/* Right: stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setQty(p.id, qty - 1)}
                    disabled={qty === 0}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      fontSize: 18, cursor: qty === 0 ? 'default' : 'pointer',
                      color: qty === 0 ? 'var(--sub)' : 'var(--text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >−</button>
                  <span style={{
                    width: 28, textAlign: 'center',
                    fontWeight: 700, fontSize: 16,
                    color: active ? '#2563eb' : 'var(--sub)',
                  }}>{qty}</span>
                  <button
                    onClick={() => setQty(p.id, qty + 1)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      fontSize: 18, cursor: 'pointer', color: 'var(--text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >+</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Urgent, special notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Order{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
