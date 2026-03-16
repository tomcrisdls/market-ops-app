import { useState, Fragment } from 'react'
import { useBeverageData } from './hooks/useBeverageData'
import { OrdersTab }       from './tabs/OrdersTab'
import { InventoryTab }    from './tabs/InventoryTab'
import { DistributionTab } from './tabs/DistributionTab'
import { InvoicesTab }     from './tabs/InvoicesTab'
import { TrackerTab }      from './tabs/TrackerTab'
import { OrderModal }          from './modals/OrderModal'
import { EditOrderModal }      from './modals/EditOrderModal'
import { DistributeModal }     from './modals/DistributeModal'
import { DistributeAllModal }  from './modals/DistributeAllModal'
import { InvoiceModal }        from './modals/InvoiceModal'
import { ReceiveStockModal }   from './modals/ReceiveStockModal'
import { DateNav }             from './components/DateNav'
import { VendorDeadlineBanner } from './components/VendorDeadlineBanner'
import { ConfirmModal }        from './components/ConfirmModal'
import { Icon }                from '../../components/icons/Icons'
import { today, uid, invCode, getPhase, calcTotals, findKiosk, findProduct, fmtMoney } from '../../lib/utils'
import { KIOSKS } from '../../lib/constants'

const TABS = [
  { id: 'orders',       icon: 'inbox',     label: 'Orders'       },
  { id: 'distribution', icon: 'truck',     label: 'Distribution' },
  { id: 'invoices',     icon: 'receipt',   label: 'Invoices'     },
  { id: 'tracker',      icon: 'chart-bar', label: 'Tracker'      },
  { id: 'inventory',    icon: 'cube',      label: 'Inventory'    },
]

export function BeverageModule() {
  const [activeTab,  setActiveTab]  = useState('orders')
  const [activeDate, setActiveDate] = useState(today())

  // Modal state
  const [orderModalOpen,       setOrderModalOpen]       = useState(false)
  const [editModalOrderId,     setEditModalOrderId]     = useState(null)
  const [receiveStockOpen,     setReceiveStockOpen]     = useState(false)
  const [distModalOpen,        setDistModalOpen]        = useState(false)
  const [distributeAllOpen,    setDistributeAllOpen]    = useState(false)
  const [invoiceModalOpen,     setInvoiceModalOpen]     = useState(false)
  const [preOrderId,           setPreOrderId]           = useState(null)
  const [preDistItems,         setPreDistItems]         = useState(null)
  const [preDistId,            setPreDistId]            = useState(null)
  const [editDistId,           setEditDistId]           = useState(null)
  const [confirm,              setConfirm]              = useState(null)

  const data = useBeverageData()

  if (data.loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--gray)' }}>Loading…</div>
  }

  if (data.loadError) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: '#dc2626', marginBottom: 12 }}>{data.loadError}</div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }

  const todayStr = today()

  // ── Shared computations ────────────────────────────────
  const pendingTodayOrders  = data.orders.filter(o => o.status === 'pending' && o.date === todayStr)

  // ── Date-filtered slices for tabs ─────────────────────
  const dayOrders   = data.orders.filter(o => o.date === activeDate)
  const dayDists    = data.distributions.filter(d => d.date === activeDate)
  const dayInvoices = data.invoices.filter(i => i.date === activeDate)

  // ── Contextual stats per tab ───────────────────────────
  const tabStats = (() => {
    switch (activeTab) {
      case 'orders': {
        const pending  = dayOrders.filter(o => o.status === 'pending').length
        const cases    = dayOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + i.qty, 0), 0)
        const activeMs = new Date(activeDate + 'T00:00:00').getTime()
        const upcoming = data.orders.filter(o => {
          const diff = Math.round((new Date(o.date + 'T00:00:00').getTime() - activeMs) / 86400000)
          return diff > 0 && diff <= 3 && o.status === 'pending'
        })
        const stats = [
          { label: 'Orders',  value: dayOrders.length },
          { label: 'Pending', value: pending },
        ]
        if (upcoming.length > 0) {
          const nextDate = upcoming.reduce((min, o) => o.date < min ? o.date : min, upcoming[0].date)
          const daysAway = Math.round((new Date(nextDate + 'T00:00:00').getTime() - activeMs) / 86400000)
          const label = daysAway === 1 ? 'Due Tomorrow' : `Due in ${daysAway}d`
          stats.push({ label, value: upcoming.length, onClick: () => {
            const d = new Date(activeDate + 'T00:00:00')
            d.setDate(d.getDate() + daysAway)
            setActiveDate(d.toISOString().slice(0, 10))
          }})
        }
        return stats
      }
      case 'distribution': {
        const kitchens = new Set(dayDists.map(d => d.kioskId)).size
        const cases    = dayDists.reduce((sum, d) => sum + (d.items || []).reduce((s, i) => s + i.qty, 0), 0)
        const needInv  = dayDists.filter(d => {
          if (d.status === 'invoiced') return false
          const k = findKiosk(d.kioskId, KIOSKS)
          return !k?.noInvoice
        }).length
        return [
          { label: 'Kitchens Served', value: kitchens },
          { label: 'Cases Out',       value: cases },
          { label: 'Pending Invoice', value: needInv, onClick: needInv > 0 ? () => setActiveTab('invoices') : undefined },
        ]
      }
      case 'invoices': {
        const drafts = dayInvoices.filter(i => i.status === 'draft').length
        const sent   = dayInvoices.filter(i => i.status === 'sent').length
        const total  = dayInvoices.reduce((sum, i) => sum + i.total, 0)
        return [
          { label: 'Drafts', value: drafts },
          { label: 'Sent',   value: sent },
          { label: 'Total',  value: total > 0 ? fmtMoney(total) : '—' },
        ]
      }
      case 'tracker': {
        const now  = new Date()
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          return d.toISOString().split('T')[0]
        })
        const weekDists   = data.distributions.filter(d => days.includes(d.date))
        const weekCases   = weekDists.reduce((sum, d) => sum + (d.items || []).reduce((s, i) => s + i.qty, 0), 0)
        const weekRevenue = data.invoices
          .filter(i => days.includes(i.date) && i.status === 'sent')
          .reduce((sum, i) => sum + i.total, 0)
        return [
          { label: 'Distributions (7d)', value: weekDists.length },
          { label: 'Cases Out (7d)',     value: weekCases },
          { label: 'Invoiced (7d)',      value: weekRevenue > 0 ? fmtMoney(weekRevenue) : '—' },
        ]
      }
      case 'inventory': {
        const inv      = Object.values(data.inventory)
        const outCount = inv.filter(i => i.qty === 0).length
        const cases    = inv.reduce((sum, i) => sum + (i.qty || 0), 0)
        return [
          { label: 'Products',     value: inv.length },
          { label: 'Out of Stock', value: outCount },
          { label: 'Cases in Cage', value: cases },
        ]
      }
      default: return []
    }
  })()

  // ── Navigation helpers ────────────────────────────────
  const goDistributeOrder = (orderId) => {
    setPreOrderId(orderId)
    setDistModalOpen(true)
  }

  const goInvoiceFromOrder = (orderId) => {
    const dist = data.distributions.find(d => d.orderId === orderId)
    if (dist) {
      setPreDistId(dist.id)
      setInvoiceModalOpen(true)
    } else {
      openConfirm({
        title:        'Distribute First',
        message:      'This order hasn\'t been distributed yet. Distribute it first, then generate an invoice.',
        confirmLabel: 'Go to Distribution',
        variant:      'warning',
        onConfirm:    () => setActiveTab('distribution'),
      })
    }
  }

  const goInvoiceFromDist = (distId) => {
    setPreDistId(distId)
    setInvoiceModalOpen(true)
  }

  const openNewDistribution = (orderId) => {
    setPreOrderId(orderId)
    setDistModalOpen(true)
  }

  const handleDeliverRemaining = (order) => {
    const linked = data.distributions.find(d => d.orderId === order.id)
    if (!linked) return
    const remaining = order.items
      .map(i => {
        const distQty = linked.items.find(di => di.productId === i.productId)?.qty ?? 0
        return { productId: i.productId, qty: i.qty - distQty }
      })
      .filter(i => i.qty > 0)
    if (remaining.length === 0) return
    // Default to tomorrow — that's almost always when remaining stock arrives
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)
    setPreDistItems({ kioskId: order.kioskId, items: remaining, defaultDate: tomorrowStr })
    setDistModalOpen(true)
  }

  const openNewInvoice = (distId) => {
    setPreDistId(distId)
    setInvoiceModalOpen(true)
  }

  // ── Edit order ────────────────────────────────────────
  const editOrder = data.orders.find(o => o.id === editModalOrderId) ?? null

  // ── Edit distribution ─────────────────────────────────
  const editDist = data.distributions.find(d => d.id === editDistId) ?? null

  // ── Invoice All Pending ───────────────────────────────
  const handleInvoiceAllPending = () => {
    const pending = dayDists.filter(d => {
      if (d.status === 'invoiced') return false
      const k = findKiosk(d.kioskId, KIOSKS)
      return !k?.noInvoice
    })
    if (pending.length === 0) return
    openConfirm({
      title:        `Invoice All (${pending.length})`,
      message:      `Generate ${pending.length} draft invoice${pending.length !== 1 ? 's' : ''} for all pending distributions?`,
      confirmLabel: `Generate ${pending.length} Invoice${pending.length !== 1 ? 's' : ''}`,
      variant:      'success',
      onConfirm:    () => runInvoiceAll(pending),
    })
  }

  const runInvoiceAll = async (pending) => {
    for (const dist of pending) {
      const kiosk  = findKiosk(dist.kioskId, KIOSKS)
      const totals = calcTotals(dist.items, data.inventory)
      const code   = invCode(kiosk.code, dist.date)
      const items  = dist.items.map(item => {
        const product = findProduct(item.productId)
        const price   = data.inventory[item.productId]?.price ?? product?.defaultPrice ?? 0
        return {
          productId:       item.productId,
          name:            product?.name    ?? item.productId,
          invName:         product?.invName ?? item.productId,
          qty:             item.qty,
          price,
          amount:          item.qty * price,
          trackerCategory: product?.trackerCategory ?? '',
          hasDeposit:      product?.hasDeposit ?? false,
        }
      })
      const invoice = {
        id:             uid(),
        distributionId: dist.id,
        orderId:        dist.orderId || null,
        kioskId:        dist.kioskId,
        date:           dist.date,
        invoiceCode:    code,
        phase:          getPhase(dist.date),
        items,
        subtotal:       totals.subtotal,
        deposit:        totals.deposit,
        tax:            totals.tax,
        total:          totals.total,
        status:         'draft',
        createdAt:      new Date().toISOString(),
      }
      await data.addInvoice(invoice, dist)
    }
  }

  // ── Distribute All Today ──────────────────────────────
  const handleDistributeAll = async (orders) => {
    for (const order of orders) {
      await data.addDistribution(order.id, order.kioskId, todayStr, order.items, '')
    }
  }

  // ── Confirm helper ────────────────────────────────────
  const openConfirm = (opts) => setConfirm(opts)
  const closeConfirm = () => setConfirm(null)

  // ── Delete with confirm ───────────────────────────────
  const handleDeleteOrder = (id) => {
    openConfirm({
      title:        'Delete Order',
      message:      'This order will be permanently removed.',
      confirmLabel: 'Delete',
      variant:      'danger',
      onConfirm:    () => data.deleteOrder(id),
    })
  }

  const handleDeleteDist = (id) => {
    openConfirm({
      title:        'Delete Distribution',
      message:      'Inventory quantities will NOT be restored. This cannot be undone.',
      confirmLabel: 'Delete',
      variant:      'danger',
      onConfirm:    () => data.deleteDistribution(id),
    })
  }

  const handleDeleteInvoice = (id) => {
    openConfirm({
      title:        'Delete Invoice',
      message:      'This invoice will be permanently removed.',
      confirmLabel: 'Delete',
      variant:      'danger',
      onConfirm:    () => data.deleteInvoice(id),
    })
  }

  return (
    <>
      {/* Vendor deadline banner */}
      <VendorDeadlineBanner />

      {/* Stats bar — contextual per tab */}
      <div className="stats-bar">
        {tabStats.map((stat, i) => (
          <Fragment key={stat.label}>
            {i > 0 && <div className="stat-divider" />}
            <div
              className="stat-item"
              onClick={stat.onClick}
              style={stat.onClick ? { cursor: 'pointer' } : undefined}
            >
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </Fragment>
        ))}
      </div>

      {/* Sidebar + main layout */}
      <div className="module-layout">
        {/* Sidebar nav */}
        <aside className="sidebar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`sidebar-nav-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={16} className="nav-icon-svg" />
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="main-content">
          {/* Date navigation — hidden on Tracker and Inventory */}
          {activeTab !== 'tracker' && activeTab !== 'inventory' && (
            <div className="date-nav-wrapper" style={{ padding: '0 20px' }}>
              <DateNav date={activeDate} onChange={setActiveDate} />
            </div>
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              orders={dayOrders}
              distributions={data.distributions}
              inventory={data.inventory}
              activeDate={activeDate}
              onNewOrder={() => setOrderModalOpen(true)}
              onDistribute={goDistributeOrder}
              onInvoice={goInvoiceFromOrder}
              onDelete={handleDeleteOrder}
              onDeliverRemaining={handleDeliverRemaining}
              onEdit={(id) => setEditModalOrderId(id)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryTab
              inventory={data.inventory}
              deliveries={data.deliveries}
              distributions={data.distributions}
              onReceiveStock={() => setReceiveStockOpen(true)}
              onUpdatePrice={data.updateInventoryPrice}
              onAdjustStock={data.adjustInventory}
            />
          )}

          {activeTab === 'distribution' && (
            <DistributionTab
              distributions={dayDists}
              orders={data.orders}
              inventory={data.inventory}
              onNewDistribution={openNewDistribution}
              onGenerateInvoice={goInvoiceFromDist}
              onInvoiceAll={handleInvoiceAllPending}
              onEdit={(id) => setEditDistId(id)}
              onDelete={handleDeleteDist}
              onDistributeAll={() => setDistributeAllOpen(true)}
              pendingTodayOrders={pendingTodayOrders}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesTab
              invoices={dayInvoices}
              onGenerateInvoice={openNewInvoice}
              onMarkSent={data.markInvoiceSent}
              onDelete={handleDeleteInvoice}
              onGoToDistribution={() => setActiveTab('distribution')}
            />
          )}

          {activeTab === 'tracker' && (
            <TrackerTab
              invoices={data.invoices}
              inventory={data.inventory}
              distributions={data.distributions}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <OrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        inventory={data.inventory}
        onSave={data.addOrder}
      />

      <EditOrderModal
        isOpen={editModalOrderId !== null}
        onClose={() => setEditModalOrderId(null)}
        order={editOrder}
        inventory={data.inventory}
        hasDistribution={data.distributions.some(d => d.orderId === editModalOrderId)}
        onSave={data.updateOrder}
      />

      <ReceiveStockModal
        isOpen={receiveStockOpen}
        onClose={() => setReceiveStockOpen(false)}
        inventory={data.inventory}
        onSave={data.addDelivery}
      />

      <DistributeModal
        isOpen={distModalOpen}
        onClose={() => { setDistModalOpen(false); setPreOrderId(null); setPreDistItems(null) }}
        inventory={data.inventory}
        orders={data.orders}
        preOrderId={preOrderId}
        preItems={preDistItems}
        defaultDate={preDistItems?.defaultDate ?? activeDate}
        onSave={data.addDistribution}
      />

      <DistributeModal
        isOpen={editDistId !== null}
        onClose={() => setEditDistId(null)}
        inventory={data.inventory}
        orders={data.orders}
        editDist={editDist}
        onUpdate={data.updateDistribution}
        onSave={data.addDistribution}
      />

      <DistributeAllModal
        isOpen={distributeAllOpen}
        onClose={() => setDistributeAllOpen(false)}
        orders={pendingTodayOrders}
        inventory={data.inventory}
        date={todayStr}
        onConfirm={handleDistributeAll}
      />

      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => { setInvoiceModalOpen(false); setPreDistId(null) }}
        distributions={data.distributions}
        inventory={data.inventory}
        preDistId={preDistId}
        onSave={data.addInvoice}
      />

      <ConfirmModal
        isOpen={confirm !== null}
        onClose={closeConfirm}
        onConfirm={confirm?.onConfirm ?? (() => {})}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant}
      />
    </>
  )
}
