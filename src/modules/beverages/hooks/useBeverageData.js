import { useState, useEffect, useCallback, useRef } from 'react'
import { PRODUCTS } from '../../../lib/constants'
import * as db from '../../../lib/storage'
import { supabase } from '../../../lib/supabase'

/**
 * Central state manager for the Beverage module.
 * Loads all data from Supabase on mount. All mutations are async.
 */
export function useBeverageData() {
  const [loading,       setLoading]      = useState(true)
  const [loadError,     setLoadError]    = useState(null)
  const [inventory,     setInvState]     = useState({})
  const [orders,        setOrdersState]  = useState([])
  const [deliveries,    setDelivState]   = useState([])
  const [distributions, setDistState]    = useState([])
  const [invoices,      setInvoicesState]= useState([])

  // Debounce timers — prevents double-fetch when parent + child rows change together
  const timers = useRef({})
  const debounce = useCallback((key, fn, delay = 400) => {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(fn, delay)
  }, [])

  // ── Load all data on mount ──────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [inv, ords, delivs, dists, invs] = await Promise.all([
          db.getInventory(),
          db.getOrders(),
          db.getDeliveries(),
          db.getDistributions(),
          db.getInvoices(),
        ])
        setInvState(inv)
        setOrdersState(ords)
        setDelivState(delivs)
        setDistState(dists)
        setInvoicesState(invs)
      } catch (err) {
        console.error('Failed to load data:', err?.message || err?.code || JSON.stringify(err))
        setLoadError('Failed to connect. Check your connection and reload.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Realtime — sync across all managers ────────────────
  useEffect(() => {
    if (!supabase) return

    const ch = supabase.channel('market-ops-live')

    // Orders (subscribe to items table too so we wait for full row + items)
    const refetchOrders = () => debounce('orders', async () => {
      setOrdersState(await db.getOrders())
    })
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },      refetchOrders)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refetchOrders)

    // Distributions
    const refetchDists = () => debounce('dists', async () => {
      setDistState(await db.getDistributions())
    })
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'distributions' },      refetchDists)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'distribution_items' }, refetchDists)

    // Invoices
    const refetchInvoices = () => debounce('invoices', async () => {
      setInvoicesState(await db.getInvoices())
    })
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' },      refetchInvoices)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_items' }, refetchInvoices)

    // Inventory
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () =>
      debounce('inventory', async () => { setInvState(await db.getInventory()) })
    )

    // Deliveries
    const refetchDeliveries = () => debounce('deliveries', async () => {
      setDelivState(await db.getDeliveries())
    })
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' },      refetchDeliveries)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_items' }, refetchDeliveries)

    ch.subscribe()

    return () => {
      supabase.removeChannel(ch)
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [debounce])

  // ── INVENTORY ──────────────────────────────────────────
  const updateInventoryPrice = useCallback(async (productId, price) => {
    const parsed = parseFloat(price)
    await db.setInventoryPrice(productId, parsed)
    setInvState(prev => ({
      ...prev,
      [productId]: { ...prev[productId], price: parsed },
    }))
  }, [])

  const adjustInventory = useCallback(async (productId, delta) => {
    const newQty = await db.changeInventoryQty(productId, delta)
    setInvState(prev => ({
      ...prev,
      [productId]: { ...prev[productId], qty: newQty },
    }))
  }, [])

  // ── DELIVERIES ─────────────────────────────────────────
  const addDelivery = useCallback(async (date, vendor, items) => {
    const delivery = await db.insertDelivery({ date, vendor, items, notes: null })
    setDelivState(prev => [delivery, ...prev])
    // Update inventory qty and price for each delivered item
    for (const { productId, qty, unitPrice } of items) {
      await db.changeInventoryQty(productId, qty)
      if (unitPrice && unitPrice > 0) {
        await db.setInventoryPrice(productId, unitPrice)
      }
    }
    // Refresh inventory state from DB to reflect all changes
    const inv = await db.getInventory()
    setInvState(inv)
  }, [])

  // ── ORDERS ─────────────────────────────────────────────
  const addOrder = useCallback(async (kioskId, date, items, notes) => {
    const order = await db.insertOrder({ kioskId, date, items, notes })
    setOrdersState(prev => [order, ...prev])
    return order
  }, [])

  const deleteOrder = useCallback(async (id) => {
    await db.removeOrder(id)
    setOrdersState(prev => prev.filter(o => o.id !== id))
  }, [])

  const updateOrderStatus = useCallback(async (id, status) => {
    await db.patchOrderStatus(id, status)
    setOrdersState(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }, [])

  const updateOrder = useCallback(async (id, items, notes, date) => {
    await db.updateOrder(id, { items, notes, date })
    setOrdersState(prev => prev.map(o => o.id === id ? { ...o, items, notes, ...(date && { date }) } : o))
  }, [])

  // ── DISTRIBUTIONS ──────────────────────────────────────
  const addDistribution = useCallback(async (orderId, kioskId, date, items, notes) => {
    // Lock in current prices from inventory state at time of distribution
    const currentInv = await db.getInventory()
    const itemsWithPrice = items.map(i => ({
      ...i,
      price: currentInv[i.productId]?.price ?? findDefaultPrice(i.productId),
    }))

    const dist = await db.insertDistribution({ orderId, kioskId, date, items: itemsWithPrice, notes })
    setDistState(prev => [dist, ...prev])

    // Deduct from inventory
    for (const { productId, qty } of items) {
      await db.changeInventoryQty(productId, -qty)
    }
    const inv = await db.getInventory()
    setInvState(inv)

    if (orderId) {
      await updateOrderStatus(orderId, 'distributed')
    }
    return dist
  }, [updateOrderStatus])

  const updateDistribution = useCallback(async (id, oldItems, newItems, notes) => {
    // Return old quantities to inventory before deducting new
    for (const { productId, qty } of oldItems) {
      await db.changeInventoryQty(productId, qty)
    }
    // Lock in current prices for new items
    const currentInv = await db.getInventory()
    const itemsWithPrice = newItems.map(i => ({
      ...i,
      price: currentInv[i.productId]?.price ?? findDefaultPrice(i.productId),
    }))
    await db.updateDistribution(id, { items: itemsWithPrice, notes })
    setDistState(prev => prev.map(d => d.id === id ? { ...d, items: itemsWithPrice, notes } : d))
    // Deduct new quantities
    for (const { productId, qty } of newItems) {
      await db.changeInventoryQty(productId, -qty)
    }
    const inv = await db.getInventory()
    setInvState(inv)
  }, [])

  const deleteDistribution = useCallback(async (id) => {
    await db.removeDistribution(id)
    setDistState(prev => prev.filter(d => d.id !== id))
  }, [])

  const updateDistributionStatus = useCallback(async (id, status) => {
    await db.patchDistributionStatus(id, status)
    setDistState(prev => prev.map(d => d.id === id ? { ...d, status } : d))
  }, [])

  // ── INVOICES ───────────────────────────────────────────
  const addInvoice = useCallback(async (invoice, distribution) => {
    const saved = await db.insertInvoice(invoice)
    setInvoicesState(prev => [saved, ...prev])
    await updateDistributionStatus(distribution.id, 'invoiced')
    if (distribution.orderId) {
      await updateOrderStatus(distribution.orderId, 'invoiced')
    }
    return saved
  }, [updateDistributionStatus, updateOrderStatus])

  const markInvoiceSent = useCallback(async (id) => {
    await db.patchInvoiceStatus(id, 'sent')
    setInvoicesState(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'sent' } : inv))
  }, [])

  const deleteInvoice = useCallback(async (id) => {
    await db.removeInvoice(id)
    setInvoicesState(prev => prev.filter(inv => inv.id !== id))
  }, [])

  return {
    loading,
    loadError,
    inventory,
    orders,
    deliveries,
    distributions,
    invoices,
    updateInventoryPrice,
    adjustInventory,
    addDelivery,
    addOrder,
    updateOrder,
    deleteOrder,
    addDistribution,
    updateDistribution,
    deleteDistribution,
    addInvoice,
    markInvoiceSent,
    deleteInvoice,
  }
}

function findDefaultPrice(productId) {
  return PRODUCTS.find(p => p.id === productId)?.defaultPrice ?? 0
}
