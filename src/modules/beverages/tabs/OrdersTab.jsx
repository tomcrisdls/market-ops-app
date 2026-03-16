import { useState, Fragment } from 'react'
import { KIOSKS } from '../../../lib/constants'
import { fmtMoney, calcTotals, findKiosk, findProduct, today, fmtDate } from '../../../lib/utils'
import { Icon } from '../../../components/icons/Icons'

function PipelineStepper({ status, isPartial }) {
  const steps = [
    { id: 'pending',     label: 'Ordered',     color: '#f97316' },
    { id: 'distributed', label: 'Distributed', color: isPartial ? '#f97316' : '#3b82f6' },
    { id: 'invoiced',    label: 'Invoiced',    color: '#16a34a' },
  ]
  const idx = status === 'pending' ? 0 : status === 'distributed' ? 1 : 2
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 16, padding: '0 2px' }}>
      {steps.map((step, i) => (
        <Fragment key={step.id}>
          {i > 0 && (
            <div style={{
              flex: 1,
              height: 2,
              marginTop: 6,
              background: i <= idx ? (i === 1 && isPartial ? '#fed7aa' : '#16a34a') : 'var(--border)',
              borderRadius: 1,
            }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: i === idx ? 12 : 9,
              height: i === idx ? 12 : 9,
              borderRadius: '50%',
              background: i < idx ? '#16a34a' : i === idx ? step.color : 'var(--border)',
              boxShadow: i === idx ? `0 0 0 3px ${step.color}28` : 'none',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 10,
              color: i === idx ? 'var(--text)' : i < idx ? 'var(--sub)' : 'var(--sub-light)',
              fontWeight: i === idx ? 700 : 400,
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}>
              {step.label}{i === 1 && isPartial ? ' (partial)' : ''}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

const STATUS_FILTERS = ['all', 'pending', 'distributed', 'invoiced']

const PILL_COLORS = {
  pending:     { bg: '#f97316', text: '#fff' },
  distributed: { bg: '#3b82f6', text: '#fff' },
  invoiced:    { bg: '#16a34a', text: '#fff' },
}

function buildAuditDiff(order, distributions) {
  const linked = distributions.find(d => d.orderId === order.id)
  if (!linked) return null

  const ordered = {}
  order.items.forEach(i => { ordered[i.productId] = i.qty })

  const diffs = []
  order.items.forEach(i => {
    const distQty = linked.items.find(di => di.productId === i.productId)?.qty ?? 0
    if (distQty !== i.qty) {
      diffs.push({ productId: i.productId, ordered: i.qty, distributed: distQty })
    }
  })
  linked.items.forEach(di => {
    if (!ordered[di.productId]) {
      diffs.push({ productId: di.productId, ordered: 0, distributed: di.qty })
    }
  })

  return diffs.length > 0 ? diffs : null
}

export function OrdersTab({ orders, distributions, inventory, onNewOrder, onDistribute, onInvoice, onDelete, onEdit, onDeliverRemaining, activeDate }) {
  const todayStr = today()
  // Partial = distributed but quantities don't match order
  const isPartial = (order) => {
    if (order.status !== 'distributed') return false
    const linked = distributions.find(d => d.orderId === order.id)
    if (!linked) return false
    return order.items.some(i => {
      const distQty = linked.items.find(di => di.productId === i.productId)?.qty ?? 0
      return distQty < i.qty
    })
  }

  const counts = {
    all:         orders.length,
    pending:     orders.filter(o => o.status === 'pending' || isPartial(o)).length,
    distributed: orders.filter(o => o.status === 'distributed').length,
    invoiced:    orders.filter(o => o.status === 'invoiced').length,
  }

  const [filter,   setFilter]   = useState(() => counts.pending > 0 ? 'pending' : 'all')
  const [expanded, setExpanded] = useState({})

  const isExpanded   = (id) => expanded[id] === true   // default: collapsed
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !isExpanded(id) }))

  const visible = filter === 'all'
    ? orders
    : filter === 'pending'
      ? orders.filter(o => o.status === 'pending' || isPartial(o))
      : orders.filter(o => o.status === filter)

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
        <div className="segmented-control">
          {STATUS_FILTERS.map(s => {
            const count  = counts[s]
            const active = filter === s
            return (
              <button
                key={s}
                className={`pill${active ? ' active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                {count > 0 && s !== 'all' && (
                  <span style={{
                    marginLeft: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: active ? 0.7 : 0.5,
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
          <div className="empty-icon-wrap"><Icon name="inbox" size={36} /></div>
          <p>No orders{filter !== 'all' ? ` with status "${filter}"` : ' for this date'}</p>
        </div>
      ) : (
        dateGroups.map(({ date, items: group }) => (
          <div key={date}>
            <div className="card-grid">
              {group.map(order => {
                const kiosk        = findKiosk(order.kioskId, KIOSKS)
                const totals       = calcTotals(order.items, inventory)
                const diffs        = order.status !== 'pending' ? buildAuditDiff(order, distributions) : null
                const hasRemaining = diffs && diffs.some(d => d.ordered > d.distributed)
                const borderColor = order.status === 'invoiced'    ? '#16a34a'
                                  : hasRemaining                   ? '#f97316'
                                  : order.status === 'distributed' ? '#3b82f6'
                                  : '#f97316'
                const isFuture = order.date > todayStr
                const isPast   = order.date < todayStr
                return (
                  <div className="card" key={order.id} style={{ borderLeft: `3px solid ${borderColor}` }}>
                    {/* Header */}
                    <div className="item-card-header">
                      <div className="item-card-name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                          <strong>{kiosk ? `${kiosk.id.replace(/^K0?/, 'K')} · ${kiosk.name}` : order.kioskId}</strong>
                          <span className={`badge badge-${order.status}`}>{order.status}</span>
                          {diffs && <span className="badge badge-warn">partial</span>}
                          {isFuture && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                              📅 {fmtDate(order.date)}
                            </span>
                          )}
                          {isPast && order.date !== todayStr && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e', background: '#fffbeb', padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                              {fmtDate(order.date)}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 13, color: 'var(--sub)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(totals.total)}</span>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {order.status === 'pending' && (
                              <>
                                <button className="btn-icon primary" title="Edit" onClick={() => onEdit(order.id)}>
                                  <Icon name="pencil" size={14} />
                                </button>
                                <button className="btn-icon success" title="Distribute" onClick={() => onDistribute(order.id)}>
                                  <Icon name="truck" size={14} />
                                </button>
                              </>
                            )}
                            {order.status === 'distributed' && (
                              <button className="btn-icon success" title="Generate Invoice" onClick={() => onInvoice(order.id)}>
                                <Icon name="receipt" size={14} />
                              </button>
                            )}
                            <button className="btn-icon danger" title="Delete" onClick={() => onDelete(order.id)}>
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                      {hasRemaining && (
                        <div style={{
                          marginTop: 6,
                          background: '#fff7ed',
                          border: '1px solid #fed7aa',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 12,
                          color: '#92400e',
                          lineHeight: 1.5,
                        }}>
                          <span style={{ fontWeight: 600, color: '#c2410c' }}>Still owed: </span>
                          {diffs.filter(d => d.ordered > d.distributed).map(d => {
                            const name = findProduct(d.productId)?.name ?? d.productId
                            return `${name} ×${d.ordered - d.distributed}`
                          }).join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Items toggle */}
                    <button className="card-items-toggle" onClick={() => toggleExpand(order.id)}>
                      <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                      <span className="toggle-chevron">{isExpanded(order.id) ? '▲' : '▼'}</span>
                    </button>

                    {/* Item rows */}
                    {isExpanded(order.id) && (
                      <div style={{ margin: '6px 0 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {order.items.map(item => {
                          const product = findProduct(item.productId)
                          return (
                            <div key={item.productId} style={{
                              display: 'grid', gridTemplateColumns: '32px 1fr',
                              alignItems: 'center', columnGap: 8,
                              fontSize: 13, color: 'var(--sub)', padding: '1px 0',
                            }}>
                              <span style={{ color: 'var(--text)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>×{item.qty}</span>
                              <span>{product?.name ?? item.productId}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {order.notes && <div className="item-card-notes">{order.notes}</div>}

                    {/* Pipeline stepper */}
                    <PipelineStepper status={order.status} isPartial={hasRemaining} />

                    {/* Next-step CTA */}
                    {order.status === 'pending' && (
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 13 }}
                        onClick={() => onDistribute(order.id)}
                      >
                        Distribute now →
                      </button>
                    )}
                    {order.status === 'distributed' && !hasRemaining && (
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 13 }}
                        onClick={() => onInvoice(order.id)}
                      >
                        Generate invoice →
                      </button>
                    )}
                    {hasRemaining && (
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 13, color: '#c2410c', borderColor: '#fed7aa', background: '#fff7ed' }}
                        onClick={() => onDeliverRemaining(order)}
                      >
                        Deliver remaining →
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
