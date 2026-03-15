import logo from '../../assets/logo.png'

export function Header({ moduleTitle = 'Beverage Management' }) {
  const now     = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="header">
      <div className="header-brand">
        <img src={logo} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
        <div className="header-sep" />
        <div className="header-title">{moduleTitle}</div>
      </div>
      <div className="header-right">
        <span className="header-date">{dateStr}</span>
      </div>
    </div>
  )
}
