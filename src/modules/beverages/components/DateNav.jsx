import { useRef } from 'react'
import { today } from '../../../lib/utils'
import { Icon } from '../../../components/icons/Icons'

function shiftDate(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function fmtNavDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function DateNav({ date, onChange }) {
  const todayStr  = today()
  const isToday   = date === todayStr
  const pickerRef = useRef(null)

  return (
    <div className="date-nav">
      <button
        className="date-nav-arrow"
        onClick={() => onChange(shiftDate(date, -1))}
        title="Previous day"
      >
        <Icon name="chevron-left" size={16} />
      </button>

      <div style={{ position: 'relative' }}>
        <button
          className="date-nav-label"
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
        className="date-nav-arrow"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={isToday}
        title="Next day"
      >
        <Icon name="chevron-right" size={16} />
      </button>

      {!isToday && (
        <button className="date-nav-today" onClick={() => onChange(todayStr)}>
          Today
        </button>
      )}
    </div>
  )
}
