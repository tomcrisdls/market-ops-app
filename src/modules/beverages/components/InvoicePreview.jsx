import { fmtDate, fmtMoney } from '../../../lib/utils'
import { KIOSKS } from '../../../lib/constants'
import logoFull from '../../../assets/logo-full.png'

/**
 * Renders the printable official invoice.
 * Matches the layout from the prototype's buildOfficialInvoice function.
 */
export function InvoicePreview({ invoice }) {
  const kiosk = KIOSKS.find(k => k.id === invoice.kioskId)
  const kioskName = kiosk ? (kiosk.fullName ?? kiosk.name) : invoice.kioskId

  return (
    <div className="official-invoice">
      {/* Header */}
      <div className="oi-header">
        <div>
          <img src={logoFull} alt="Time Out Market New York" style={{ height: 80, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="oi-title-block">
          <div className="oi-title-word">Invoice</div>
          <table className="oi-meta-table">
            <tbody>
              <tr>
                <td>Invoice #</td>
                <td>{invoice.invoiceCode}</td>
              </tr>
              <tr>
                <td>Date</td>
                <td>{fmtDate(invoice.date)}</td>
              </tr>
              <tr>
                <td>Period</td>
                <td>{invoice.phase}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill To */}
      <div className="oi-bill-to">
        BILL TO &nbsp;<span>{kioskName}</span>
      </div>

      <div className="oi-address">
        Time Out Market New York<br />
        55 Water St<br />
        New York, NY 10041
      </div>

      {/* Items table */}
      <table className="oi-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="center">Qty (Cases)</th>
            <th className="right">Unit Price</th>
            <th className="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i}>
              <td>{item.invName}</td>
              <td className="center">{item.qty}</td>
              <td className="right">{fmtMoney(item.price)}</td>
              <td className="right">{fmtMoney(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bottom: signature + totals */}
      <div className="oi-bottom">
        <div className="oi-sig">
          <div style={{ marginBottom: 40, color: '#ccc', borderBottom: '1px solid #ccc', width: 160 }} />
          <div>Authorized Signature</div>
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
              <tr className="t-divider">
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
