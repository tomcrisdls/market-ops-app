import { PRODUCTS, TAX_RATE, DEPOSIT_PER_CASE } from './constants'

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8)
}

export function today() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${m}/${d}/${y}`
}

export function fmtMoney(n) {
  return '$' + parseFloat(n || 0).toFixed(2)
}

// Phase 1 = days 1–15, Phase 2 = days 16–end of month
export function getPhase(dateStr) {
  return parseInt(dateStr.split('-')[2], 10) <= 15 ? 'Phase 1' : 'Phase 2'
}

// Invoice code: e.g. KW020120261  →  kioskCode + MM + DD + YYYY
export function invCode(kioskCode, dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${kioskCode}${m}${d}${y}`
}

export function findKiosk(id, kiosks) {
  return kiosks.find(k => k.id === id || k.code === id) || null
}

export function findProduct(id) {
  return PRODUCTS.find(p => p.id === id) || null
}

// Calculate invoice totals from distribution items + current inventory prices
export function calcTotals(items, inventory) {
  let subtotal = 0
  let depositCount = 0

  items.forEach(({ productId, qty }) => {
    if (!qty || qty <= 0) return
    const product = findProduct(productId)
    const price = inventory[productId]?.price ?? product?.defaultPrice ?? 0
    subtotal += qty * price
    if (product?.hasDeposit) depositCount += qty
  })

  const deposit = depositCount * DEPOSIT_PER_CASE
  const tax = (subtotal + deposit) * TAX_RATE
  return { subtotal, deposit, tax, total: subtotal + deposit + tax }
}

// Format item list to readable string: "2 × Coke Bottle · 3 × San Bene Still"
export function fmtItemList(items) {
  return items
    .map(it => {
      const p = findProduct(it.productId)
      return `${it.qty} × ${p ? p.name : it.productId}`
    })
    .join(' · ')
}
