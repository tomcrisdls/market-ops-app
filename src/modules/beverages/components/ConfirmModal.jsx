/**
 * ConfirmModal — replaces window.confirm() with an in-app dialog.
 *
 * Props:
 *   isOpen       boolean
 *   title        string
 *   message      string
 *   confirmLabel string   (default "Confirm")
 *   variant      'danger' | 'warning' | 'success' | 'primary'  (default 'danger')
 *   onConfirm    () => void
 *   onClose      () => void
 */

const VARIANT_STYLES = {
  danger:  { bg: 'var(--red)',    label: '#fff', border: '#ef4444', icon: '⚠', iconColor: '#ef4444' },
  warning: { bg: '#d97706',       label: '#fff', border: '#f59e0b', icon: '⚠', iconColor: '#f59e0b' },
  primary: { bg: 'var(--accent)', label: '#fff', border: 'var(--accent)', icon: 'ℹ', iconColor: 'var(--accent)' },
  success: { bg: '#16a34a',       label: '#fff', border: '#16a34a', icon: '✓', iconColor: '#16a34a' },
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) {
  if (!isOpen) return null

  const style = VARIANT_STYLES[variant] ?? VARIANT_STYLES.danger

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{
        maxWidth: 380,
        borderTop: `3px solid ${style.border}`,
        textAlign: 'center',
        padding: '28px 24px 20px',
      }}>

        {/* Icon */}
        <div style={{
          fontSize: 32,
          lineHeight: 1,
          color: style.iconColor,
          marginBottom: 12,
        }}>
          {style.icon}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: message ? 8 : 20,
        }}>
          {title}
        </div>

        {/* Message */}
        {message && (
          <p style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: 'var(--sub)',
            lineHeight: 1.55,
          }}>
            {message}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn"
            style={{ background: style.bg, color: style.label, border: 'none' }}
            onClick={handleConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
