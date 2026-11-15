import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from 'react'

const STEP = 24

/**
 * Drag handle between a main area and a details pane. `horizontal` = the pane is BELOW the main area (a horizontal line,
 * dragged up/down); `vertical` = the pane is BESIDE it on the right (a vertical line, dragged left/right).
 * Pointer drag, arrow keys (towards the main area grows the pane), Home/End (largest/smallest), double-click resets.
 * `container` bounds the pane; `clamp(size, containerPx)` applies the sizing rules (domain/pane.ts).
 */
export function Splitter({ size, onChange, container, clamp, defaultSize, orientation = 'horizontal', label = 'Resize details panel' }: {
  size: number
  onChange: (size: number) => void
  container: React.RefObject<HTMLElement | null>
  clamp: (size: number, containerPx: number) => number
  defaultSize: number
  orientation?: 'horizontal' | 'vertical'
  label?: string
}) {
  const vertical = orientation === 'vertical'
  const dragging = useRef(false)
  const bounds = useCallback(() => container.current?.getBoundingClientRect(), [container])
  const length = () => (vertical ? bounds()?.width : bounds()?.height) ?? 800
  const set = (s: number) => onChange(clamp(s, length()))

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.style.userSelect = 'none'
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const b = bounds()
    if (dragging.current && b) set(vertical ? b.right - e.clientX : b.bottom - e.clientY)
  }
  const end = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    document.body.style.userSelect = ''
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 4 : 1
    const grow = vertical ? 'ArrowLeft' : 'ArrowUp'
    const shrink = vertical ? 'ArrowRight' : 'ArrowDown'
    if (e.key === grow) set(size + STEP * big)
    else if (e.key === shrink) set(size - STEP * big)
    else if (e.key === 'Home') set(100000)
    else if (e.key === 'End') set(0)
    else return
    e.preventDefault()
  }
  const len = length()
  return (
    <div
      className={`splitter splitter--${orientation}`}
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={Math.round(size)}
      aria-valuemin={clamp(0, len)}
      aria-valuemax={clamp(100000, len)}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => onChange(defaultSize)}
      onKeyDown={onKeyDown}
    />
  )
}
