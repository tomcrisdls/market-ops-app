import { fmtDate, fmtMoney } from '../../../lib/utils'
import { KIOSKS } from '../../../lib/constants'
import logoCircular from '../../../assets/logo-circular.png'

export function InvoicePreview({ invoice }) {
  const kiosk = KIOSKS.find(k => k.id === invoice.kioskId)
  const kioskName = kiosk ? (kiosk.fullName ?? kiosk.name) : invoice.kioskId

  return (
    <div className="official-invoice">

      {/* ── Header ── */}
      <div className="oi-header">
        {/* Logo */}
        <div className="oi-logo-wrap">
          <img src={logoCircular} alt="Time Out Market New York" className="oi-logo-img" />
        </div>

        {/* Right side: INVOICE title + metadata */}
        <div className="oi-right">
          <div className="oi-title-word">INVOICE</div>
          <table className="oi-meta-table">
            <tbody>
              <tr>
                <td>Date:</td>
                <td>{fmtDate(invoice.date)}</td>
              </tr>
              <tr>
                <td>Invoice #:</td>
                <td>{invoice.invoiceCode}</td>
              </tr>
              <tr>
                <td>For:</td>
                <td>Beverage Delivery</td>
              </tr>
              <tr><td colSpan={2} style={{ padding: '4px 0' }} /></tr>
              <tr>
                <td>Bill To:</td>
                <td>{kioskName}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Address (below logo) ── */}
      <div className="oi-address">
        124 East 14th Street<br />
        New York, NY 10003<br />
        Phone: (917) 810-4855
      </div>

      {/* ── Items table ── */}
      <table className="oi-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="center">Cases</th>
            <th className="center">Price</th>
            <th className="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i}>
              <td>{item.invName}</td>
              <td className="center">{item.qty}</td>
              <td className="center">{fmtMoney(item.price)}</td>
              <td className="right">{fmtMoney(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Bottom: signature + totals ── */}
      <div className="oi-bottom">
        <div className="oi-sig">
          Authorized Signature:______________________
        </div>

        <div className="oi-totals">
          <table>
            <tbody>
              <tr>
                <td className="t-label">Subtotal</td>
                <td className="right">{fmtMoney(invoice.subtotal)}</td>
              </tr>
              {invoice.deposit > 0 && (
                <tr>
                  <td className="t-label">Bottle Deposit ($1.20/case)</td>
                  <td className="right">{fmtMoney(invoice.deposit)}</td>
                </tr>
              )}
              <tr>
                <td className="t-label">Tax (8.875%)</td>
                <td className="right">{fmtMoney(invoice.tax)}</td>
              </tr>
              <tr className="t-total">
                <td>Total Due</td>
                <td className="right">{fmtMoney(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
