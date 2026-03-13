import { useState } from 'react'
import { useBeverageData } from './hooks/useBeverageData'
import { OrdersTab }       from './tabs/OrdersTab'
import { InventoryTab }    from './tabs/InventoryTab'
import { DistributionTab } from './tabs/DistributionTab'
import { InvoicesTab }     from './tabs/InvoicesTab'
import { TrackerTab }      from './tabs/TrackerTab'
import { OrderModal }          from './modals/OrderModal'
import { EditOrderModal }      from './modals/EditOrderModal'
import { DeliveryModal }       from './modals/DeliveryModal'
import { DistributeModal }     from './modals/DistributeModal'
import { DistributeAllModal }  from './modals/DistributeAllModal'
import { InvoiceModal }        from './modals/InvoiceModal'
import { ReceiveStockModal }   from './modals/ReceiveStockModal'
import { DateNav }             from './components/DateNav'
import { ConfirmModal }        from './components/ConfirmModal'
import { today, uid, invCode, getPhase, calcTotals, findKiosk, findProduct } from '../../lib/utils'
import { KIOSKS } from '../../lib/constants'

const TABS = [
  { id: 'orders',       label: '📥\u00a0 Orders'       },
  { id: 'distribution', label: '🚚\u00a0 Distribution' },
  { id: 'invoices',     label: '🧾\u00a0 Invoices'     },
  { id: 'tracker',      label: '📊\u00a0 Tracker'      },
  { id: 'inventory',    label: '📦\u00a0 Inventory'    },
]

export function BeverageModule() {
  const [activeTab,  setActiveTab]  = useState('orders')
  const [activeDate, setActiveDate] = useState(today())

  // Modal state
  const [orderModalOpen,       setOrderModalOpen]       = useState(false)
  const [editModalOrderId,     setEditModalOrderId]     = useState(null)
  const [deliveryModalOpen,    setDeliveryModalOpen]    = useState(false)
  const [receiveStockOpen,     setReceiveStockOpen]     = useState(false)
  const [distModalOpen,        setDistModalOpen]        = useState(false)
  const [distributeAllOpen,    setDistributeAllOpen]    = useState(false)
  const [invoiceModalOpen,     setInvoiceModalOpen]     = useState(false)
  const [preOrderId,           setPreOrderId]           = useState(null)
  const [preDistId,            setPreDistId]            = useState(null)
  const [editDistId,           setEditDistId]           = useState(null)
  const [confirm,              setConfirm]              = useState(null) // { title, message, confirmLabel, variant, onConfirm }

  const data = useBeverageData()

  if (data.loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--gray)' }}>Loading…</div>
  }

  const todayStr = today()
  const pendingTodayOrders = data.orders.filter(o => o.status === 'pending' && o.date === todayStr)

  // ── Date-filtered slices for tabs ─────────────────────
  const dayOrders   = data.orders.filter(o => o.date === activeDate)
  const dayDists    = data.distributions.filter(d => d.date === activeDate)
  const dayInvoices = data.invoices.filter(i => i.date === activeDate)

  // ── Navigation helpers ────────────────────────────────
  // Modals live at BeverageModule level — they work on any active tab.
  // We intentionally do NOT switch tabs when opening a modal from a card
  // action; the user stays in context and sees the record update via realtime.

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
      alert('Distribute first, then generate an invoice.')
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
      {/* Module tab bar */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date navigation — hidden on Tracker (uses rolling windows) and Inventory */}
      {activeTab !== 'tracker' && activeTab !== 'inventory' && (
        <div className="date-nav-wrapper" style={{ padding: '0 20px' }}>
          <DateNav date={activeDate} onChange={setActiveDate} />
        </div>
      )}

      {/* Active tab content */}
      {activeTab === 'orders' && (
        <OrdersTab
          orders={dayOrders}
          distributions={data.distributions}
          inventory={data.inventory}
          onNewOrder={() => setOrderModalOpen(true)}
          onDistribute={goDistributeOrder}
          onInvoice={goInvoiceFromOrder}
          onDelete={handleDeleteOrder}
          onEdit={(id) => setEditModalOrderId(id)}
        />
      )}

      {activeTab === 'inventory' && (
        <InventoryTab
          inventory={data.inventory}
          deliveries={data.deliveries}
          distributions={data.distributions}
          onLogDelivery={() => setDeliveryModalOpen(true)}
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
        onSave={data.updateOrder}
      />

      <DeliveryModal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        onSave={data.addDelivery}
      />

      <ReceiveStockModal
        isOpen={receiveStockOpen}
        onClose={() => setReceiveStockOpen(false)}
        inventory={data.inventory}
        onSave={data.addDelivery}
      />

      <DistributeModal
        isOpen={distModalOpen}
        onClose={() => { setDistModalOpen(false); setPreOrderId(null) }}
        inventory={data.inventory}
        orders={data.orders}
        preOrderId={preOrderId}
        defaultDate={activeDate}
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
