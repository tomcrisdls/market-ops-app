/**
 * Data layer — Supabase.
 * All functions are async and return plain JS objects/arrays
 * in the same shape the rest of the app expects.
 */

import { supabase } from './supabase'

// ── INVENTORY ──────────────────────────────────────────────
// Shape: { [productId]: { qty: number, price: number } }

export async function getInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('product_id, quantity, current_price')
  if (error) throw error
  const inv = {}
  data.forEach(row => {
    inv[row.product_id] = { qty: row.quantity, price: parseFloat(row.current_price) }
  })
  return inv
}

export async function setInventoryPrice(productId, price) {
  const { error } = await supabase
    .from('inventory')
    .update({ current_price: price })
    .eq('product_id', productId)
  if (error) throw error
}

export async function changeInventoryQty(productId, delta) {
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', productId)
    .single()
  if (error) throw error
  const newQty = Math.max(0, data.quantity + delta)
  const { error: e2 } = await supabase
    .from('inventory')
    .update({ quantity: newQty })
    .eq('product_id', productId)
  if (e2) throw e2
  return newQty
}

// ── ORDERS ────────────────────────────────────────────────

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => ({
    id:        row.id,
    kioskId:   row.kiosk_id,
    date:      row.date,
    status:    row.status,
    notes:     row.notes || '',
    items:     (row.order_items || []).map(i => ({ productId: i.product_id, qty: i.quantity })),
    createdAt: row.created_at,
  }))
}

export async function insertOrder({ kioskId, date, items, notes }) {
  const { data: order, error } = await supabase
    .from('orders')
    .insert({ kiosk_id: kioskId, date, notes: notes || null, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  if (items.length > 0) {
    const { error: e2 } = await supabase
      .from('order_items')
      .insert(items.map(i => ({ order_id: order.id, product_id: i.productId, quantity: i.qty })))
    if (e2) throw e2
  }
  return {
    id:        order.id,
    kioskId:   order.kiosk_id,
    date:      order.date,
    status:    order.status,
    notes:     order.notes || '',
    items,
    createdAt: order.created_at,
  }
}

export async function removeOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

export async function patchOrderStatus(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateOrder(id, { items, notes }) {
  const { error } = await supabase.from('orders').update({ notes: notes || null }).eq('id', id)
  if (error) throw error
  const { error: e2 } = await supabase.from('order_items').delete().eq('order_id', id)
  if (e2) throw e2
  if (items.length > 0) {
    const { error: e3 } = await supabase
      .from('order_items')
      .insert(items.map(i => ({ order_id: id, product_id: i.productId, quantity: i.qty })))
    if (e3) throw e3
  }
}

// ── DELIVERIES ────────────────────────────────────────────

export async function getDeliveries() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, delivery_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => ({
    id:        row.id,
    date:      row.date,
    vendor:    row.vendor,
    notes:     row.notes || '',
    items:     (row.delivery_items || []).map(i => ({ productId: i.product_id, qty: i.quantity })),
    createdAt: row.created_at,
  }))
}

export async function insertDelivery({ date, vendor, notes, items }) {
  const { data: delivery, error } = await supabase
    .from('deliveries')
    .insert({ date, vendor, notes: notes || null })
    .select()
    .single()
  if (error) throw error
  if (items.length > 0) {
    const { error: e2 } = await supabase
      .from('delivery_items')
      .insert(items.map(i => ({ delivery_id: delivery.id, product_id: i.productId, quantity: i.qty })))
    if (e2) throw e2
  }
  return {
    id:        delivery.id,
    date:      delivery.date,
    vendor:    delivery.vendor,
    notes:     delivery.notes || '',
    items,
    createdAt: delivery.created_at,
  }
}

// ── DISTRIBUTIONS ─────────────────────────────────────────

export async function getDistributions() {
  const { data, error } = await supabase
    .from('distributions')
    .select('*, distribution_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => ({
    id:        row.id,
    orderId:   row.order_id,
    kioskId:   row.kiosk_id,
    date:      row.date,
    status:    row.status,
    notes:     row.notes || '',
    items:     (row.distribution_items || []).map(i => ({
      productId: i.product_id,
      qty:       i.quantity,
      price:     parseFloat(i.unit_price),
    })),
    createdAt: row.created_at,
  }))
}

export async function insertDistribution({ orderId, kioskId, date, items, notes }) {
  const { data: dist, error } = await supabase
    .from('distributions')
    .insert({ order_id: orderId || null, kiosk_id: kioskId, date, notes: notes || null, status: 'pending-invoice' })
    .select()
    .single()
  if (error) throw error
  if (items.length > 0) {
    const { error: e2 } = await supabase
      .from('distribution_items')
      .insert(items.map(i => ({
        distribution_id: dist.id,
        product_id:      i.productId,
        quantity:        i.qty,
        unit_price:      i.price,
      })))
    if (e2) throw e2
  }
  return {
    id:        dist.id,
    orderId:   orderId || null,
    kioskId,
    date,
    status:    'pending-invoice',
    notes:     notes || '',
    items,
    createdAt: dist.created_at,
  }
}

export async function updateDistribution(id, { items, notes }) {
  const { error } = await supabase
    .from('distributions')
    .update({ notes: notes || null })
    .eq('id', id)
  if (error) throw error
  const { error: e2 } = await supabase.from('distribution_items').delete().eq('distribution_id', id)
  if (e2) throw e2
  if (items.length > 0) {
    const { error: e3 } = await supabase
      .from('distribution_items')
      .insert(items.map(i => ({
        distribution_id: id,
        product_id:      i.productId,
        quantity:        i.qty,
        unit_price:      i.price ?? 0,
      })))
    if (e3) throw e3
  }
}

export async function removeDistribution(id) {
  const { error } = await supabase.from('distributions').delete().eq('id', id)
  if (error) throw error
}

export async function patchDistributionStatus(id, status) {
  const { error } = await supabase.from('distributions').update({ status }).eq('id', id)
  if (error) throw error
}

// ── INVOICES ──────────────────────────────────────────────

export async function getInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => ({
    id:             row.id,
    distributionId: row.distribution_id,
    orderId:        null,
    kioskId:        row.kiosk_id,
    date:           row.date,
    invoiceCode:    row.invoice_code,
    phase:          row.phase,
    subtotal:       parseFloat(row.subtotal),
    deposit:        parseFloat(row.deposit),
    tax:            parseFloat(row.tax),
    total:          parseFloat(row.total),
    status:         row.status,
    items:          (row.invoice_items || []).map(i => ({
      productId:       i.product_id,
      name:            i.product_name,
      invName:         i.inv_name,
      qty:             i.quantity,
      price:           parseFloat(i.unit_price),
      amount:          parseFloat(i.amount),
      trackerCategory: i.tracker_category,
      hasDeposit:      i.has_deposit,
    })),
    createdAt: row.created_at,
  }))
}

export async function insertInvoice(invoice) {
  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({
      distribution_id: invoice.distributionId,
      kiosk_id:        invoice.kioskId,
      date:            invoice.date,
      invoice_code:    invoice.invoiceCode,
      phase:           invoice.phase,
      subtotal:        invoice.subtotal,
      deposit:         invoice.deposit,
      tax:             invoice.tax,
      total:           invoice.total,
      status:          'draft',
    })
    .select()
    .single()
  if (error) throw error
  if (invoice.items.length > 0) {
    const { error: e2 } = await supabase
      .from('invoice_items')
      .insert(invoice.items.map(i => ({
        invoice_id:       inv.id,
        product_id:       i.productId,
        product_name:     i.name,
        inv_name:         i.invName,
        quantity:         i.qty,
        unit_price:       i.price,
        amount:           i.amount,
        tracker_category: i.trackerCategory,
        has_deposit:      i.hasDeposit,
      })))
    if (e2) throw e2
  }
  return { ...invoice, id: inv.id, status: 'draft', createdAt: inv.created_at }
}

export async function patchInvoiceStatus(id, status) {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
  if (error) throw error
}

export async function removeInvoice(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
}
