import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  subtitle?: string
  eyebrow?: string
  maxWidth?: number
  /** Hide the built-in close button (e.g. while work is in progress). */
  locked?: boolean
}

export function Modal({ open, onClose, children, title, subtitle, eyebrow, maxWidth = 560, locked = false }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !locked) onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose, locked])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={() => { if (!locked) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        {(eyebrow || title || subtitle) && (
          <div className="modal-head">
            <div>
              {eyebrow && <div className="chip-label">{eyebrow}</div>}
              {title && <h2>{title}</h2>}
              {subtitle && <p className="muted small">{subtitle}</p>}
            </div>
            {!locked && <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
