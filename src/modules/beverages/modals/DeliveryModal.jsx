import { useState } from 'react'
import { PRODUCTS, VENDORS } from '../../../lib/constants'
import { today } from '../../../lib/utils'

export function DeliveryModal({ isOpen, onClose, onSave }) {
  const [date,   setDate]   = useState(today())
  const [vendor, setVendor] = useState(VENDORS[0])
  const [qtys,   setQtys]   = useState(() => Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))

  if (!isOpen) return null

  const setQty = (id, val) => setQtys(prev => ({ ...prev, [id]: Math.max(0, val) }))

  const handleSave = () => {
    const items = PRODUCTS
      .filter(p => (qtys[p.id] || 0) > 0)
      .map(p => ({ productId: p.id, qty: parseInt(qtys[p.id]) }))
    if (items.length === 0) { alert('Enter at least one item.'); return }
    onSave(date, vendor, items)
    setQtys(Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))
    onClose()
  }

  const selectedCount = PRODUCTS.filter(p => (qtys[p.id] || 0) > 0).length

  // Filter to products from selected vendor (show all, but dim others)
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Log Delivery</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Date + Vendor */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Vendor</label>
            <select className="form-select" value={vendor} onChange={e => setVendor(e.target.value)}>
              {VENDORS.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Items header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="card-title" style={{ margin: 0 }}>Cases Received</div>
          {selectedCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} logged
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {PRODUCTS.map(p => {
            const qty    = qtys[p.id] || 0
            const active = qty > 0
            const fromThisVendor = p.vendor === vendor

            return (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8,
                  border: `1px solid ${active ? '#3b82f6' : 'var(--border)'}`,
                  background: active ? '#eff6ff' : 'var(--surface)',
                  opacity: fromThisVendor ? 1 : 0.5,
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--sub)' }}>{p.vendor}</div>
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

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Add to Inventory{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
