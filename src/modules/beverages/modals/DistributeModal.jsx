import { useState, useEffect } from 'react'
import { KIOSKS, PRODUCTS } from '../../../lib/constants'
import { today, findKiosk, fmtDate } from '../../../lib/utils'

export function DistributeModal({ isOpen, onClose, inventory, orders, preOrderId, preItems, defaultDate, onSave, editDist, onUpdate }) {
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [kioskId, setKioskId]   = useState(KIOSKS[0].id)
  const [date,    setDate]       = useState(today())
  const [notes,   setNotes]      = useState('')
  const [qtys,    setQtys]       = useState(() => Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))
  const [showAll, setShowAll]    = useState(false)
  const [error,   setError]      = useState(null)

  const isRemainingMode = !!preItems

  const isEditMode = !!editDist
  const pendingOrders = orders.filter(o => o.status === 'pending')

  useEffect(() => {
    if (!isOpen) return
    setShowAll(false)
    if (editDist) {
      // Edit mode — pre-fill from existing distribution
      setKioskId(editDist.kioskId)
      setDate(editDist.date)
      setNotes(editDist.notes || '')
      setSelectedOrderId('')
      const filled = Object.fromEntries(PRODUCTS.map(p => [p.id, 0]))
      editDist.items.forEach(i => { filled[i.productId] = i.qty })
      setQtys(filled)
    } else if (preItems) {
      setDate(defaultDate ?? today())
      setNotes('')
      setSelectedOrderId('')
      setKioskId(preItems.kioskId)
      const filled = Object.fromEntries(PRODUCTS.map(p => [p.id, 0]))
      preItems.items.forEach(i => { filled[i.productId] = i.qty })
      setQtys(filled)
    } else if (preOrderId) {
      setDate(defaultDate ?? today())
      setNotes('')
      setSelectedOrderId(preOrderId)
      loadFromOrder(preOrderId)
    } else {
      setDate(defaultDate ?? today())
      setNotes('')
      setSelectedOrderId('')
      setKioskId(KIOSKS[0].id)
      setQtys(Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))
    }
  }, [isOpen, preOrderId, preItems, defaultDate, editDist])

  const loadFromOrder = (orderId) => {
    if (!orderId) {
      setQtys(Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))
      return
    }
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    setKioskId(order.kioskId)
    const newQtys = Object.fromEntries(PRODUCTS.map(p => [p.id, 0]))
    order.items.forEach(it => { newQtys[it.productId] = it.qty })
    setQtys(newQtys)
  }

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId)
    setShowAll(false)
    loadFromOrder(orderId)
  }

  const setQty = (id, val) => setQtys(prev => ({ ...prev, [id]: Math.max(0, val) }))

  const fromOrder = selectedOrderId
    ? orders.find(o => o.id === selectedOrderId) || null
    : null

  const orderedProductIds = fromOrder
    ? new Set(fromOrder.items.map(i => i.productId))
    : null

  const preItemIds = isRemainingMode ? new Set(preItems.items.map(i => i.productId)) : null

  const productsToShow = isRemainingMode
    ? PRODUCTS.filter(p => preItemIds.has(p.id))
    : fromOrder && !showAll
      ? PRODUCTS.filter(p => orderedProductIds.has(p.id))
      : PRODUCTS

  const hasInventoryWarning = PRODUCTS.some(p => {
    const q = parseInt(qtys[p.id]) || 0
    return q > (inventory[p.id]?.qty ?? 0)
  })

  const selectedCount = productsToShow.filter(p => (qtys[p.id] || 0) > 0).length

  if (!isOpen) return null

  const handleSave = () => {
    const items = PRODUCTS
      .filter(p => (parseInt(qtys[p.id]) || 0) > 0)
      .map(p => ({ productId: p.id, qty: parseInt(qtys[p.id]) }))
    if (!kioskId || !date || items.length === 0) {
      setError('Fill in kiosk, date, and at least one item.')
      return
    }
    setError(null)
    if (isEditMode) {
      onUpdate(editDist.id, editDist.items, items, notes)
    } else {
      onSave(selectedOrderId || null, kioskId, date, items, notes)
    }
    setQtys(Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))
    setNotes('')
    onClose()
  }

  const title = isEditMode ? 'Edit Distribution' : preItems ? 'Deliver Remaining' : fromOrder ? 'Confirm Distribution' : 'New Distribution'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Remaining mode: context banner */}
        {isRemainingMode && (
          <div style={{
            background: '#fff7ed', border: '1px solid #fed7aa',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 15 }}>📦</span>
            <div>
              <span style={{ fontWeight: 600, color: '#c2410c' }}>
                {findKiosk(preItems.kioskId, KIOSKS)?.name ?? preItems.kioskId}
              </span>
              <span style={{ color: '#92400e' }}> — items not yet delivered</span>
            </div>
          </div>
        )}

        {/* Order banner or selector — hidden in edit & remaining modes */}
        {!isEditMode && !isRemainingMode && fromOrder ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {findKiosk(fromOrder.kioskId, KIOSKS)?.name ?? fromOrder.kioskId}
            </div>
            <div style={{ color: 'var(--sub)' }}>
              Order from {fmtDate(fromOrder.date)}
              {fromOrder.notes ? ` · ${fromOrder.notes}` : ''}
            </div>
          </div>
        ) : !isEditMode && !isRemainingMode ? (
          <div className="form-group">
            <label className="form-label">From Order <span style={{ fontWeight: 400, color: 'var(--sub)', fontSize: 11 }}>— or leave blank for ad-hoc</span></label>
            <select className="form-select" value={selectedOrderId} onChange={e => handleOrderSelect(e.target.value)}>
              <option value="">— No linked order —</option>
              {pendingOrders.map(o => {
                const k = findKiosk(o.kioskId, KIOSKS)
                return (
                  <option key={o.id} value={o.id}>
                    {k ? `${k.id.replace(/^K0?/, 'K')} · ${k.name}` : o.kioskId} — {fmtDate(o.date)}
                  </option>
                )
              })}
            </select>
          </div>
        ) : null}

        {/* Kitchen + Date */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {!isRemainingMode && (
            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
              <label className="form-label">Kitchen</label>
              <select className="form-select" value={kioskId} onChange={e => setKioskId(e.target.value)} disabled={!!fromOrder || isEditMode}>
                {KIOSKS.map(k => (
                  <option key={k.id} value={k.id}>{k.id.replace(/^K0?/, 'K')} · {k.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group" style={{ flex: isRemainingMode ? 'unset' : 1, marginBottom: 0, width: isRemainingMode ? '100%' : undefined }}>
            <label className="form-label">Delivery Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {productsToShow.map(p => {
            const stock = inventory[p.id]?.qty ?? 0
            const qty   = qtys[p.id] || 0
            const over  = qty > stock
            const active = qty > 0 && !over

            return (
              <div
                key={p.id}
                className="modal-product-row"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8,
                  border: `1px solid ${over ? '#dc2626' : active ? '#3b82f6' : 'var(--border)'}`,
                  background: over ? '#fef2f2' : active ? '#eff6ff' : 'var(--surface)',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div className="product-row-name" style={{ fontWeight: 600, fontSize: 14, color: over ? '#dc2626' : 'var(--text)' }}>{p.name}</div>
                  <div className="product-row-sub" style={{ fontSize: 12, marginTop: 2, color: stock === 0 ? '#dc2626' : 'var(--sub)', fontWeight: stock === 0 ? 600 : 400 }}>
                    {stock === 0 ? '⚠ out of stock' : `${stock} in cage`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="stepper-btn" onClick={() => setQty(p.id, qty - 1)} disabled={qty === 0}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 18, cursor: qty === 0 ? 'default' : 'pointer', color: qty === 0 ? 'var(--sub)' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span className="stepper-qty" style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: 16, color: over ? '#dc2626' : active ? '#2563eb' : 'var(--sub)' }}>{qty}</span>
                  <button className="stepper-btn" onClick={() => setQty(p.id, qty + 1)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 18, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            )
          })}
        </div>

        {!isRemainingMode && fromOrder && !showAll && (
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => setShowAll(true)}>
            + Add other items
          </button>
        )}

        {hasInventoryWarning && (
          <div className="alert alert-warn" style={{ marginTop: 4, marginBottom: 12 }}>
            ⚠ One or more items exceed available cage stock
          </div>
        )}

        {error && (
          <div className="alert alert-warn" style={{ marginBottom: 12 }}>{error}</div>
        )}

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {isEditMode
              ? `Save Changes${selectedCount > 0 ? ` (${selectedCount} items)` : ''}`
              : isRemainingMode
                ? 'Confirm Delivery'
                : fromOrder
                  ? 'Confirm & Distribute'
                  : `Distribute & Deduct${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
