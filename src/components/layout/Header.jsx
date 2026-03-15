import logo from '../../assets/logo.png'

export function Header({ moduleTitle = 'Beverage Management' }) {
  const now      = new Date()
  const hour     = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr  = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="header">
      <div className="header-brand">
        <img src={logo} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
        <div className="header-sep" />
        <div className="header-title">{moduleTitle}</div>
      </div>
      <div className="header-right">
        <span className="header-greeting">{greeting}</span>
        <span className="header-date">{dateStr}</span>
      </div>
    </div>
  )
}
