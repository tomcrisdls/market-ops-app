import { useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { PRODUCTS, VENDORS } from '../../../lib/constants'
import { today, fmtMoney } from '../../../lib/utils'

const client = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true })

function ManualTab({ onSave, onClose }) {
  const [date,   setDate]   = useState(today())
  const [vendor, setVendor] = useState(VENDORS[0])
  const [qtys,   setQtys]   = useState(() => Object.fromEntries(PRODUCTS.map(p => [p.id, 0])))

  const setQty = (id, val) => setQtys(prev => ({ ...prev, [id]: Math.max(0, val) }))

  const handleSave = () => {
    const items = PRODUCTS
      .filter(p => (qtys[p.id] || 0) > 0)
      .map(p => ({ productId: p.id, qty: parseInt(qtys[p.id]) }))
    if (items.length === 0) { alert('Enter at least one item.'); return }
    onSave(date, vendor, items)
    onClose()
  }

  const selectedCount = PRODUCTS.filter(p => (qtys[p.id] || 0) > 0).length

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Delivery Date</label>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Vendor</label>
          <select className="form-select" value={vendor} onChange={e => setVendor(e.target.value)}>
            {VENDORS.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="card-title" style={{ margin: 0 }}>Cases Received</div>
        {selectedCount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} logged
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {PRODUCTS.map(p => {
          const qty    = qtys[p.id] || 0
          const active = qty > 0
          const fromThisVendor = p.vendor === vendor

          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${active ? '#3b82f6' : 'var(--border)'}`,
                background: active ? '#eff6ff' : 'var(--surface)',
                opacity: fromThisVendor ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: 12, marginTop: 2, color: 'var(--sub)' }}>{p.vendor}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setQty(p.id, qty - 1)} disabled={qty === 0}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 18, cursor: qty === 0 ? 'default' : 'pointer', color: qty === 0 ? 'var(--sub)' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: 16, color: active ? '#2563eb' : 'var(--sub)' }}>{qty}</span>
                <button onClick={() => setQty(p.id, qty + 1)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 18, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>
          Add to Inventory{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
      </div>
    </>
  )
}

function UploadTab({ onSave, onClose }) {
  const [date,    setDate]    = useState(today())
  const [vendor,  setVendor]  = useState(VENDORS[0])
  const [parsing, setParsing] = useState(false)
  const [rows,    setRows]    = useState(null) // [{ name, qty, unitPrice, productId }]
  const [error,   setError]   = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError(null)
    setParsing(true)
    setRows(null)

    try {
      const base64 = await fileToBase64(file)
      const mediaType = file.type === 'application/pdf' ? 'application/pdf' : file.type

      const productCatalog = PRODUCTS.map(p =>
        `- id="${p.id}" | name="${p.name}" | also known as "${p.invName}" | vendor="${p.vendor}"`
      ).join('\n')

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Extract product line items from this vendor invoice and match each to our product catalog.

Our products:
${productCatalog}

Return ONLY a JSON array with no other text:
[{"name": string, "qty": number, "unitPrice": number, "productId": string_or_empty}]

Rules:
- Only include actual product rows with quantities (skip freight fees, deposits, totals, tax lines)
- Set "productId" to the matching product id from our catalog if you can identify it, otherwise ""
- Match by meaning, not exact text — e.g. "WATER NATURAL ANTICA FONTE / SAN BENE 24/330 ML" = "sb-still"`,
            },
          ],
        }],
      })

      const text = response.content[0].text.trim()
      const jsonText = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const parsed = JSON.parse(jsonText)

      // AI already matched productIds; fall back to name similarity for any misses
      const matched = parsed.map(item => {
        if (item.productId && PRODUCTS.find(p => p.id === item.productId)) {
          return item
        }
        const nameLower = (item.name || '').toLowerCase()
        const fallback = PRODUCTS.find(p =>
          nameLower.includes(p.name.split(' ')[0].toLowerCase()) ||
          p.invName.toLowerCase().split(' ').some(w => nameLower.includes(w))
        )
        return { ...item, productId: fallback?.id ?? '' }
      })
      setRows(matched)
    } catch (err) {
      setError('Could not parse the invoice. Try again or use Manual Entry. (' + (err.message || String(err)) + ')')
    } finally {
      setParsing(false)
    }
  }

  const handleConfirm = () => {
    const items = rows
      .filter(r => r.productId && parseInt(r.qty) > 0)
      .map(r => ({ productId: r.productId, qty: parseInt(r.qty) }))
    if (items.length === 0) { alert('Match at least one item to a product.'); return }
    onSave(date, vendor, items)
    onClose()
  }

  return (
    <>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Delivery Date</label>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Vendor</label>
          <select className="form-select" value={vendor} onChange={e => setVendor(e.target.value)}>
            {VENDORS.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {!rows && !parsing && (
        <div className="form-group">
          <label className="form-label">Upload Invoice (PDF or image)</label>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="form-input"
            onChange={handleFile}
          />
        </div>
      )}

      {parsing && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--sub)', fontSize: 13 }}>
          Parsing invoice with AI...
        </div>
      )}

      {error && (
        <div className="alert alert-warn" style={{ marginBottom: 12 }}>{error}</div>
      )}

      {rows && (
        <>
          <div className="card-title" style={{ margin: '4px 0 12px' }}>Review Extracted Items</div>
          <table className="data-table" style={{ marginBottom: 8 }}>
            <thead>
              <tr>
                <th>Invoice Line</th>
                <th>Qty</th>
                <th>Match to Product</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const unmatched = !row.productId
                return (
                  <tr key={i} style={unmatched ? { background: '#fffbeb' } : undefined}>
                    <td style={{ fontSize: 12 }}>
                      {row.name}
                      {unmatched && (
                        <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                          ⚠ Not in catalog — match manually or skip
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="qty-input"
                        value={row.qty}
                        min="0"
                        onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, qty: e.target.value } : r))}
                      />
                    </td>
                    <td>
                      <select
                        className="form-select"
                        style={{ fontSize: 12, padding: '4px 6px', borderColor: unmatched ? '#fbbf24' : undefined }}
                        value={row.productId}
                        onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, productId: e.target.value } : r))}
                      >
                        <option value="">— Skip —</option>
                        {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: 'var(--sub)', marginBottom: 4 }}>
            Rows without a product match will be skipped.
          </div>
        </>
      )}

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        {rows ? (
          <button className="btn btn-primary" onClick={handleConfirm}>Confirm &amp; Add to Inventory</button>
        ) : (
          <button className="btn btn-ghost" onClick={() => setRows(null)} disabled={!parsing}>
            {parsing ? 'Parsing…' : 'Upload to parse'}
          </button>
        )}
      </div>
    </>
  )
}

export function ReceiveStockModal({ isOpen, onClose, inventory, onSave }) {
  const [tab, setTab] = useState('upload')

  if (!isOpen) return null

  const handleClose = () => {
    setTab('upload')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Receive Stock</div>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="filter-pills" style={{ marginBottom: 20 }}>
          <button className={`pill${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>
            Upload Invoice
          </button>
          <button className={`pill${tab === 'manual' ? ' active' : ''}`} onClick={() => setTab('manual')}>
            Manual Entry
          </button>
        </div>

        {tab === 'upload'
          ? <UploadTab onSave={onSave} onClose={handleClose} />
          : <ManualTab onSave={onSave} onClose={handleClose} />
        }
      </div>
    </div>
  )
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
