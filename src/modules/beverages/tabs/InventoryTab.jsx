import { useState } from 'react'
import { PRODUCTS } from '../../../lib/constants'
import { fmtDate } from '../../../lib/utils'

export function InventoryTab({ inventory, deliveries, distributions, onReceiveStock, onUpdatePrice, onAdjustStock }) {
  const [adjustQtys, setAdjustQtys] = useState(() =>
    Object.fromEntries(PRODUCTS.map(p => [p.id, 1]))
  )

  return (
    <div className="screen">
      <div className="actions-bar">
        <div style={{ fontSize: 13, color: 'var(--sub)', fontWeight: 500 }}>
          {PRODUCTS.length} products
        </div>
        <button className="btn btn-primary" onClick={onReceiveStock}>+ Receive Stock</button>
      </div>

      {/* Current Stock */}
      <div className="card">
        <div className="card-title">Current Stock</div>
        <div style={{ overflowX: 'auto', margin: '0 -22px', padding: '0 22px' }}>
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
                const low   = qty <= 5
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`stock-num${low ? ' low' : ''}`}>{qty}</span>
                          {low && <span className="badge badge-low">Low</span>}
                        </div>
                        <div className="stock-bar-track">
                          <div
                            className={`stock-bar-fill${low ? ' low' : ''}`}
                            style={{ width: `${Math.min(100, (qty / Math.max(qty, 15)) * 100)}%` }}
                          />
                        </div>
                      </div>
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
      </div>

      {/* Delivery Log */}
      <div className="card">
        <div className="card-title">Delivery Log</div>
        {deliveries.length === 0 ? (
          <div style={{ color: 'var(--sub)', fontSize: 13, padding: '4px 0' }}>
            No deliveries logged yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', margin: '0 -22px', padding: '0 22px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {[...deliveries].reverse().slice(0, 5).map(d => {
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
          </div>
        )}
      </div>

    </div>
  )
}
