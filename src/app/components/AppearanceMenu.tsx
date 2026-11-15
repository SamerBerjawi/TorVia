import { useEffect, useId, useRef, useState } from 'react'
import { AppearanceIcon } from '../icons'
import { AppearancePicker } from './AppearancePicker'
import { Icon } from './Icon'

/** Skin (Graphite / Paper / Signal) × mode (System / Light / Dark) picker. */
export function AppearanceMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu" ref={ref}>
      <button type="button" className={compact ? 'btn btn--icon-label' : 'btn'} aria-expanded={open} aria-controls={id} title="Choose style (Graphite, Paper, Signal) and light or dark mode" onClick={() => setOpen((o) => !o)}>
        <Icon icon={AppearanceIcon} />
        <span className={compact ? 'btn__label' : undefined}>Appearance</span>
      </button>
      {open && (
        <div className="menu__panel" id={id} role="dialog" aria-label="Appearance">
          <AppearancePicker />
        </div>
      )}
    </div>
  )
}
