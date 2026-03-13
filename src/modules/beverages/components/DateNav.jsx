import { useRef } from 'react'
import { today } from '../../../lib/utils'

function shiftDate(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function fmtNavDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function DateNav({ date, onChange }) {
  const todayStr  = today()
  const isToday   = date === todayStr
  const pickerRef = useRef(null)

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          8,
      padding:      '10px 0',
      borderBottom: '1px solid var(--border)',
      marginBottom: 4,
    }}>
      <button className="btn btn-sm btn-ghost" onClick={() => onChange(shiftDate(date, -1))}>‹</button>

      {/* Clicking the date opens a native calendar picker */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-sm btn-ghost"
          style={{ fontWeight: 600, fontSize: 14, minWidth: 160 }}
          onClick={() => pickerRef.current?.showPicker()}
          title="Pick a date"
        >
          {fmtNavDate(date)}
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={date}
          max={todayStr}
          onChange={e => e.target.value && onChange(e.target.value)}
          style={{
            position: 'absolute',
            opacity:  0,
            width:    1,
            height:   1,
            top:      '100%',
            left:     '50%',
            pointerEvents: 'none',
          }}
        />
      </div>

      <button
        className="btn btn-sm btn-ghost"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={isToday}
      >›</button>
      {!isToday && (
        <button className="btn btn-sm btn-secondary" onClick={() => onChange(todayStr)}>
          Today
        </button>
      )}
    </div>
  )
}
