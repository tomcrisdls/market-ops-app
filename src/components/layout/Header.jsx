import logo from '../../assets/logo.png'

/**
 * App header — shows logo and current module name.
 * When Google Auth is added, the user avatar/name goes in .header-user.
 */
export function Header({ moduleTitle = 'Beverage Management' }) {
  return (
    <div className="header">
      <div className="header-brand">
        <img src={logo} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
        <div className="header-sep" />
        <div className="header-title">{moduleTitle}</div>
      </div>
      <div className="header-user">
        {/* Future: user avatar + name here */}
      </div>
    </div>
  )
}
