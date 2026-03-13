import { fmtDate } from '../../../lib/utils'
import { KIOSKS, PRODUCTS } from '../../../lib/constants'

function KitchenSection({ distribution }) {
  const kiosk = KIOSKS.find(k => k.id === distribution.kioskId)
  const kioskNum = kiosk ? kiosk.id.replace(/^K0?/, 'K') : ''
  const kioskName = kiosk ? kiosk.name : distribution.kioskId

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {kiosk ? `${kioskNum} · ${kioskName}` : kioskName}
        </div>
      </div>

      <table className="oi-table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '58%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '24%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Product</th>
            <th className="center">Cases</th>
            <th className="center">✓ Delivered</th>
          </tr>
        </thead>
        <tbody>
          {distribution.items.map((item, i) => {
            const product = PRODUCTS.find(p => p.id === item.productId)
            return (
              <tr key={i} style={{ height: 36 }}>
                <td style={{ fontWeight: 500 }}>{product?.invName ?? item.productId}</td>
                <td className="center" style={{ fontWeight: 700, fontSize: 15 }}>{item.qty}</td>
                <td className="center">
                  <div style={{
                    width: 22, height: 22,
                    border: '2px solid #ccc',
                    borderRadius: 4,
                    margin: '0 auto',
                  }} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {distribution.notes && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#f9f9f9', borderRadius: 6, fontSize: 12 }}>
          <strong>Notes:</strong> {distribution.notes}
        </div>
      )}
    </div>
  )
}

/**
 * Pass a single distribution or an array.
 * Multiple distributions share one signature block at the end.
 */
export function DistributionSheet({ distribution, distributions }) {
  const list = [...(distributions ?? [distribution])].sort((a, b) => a.kioskId.localeCompare(b.kioskId))
  const date = list[0]?.date
  const multi = list.length > 1

  return (
    <div className="official-invoice" style={{ fontSize: 13 }}>
      {/* Header — shown once */}
      <div className="oi-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="oi-logo-text">TOMNY</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Time Out Market New York</div>
        </div>
        <div className="oi-title-block">
          <div className="oi-title-word" style={{ fontSize: 22 }}>Distribution Sheet</div>
          <table className="oi-meta-table">
            <tbody>
              <tr>
                <td>Date</td>
                <td>{date ? fmtDate(date) : '—'}</td>
              </tr>
              {multi && (
                <tr>
                  <td>Kitchens</td>
                  <td>{list.length}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kitchen sections */}
      {list.map((dist, i) => (
        <div key={dist.id}>
          {i > 0 && (
            <div style={{ borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />
          )}
          {i === 0 && multi && (
            <div style={{ borderTop: '2px solid #e5e7eb', marginBottom: 16 }} />
          )}
          <KitchenSection distribution={dist} />
        </div>
      ))}

      {/* Single signature block at the end */}
      <div className="oi-bottom" style={{ marginTop: 36 }}>
        <div className="oi-sig">
          <div style={{ marginBottom: 40, borderBottom: '1px solid #ccc', width: 160 }} />
          <div>Staff Signature</div>
        </div>
        <div className="oi-sig">
          <div style={{ marginBottom: 40, borderBottom: '1px solid #ccc', width: 160 }} />
          <div>Confirmed By</div>
        </div>
      </div>
    </div>
  )
}
