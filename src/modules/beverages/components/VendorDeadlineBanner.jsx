import { VENDOR_INFO } from '../../../lib/constants'

function getDeadlines() {
  const now  = new Date()
  const dow  = now.getDay()
  const hour = now.getHours() + now.getMinutes() / 60

  return Object.entries(VENDOR_INFO)
    .filter(([, info]) => info.cutoffDays.includes(dow))
    .map(([vendor, info]) => {
      const passed = hour >= info.cutoffHour
      const urgent = !passed && (info.cutoffHour - hour) <= 2
      const h      = info.cutoffHour
      const label  = h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
      return { vendor, label, passed, urgent, note: info.deliveryNote }
    })
}

export function VendorDeadlineBanner() {
  const deadlines = getDeadlines()
  if (deadlines.length === 0) return null

  const allPassed = deadlines.every(d => d.passed)
  const hasUrgent = deadlines.some(d => d.urgent && !d.passed)

  const borderColor = allPassed ? 'var(--border)' : hasUrgent ? '#fecaca' : '#fde68a'
  const bgColor     = allPassed ? 'var(--surface)' : hasUrgent ? '#fef2f2' : '#fffbeb'
  const labelColor  = allPassed ? 'var(--sub)' : hasUrgent ? '#dc2626' : '#92400e'

  return (
    <div style={{
      background:   bgColor,
      borderBottom: `1px solid ${borderColor}`,
      padding:      '7px 28px',
      display:      'flex',
      alignItems:   'center',
      gap:          16,
      flexWrap:     'wrap',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        {allPassed ? 'Orders Closed' : hasUrgent ? '⚠ Order Deadlines Today' : 'Order Deadlines Today'}
      </span>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {deadlines.map(d => (
          <span key={d.vendor} style={{
            fontSize:       12,
            fontWeight:     d.urgent && !d.passed ? 700 : 500,
            color:          d.passed ? 'var(--sub)' : d.urgent ? '#dc2626' : '#92400e',
            textDecoration: d.passed ? 'line-through' : 'none',
          }}>
            <strong>{d.vendor}</strong> by {d.label}
            {d.passed ? ' ✓' : ''}
            <span style={{ fontSize: 11, color: 'var(--sub)', marginLeft: 4, fontWeight: 400 }}>
              ({d.note})
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
