import { KIOSKS } from '../../../lib/constants'
import { fmtDate, fmtMoney, fmtItemList, calcTotals, findKiosk } from '../../../lib/utils'

export function DistributeAllModal({ isOpen, onClose, orders, inventory, date, onConfirm }) {
  if (!isOpen || orders.length === 0) return null

  // Check for any item where requested qty > cage stock
  const stockWarnings = []
  const stockMap = {}
  orders.forEach(order => {
    order.items.forEach(({ productId, qty }) => {
      stockMap[productId] = (stockMap[productId] || 0) + qty
    })
  })
  Object.entries(stockMap).forEach(([productId, totalQty]) => {
    const inCage = inventory[productId]?.qty ?? 0
    if (totalQty > inCage) {
      stockWarnings.push({ productId, totalQty, inCage })
    }
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Distribute All — {fmtDate(date)}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 16 }}>
          {orders.length} pending order{orders.length !== 1 ? 's' : ''} will be distributed and inventory will be deducted.
        </p>

        {stockWarnings.length > 0 && (
          <div className="alert alert-warn" style={{ marginBottom: 12 }}>
            ⚠ Stock may be insufficient for some items. Distributions will still proceed.
          </div>
        )}

        <table className="data-table" style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Kitchen</th>
              <th>Items</th>
              <th style={{ textAlign: 'right' }}>Est. Value</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const kiosk  = findKiosk(order.kioskId, KIOSKS)
              const totals = calcTotals(order.items, inventory)
              return (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {kiosk ? `${kiosk.id.replace(/^K0?/, 'K')} · ${kiosk.name}` : order.kioskId}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--sub)' }}>{fmtItemList(order.items)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(totals.total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onConfirm(orders); onClose() }}>
            Confirm &amp; Distribute All
          </button>
        </div>
      </div>
    </div>
  )
}
