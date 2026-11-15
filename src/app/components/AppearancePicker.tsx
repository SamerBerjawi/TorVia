import { useId } from 'react'
import { MODES, MODE_LABEL, SKINS, SKIN_LABEL, setAppearance, type Mode, type Skin } from '@/ui/theme'
import { DarkIcon, LightIcon, SystemIcon } from '../icons'
import { useAppearance } from '../hooks'
import { Icon } from './Icon'

const MODE_ICON = { system: SystemIcon, light: LightIcon, dark: DarkIcon } satisfies Record<Mode, unknown>
const SKIN_BLURB: Record<Skin, string> = {
  graphite: 'Calm and dense. Sidebar, side details.',
  paper: 'Light, native-desktop feel. Toolbar, bottom details.',
  signal: 'Query-first console. Grouped rows, live sparklines.',
}

/** The one place a skin (Graphite / Paper / Signal) and a mode (System / Light / Dark) are chosen. */
export function AppearancePicker({ describe = false }: { describe?: boolean }) {
  const { skin, mode } = useAppearance()
  const id = useId()
  return (
    <>
      <fieldset className="menu__group">
        <legend>Style</legend>
        <div className="skinpick">
          {SKINS.map((s) => (
            <label key={s} className="skinpick__opt" data-skin-preview={s}>
              <input type="radio" name={`${id}-skin`} checked={skin === s} onChange={() => setAppearance({ skin: s })} />
              <span className="skinpick__swatch" aria-hidden="true"><i /><i /><i /></span>
              {SKIN_LABEL[s]}
              {describe && <span className="skinpick__blurb">{SKIN_BLURB[s]}</span>}
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
    </>
  )
}
