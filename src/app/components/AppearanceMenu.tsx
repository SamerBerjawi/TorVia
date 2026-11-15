import { useEffect, useId, useRef, useState } from 'react'
import { MODES, MODE_LABEL, SKINS, SKIN_LABEL, setAppearance, type Mode } from '@/ui/theme'
import { AppearanceIcon, DarkIcon, LightIcon, SystemIcon } from '../icons'
import { useAppearance } from '../hooks'
import { Icon } from './Icon'

const MODE_ICON = { system: SystemIcon, light: LightIcon, dark: DarkIcon } satisfies Record<Mode, unknown>

/** Skin (Graphite / Paper / Signal) × mode (System / Light / Dark) picker. */
export function AppearanceMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const { skin, mode } = useAppearance()
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
      <button type="button" className={compact ? 'iconbtn' : 'btn'} aria-expanded={open} aria-controls={id} aria-label={compact ? 'Appearance' : undefined} onClick={() => setOpen((o) => !o)}>
        <Icon icon={AppearanceIcon} />
        {!compact && 'Appearance'}
      </button>
      {open && (
        <div className="menu__panel" id={id} role="dialog" aria-label="Appearance">
          <fieldset className="menu__group">
            <legend>Style</legend>
            <div className="skinpick">
              {SKINS.map((s) => (
                <label key={s} className="skinpick__opt" data-skin-preview={s}>
                  <input type="radio" name={`${id}-skin`} checked={skin === s} onChange={() => setAppearance({ skin: s })} />
                  <span className="skinpick__swatch" aria-hidden="true"><i /><i /><i /></span>
                  {SKIN_LABEL[s]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="menu__group">
            <legend>Mode</legend>
            <div className="segmented">
              {MODES.map((m) => (
                <label key={m} className="segmented__opt">
                  <input type="radio" name={`${id}-mode`} checked={mode === m} onChange={() => setAppearance({ mode: m })} />
                  <Icon icon={MODE_ICON[m]} size={14} />
                  {MODE_LABEL[m]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}
