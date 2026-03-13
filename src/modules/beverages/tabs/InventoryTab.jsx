import { useState } from 'react'
import { PRODUCTS, LOW_THRESHOLD } from '../../../lib/constants'
import { fmtDate, fmtMoney, findProduct } from '../../../lib/utils'

function computeStockouts(deliveries, distributions) {
  const events = [
    ...deliveries.flatMap(d =>
      d.items.map(i => ({ date: d.date, productId: i.productId, delta: +i.qty }))
    ),
    ...distributions.flatMap(d =>
      d.items.map(i => ({ date: d.date, productId: i.productId, delta: -i.qty }))
    ),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const balance = {}
  const stockouts = []
  for (const ev of events) {
    balance[ev.productId] = (balance[ev.productId] ?? 0) + ev.delta
    if (ev.delta < 0 && balance[ev.productId] <= 0) {
      stockouts.push({ productId: ev.productId, date: ev.date })
    }
  }
  return stockouts
}

export function InventoryTab({ inventory, deliveries, distributions, onLogDelivery, onReceiveStock, onUpdatePrice, onAdjustStock }) {
  // Local qty adjust inputs — one per product
  const [adjustQtys, setAdjustQtys] = useState(() =>
    Object.fromEntries(PRODUCTS.map(p => [p.id, 1]))
  )

  const lowItems = PRODUCTS.filter(p => (inventory[p.id]?.qty ?? 0) <= LOW_THRESHOLD)
  const stockouts = computeStockouts(deliveries, distributions ?? [])

  return (
    <div className="screen">
      <div className="actions-bar">
        <span />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onLogDelivery}>+ Log Delivery</button>
          <button className="btn btn-primary" onClick={onReceiveStock}>+ Receive Stock</button>
        </div>
      </div>

      {/* Low-stock alert — single compact banner */}
      {lowItems.length > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <div>
            <strong>{lowItems.length} product{lowItems.length !== 1 ? 's' : ''} low or out of stock</strong>
            <div style={{ marginTop: 4, fontSize: 12, color: '#92400e' }}>
              {lowItems.map((p, i) => {
                const qty = inventory[p.id]?.qty ?? 0
                return (
                  <span key={p.id}>
                    {p.name} <span style={{ fontWeight: 700 }}>({qty})</span>
                    {i < lowItems.length - 1 ? ' · ' : ''}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Current Stock */}
      <div className="card">
        <div className="card-title">Current Stock</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Vendor</th>
              <th>In Cage</th>
              <th>Price / case</th>
              <th style={{ minWidth: 220 }}>Adjust Stock</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map(p => {
              const qty   = inventory[p.id]?.qty ?? 0
              const price = inventory[p.id]?.price ?? p.defaultPrice
              const low   = qty <= LOW_THRESHOLD
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.hasDeposit && (
                      <span style={{ fontSize: 10, color: 'var(--sub)', marginLeft: 6 }}>
                        (bottle deposit)
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--sub)' }}>{p.vendor}</td>
                  <td>
                    <span className={`stock-num${low ? ' low' : ''}`}>{qty}</span>
                    {low && <span className="badge badge-low" style={{ marginLeft: 6 }}>Low</span>}
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      className="price-input"
                      defaultValue={price.toFixed(2)}
                      title="Update price from new invoice"
                      onBlur={e => onUpdatePrice(p.id, e.target.value)}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="number"
                        className="qty-input"
                        style={{ width: 52 }}
                        value={adjustQtys[p.id]}
                        min="1"
                        onChange={e =>
                          setAdjustQtys(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 1 }))
                        }
                      />
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onAdjustStock(p.id, adjustQtys[p.id])}
                      >
                        + Add
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => onAdjustStock(p.id, -adjustQtys[p.id])}
                      >
                        – Remove
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Delivery Log */}
      <div className="card">
        <div className="card-title">Delivery Log</div>
        {deliveries.length === 0 ? (
          <div style={{ color: 'var(--sub)', fontSize: 13, padding: '4px 0' }}>
            No deliveries logged yet.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {[...deliveries].reverse().slice(0, 30).map(d => {
                const itemTxt = d.items
                  .map(it => {
                    const p = PRODUCTS.find(p => p.id === it.productId)
                    return `+${it.qty} × ${p ? p.name : it.productId}`
                  })
                  .join(', ')
                return (
                  <tr key={d.id}>
                    <td>{fmtDate(d.date)}</td>
                    <td style={{ color: 'var(--sub)' }}>{d.vendor}</td>
                    <td style={{ color: 'var(--sub)', fontSize: 12 }}>{itemTxt}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Stockout History */}
      <div className="card">
        <div className="card-title">Stockout History</div>
        {stockouts.length === 0 ? (
          <div style={{ color: 'var(--sub)', fontSize: 13, padding: '4px 0' }}>
            No stockouts recorded.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
              </tr>
            </thead>
            <tbody>
              {[...stockouts].reverse().slice(0, 20).map((s, i) => {
                const p = findProduct(s.productId)
                return (
                  <tr key={i}>
                    <td>{fmtDate(s.date)}</td>
                    <td style={{ color: 'var(--sub)' }}>{p ? p.name : s.productId}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
