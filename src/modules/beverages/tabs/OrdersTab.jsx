import { useState } from 'react'
import { KIOSKS } from '../../../lib/constants'
import { fmtMoney, calcTotals, findKiosk, findProduct } from '../../../lib/utils'

const STATUS_FILTERS = ['all', 'pending', 'distributed', 'invoiced']

const PILL_COLORS = {
  pending:     { bg: '#f59e0b', text: '#fff' },
  distributed: { bg: '#3b82f6', text: '#fff' },
  invoiced:    { bg: '#16a34a', text: '#fff' },
}

function buildAuditDiff(order, distributions) {
  const linked = distributions.find(d => d.orderId === order.id)
  if (!linked) return null

  // Build maps of ordered vs distributed qty per productId
  const ordered = {}
  order.items.forEach(i => { ordered[i.productId] = i.qty })

  const diffs = []
  order.items.forEach(i => {
    const distQty = linked.items.find(di => di.productId === i.productId)?.qty ?? 0
    if (distQty !== i.qty) {
      diffs.push({ productId: i.productId, ordered: i.qty, distributed: distQty })
    }
  })
  // Also check if distribution has extra items not in order
  linked.items.forEach(di => {
    if (!ordered[di.productId]) {
      diffs.push({ productId: di.productId, ordered: 0, distributed: di.qty })
    }
  })

  return diffs.length > 0 ? diffs : null
}

export function OrdersTab({ orders, distributions, inventory, onNewOrder, onDistribute, onInvoice, onDelete, onEdit }) {
  const counts = {
    all:         orders.length,
    pending:     orders.filter(o => o.status === 'pending').length,
    distributed: orders.filter(o => o.status === 'distributed').length,
    invoiced:    orders.filter(o => o.status === 'invoiced').length,
  }

  const [filter, setFilter] = useState(() =>
    counts.pending > 0 ? 'pending' : 'all'
  )

  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  // Group by date (preserving order — newest first as supplied)
  const dateGroups = []
  const seen = {}
  visible.forEach(o => {
    if (!seen[o.date]) {
      seen[o.date] = []
      dateGroups.push({ date: o.date, items: seen[o.date] })
    }
    seen[o.date].push(o)
  })

  return (
    <div className="screen">
      <div className="actions-bar">
        <div className="filter-pills">
          {STATUS_FILTERS.map(s => {
            const count  = counts[s]
            const color  = PILL_COLORS[s]
            const active = filter === s
            return (
              <button
                key={s}
                className={`pill${active ? ' active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                {count > 0 && color && (
                  <span style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    marginLeft:      5,
                    minWidth:        18,
                    height:          18,
                    borderRadius:    9,
                    fontSize:        11,
                    fontWeight:      700,
                    lineHeight:      1,
                    padding:         '0 5px',
                    background:      active ? 'rgba(255,255,255,0.25)' : color.bg,
                    color:           active ? '#fff' : color.text,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <button className="btn btn-primary" onClick={onNewOrder}>+ New Order</button>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>No orders{filter !== 'all' ? ' with status "' + filter + '"' : ' for this date'}</p>
        </div>
      ) : (
        dateGroups.map(({ date, items: group }) => (
          <div key={date}>
            {group.map(order => {
              const kiosk   = findKiosk(order.kioskId, KIOSKS)
              const totals  = calcTotals(order.items, inventory)
              const diffs   = order.status !== 'pending' ? buildAuditDiff(order, distributions) : null
              const borderColor = order.status === 'invoiced'    ? '#16a34a'
                              : order.status === 'distributed' ? '#3b82f6'
                              : '#f59e0b'
            return (
                <div className="card" key={order.id} style={{ borderLeft: `3px solid ${borderColor}` }}>
                  <div className="item-card-header">
                    <div>
                      <div className="item-card-name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                          <strong>{kiosk ? `${kiosk.id.replace(/^K0?/, 'K')} · ${kiosk.name}` : order.kioskId}</strong>
                          <span className={`badge badge-${order.status}`}>{order.status}</span>
                          {diffs && <span className="badge badge-warn">⚠ partial</span>}
                        </div>
                        <span className="item-card-amount">{fmtMoney(totals.total)}</span>
                      </div>
                      {diffs && (
                        <div style={{ fontSize: 11, color: '#c2410c', marginTop: 2 }}>
                          {diffs.map(d => {
                            const name = findProduct(d.productId)?.name ?? d.productId
                            return `${name}: ordered ${d.ordered} · distributed ${d.distributed}`
                          }).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item rows — name + qty side by side */}
                  <div style={{ margin: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {order.items.map(item => {
                      const product = findProduct(item.productId)
                      return (
                        <div key={item.productId} style={{
                          display:             'grid',
                          gridTemplateColumns: '32px 1fr',
                          alignItems:          'center',
                          columnGap:           8,
                          fontSize:            13,
                          color:               'var(--sub)',
                          padding:             '1px 0',
                        }}>
                          <span style={{ color: 'var(--text)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>×{item.qty}</span>
                          <span>{product?.name ?? item.productId}</span>
                        </div>
                      )
                    })}
                  </div>

                  {order.notes && <div className="item-card-notes">{order.notes}</div>}

                  <div className="row-actions">
                    {order.status === 'pending' && (
                      <>
                        <button className="btn btn-sm btn-ghost" onClick={() => onEdit(order.id)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => onDistribute(order.id)}>
                          Distribute
                        </button>
                      </>
                    )}
                    {order.status === 'distributed' && (
                      <button className="btn btn-sm btn-success" onClick={() => onInvoice(order.id)}>
                        Invoice
                      </button>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={() => onDelete(order.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
